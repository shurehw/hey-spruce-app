const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to verify auth token
async function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { user: null, error: 'No valid auth token provided' };
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) throw error;
        
        // Get user profile with role
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        return { user: { ...user, profile }, error: null };
    } catch (error) {
        return { user: null, error: error.message };
    }
}

// Helper to generate work order number
async function generateWorkOrderNumber() {
    const yearMonth = new Date().toISOString().slice(0, 7);
    
    // Get the highest number for this month
    const { data, error } = await supabase
        .from('work_orders')
        .select('order_number')
        .like('order_number', `WO-${yearMonth}-%`)
        .order('order_number', { ascending: false })
        .limit(1);
    
    let nextNum = 1;
    if (data && data.length > 0) {
        const lastNum = parseInt(data[0].order_number.split('-').pop());
        nextNum = lastNum + 1;
    }
    
    return `WO-${yearMonth}-${String(nextNum).padStart(4, '0')}`;
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verify authentication
    const { user, error: authError } = await verifyToken(req.headers.authorization);
    
    if (authError) {
        return res.status(401).json({ error: authError });
    }

    const userRole = user.profile?.role;
    const userId = user.id;

    try {
        switch (req.method) {
            case 'GET':
                // Get work orders based on user role
                let query = supabase
                    .from('work_orders')
                    .select(`
                        *,
                        clients!client_id(company_name, contact_name),
                        locations!location_id(name, address, city, state),
                        assigned_user:user_profiles!assigned_to(full_name, email)
                    `)
                    .order('created_at', { ascending: false });

                // Filter based on role
                if (userRole === 'client') {
                    // Clients see only their work orders
                    const { data: clientUser } = await supabase
                        .from('client_users')
                        .select('client_id')
                        .eq('user_id', userId)
                        .single();
                    
                    if (clientUser) {
                        query = query.eq('client_id', clientUser.client_id);
                    }
                } else if (userRole === 'subcontractor' || userRole === 'field_tech') {
                    // Subcontractors see only assigned work orders
                    query = query.eq('assigned_to', userId);
                }
                // Admins see all work orders (no filter needed)

                // Apply additional filters from query params
                if (req.query.status) {
                    query = query.eq('status', req.query.status);
                }
                if (req.query.priority) {
                    query = query.eq('priority', req.query.priority);
                }
                if (req.query.assigned_to) {
                    query = query.eq('assigned_to', req.query.assigned_to);
                }
                if (req.query.from_date) {
                    query = query.gte('scheduled_date', req.query.from_date);
                }
                if (req.query.to_date) {
                    query = query.lte('scheduled_date', req.query.to_date);
                }

                const { data: workOrders, error: fetchError } = await query;

                if (fetchError) throw fetchError;

                res.json({ 
                    success: true, 
                    data: workOrders,
                    count: workOrders.length 
                });
                break;

            case 'POST':
                // Create new work order
                if (userRole !== 'admin' && userRole !== 'client') {
                    return res.status(403).json({ 
                        error: 'Only admins and clients can create work orders' 
                    });
                }

                const orderNumber = await generateWorkOrderNumber();
                
                const newWorkOrder = {
                    order_number: orderNumber,
                    client_id: req.body.client_id,
                    location_id: req.body.location_id,
                    title: req.body.title,
                    description: req.body.description,
                    category: req.body.category,
                    service_type: req.body.service_type,
                    priority: req.body.priority || 'standard',
                    status: 'pending',
                    scheduled_date: req.body.scheduled_date,
                    scheduled_time: req.body.scheduled_time,
                    estimated_duration: req.body.estimated_duration,
                    checklist: req.body.checklist || [],
                    billable: req.body.billable !== false,
                    estimated_cost: req.body.estimated_cost,
                    created_by: userId,
                    photos: req.body.photos || [],
                    documents: req.body.documents || []
                };

                const { data: created, error: createError } = await supabase
                    .from('work_orders')
                    .insert(newWorkOrder)
                    .select()
                    .single();

                if (createError) throw createError;

                // Create notification for assigned user if applicable
                if (req.body.assigned_to) {
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: req.body.assigned_to,
                            type: 'work_order',
                            title: 'New Work Order Assigned',
                            message: `You have been assigned work order ${orderNumber}`,
                            data: { work_order_id: created.id },
                            action_url: `/work-orders/${created.id}`
                        });
                }

                res.json({ 
                    success: true, 
                    data: created,
                    message: 'Work order created successfully' 
                });
                break;

            case 'PUT':
                // Update work order
                const workOrderId = req.query.id || req.body.id;
                
                if (!workOrderId) {
                    return res.status(400).json({ error: 'Work order ID is required' });
                }

                // Check permissions
                const { data: existingOrder } = await supabase
                    .from('work_orders')
                    .select('*')
                    .eq('id', workOrderId)
                    .single();

                if (!existingOrder) {
                    return res.status(404).json({ error: 'Work order not found' });
                }

                // Check if user can update this work order
                const canUpdate = userRole === 'admin' || 
                                 existingOrder.assigned_to === userId ||
                                 existingOrder.created_by === userId;

                if (!canUpdate) {
                    return res.status(403).json({ 
                        error: 'You do not have permission to update this work order' 
                    });
                }

                // Prepare update data
                const updateData = {};
                const allowedFields = [
                    'title', 'description', 'category', 'service_type', 
                    'priority', 'status', 'assigned_to', 'scheduled_date',
                    'scheduled_time', 'estimated_duration', 'checklist',
                    'work_performed', 'materials_used', 'completion_notes',
                    'actual_cost', 'photos', 'documents'
                ];

                allowedFields.forEach(field => {
                    if (req.body[field] !== undefined) {
                        updateData[field] = req.body[field];
                    }
                });

                // Handle status changes
                if (updateData.status === 'in_progress' && !existingOrder.actual_start_time) {
                    updateData.actual_start_time = new Date().toISOString();
                }
                
                if (updateData.status === 'completed') {
                    updateData.completed_by = userId;
                    updateData.completed_at = new Date().toISOString();
                    if (!existingOrder.actual_end_time) {
                        updateData.actual_end_time = new Date().toISOString();
                    }
                }

                if (updateData.assigned_to && updateData.assigned_to !== existingOrder.assigned_to) {
                    updateData.assigned_at = new Date().toISOString();
                }

                const { data: updated, error: updateError } = await supabase
                    .from('work_orders')
                    .update(updateData)
                    .eq('id', workOrderId)
                    .select()
                    .single();

                if (updateError) throw updateError;

                // Send notification if assignment changed
                if (updateData.assigned_to && updateData.assigned_to !== existingOrder.assigned_to) {
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: updateData.assigned_to,
                            type: 'work_order',
                            title: 'Work Order Assigned',
                            message: `You have been assigned work order ${existingOrder.order_number}`,
                            data: { work_order_id: workOrderId },
                            action_url: `/work-orders/${workOrderId}`
                        });
                }

                res.json({ 
                    success: true, 
                    data: updated,
                    message: 'Work order updated successfully' 
                });
                break;

            case 'DELETE':
                // Delete work order (admin only)
                if (userRole !== 'admin') {
                    return res.status(403).json({ 
                        error: 'Only admins can delete work orders' 
                    });
                }

                const deleteId = req.query.id;
                
                if (!deleteId) {
                    return res.status(400).json({ error: 'Work order ID is required' });
                }

                const { error: deleteError } = await supabase
                    .from('work_orders')
                    .delete()
                    .eq('id', deleteId);

                if (deleteError) throw deleteError;

                res.json({ 
                    success: true, 
                    message: 'Work order deleted successfully' 
                });
                break;

            default:
                res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Work orders API error:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
};