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

// Helper to generate RFP number
async function generateRFPNumber() {
    const year = new Date().getFullYear();
    
    // Get the highest number for this year
    const { data, error } = await supabase
        .from('rfps')
        .select('rfp_number')
        .like('rfp_number', `RFP-${year}-%`)
        .order('rfp_number', { ascending: false })
        .limit(1);
    
    let nextNum = 1;
    if (data && data.length > 0) {
        const lastNum = parseInt(data[0].rfp_number.split('-').pop());
        nextNum = lastNum + 1;
    }
    
    return `RFP-${year}-${String(nextNum).padStart(4, '0')}`;
}

// Helper to generate Bid number
async function generateBidNumber() {
    const year = new Date().getFullYear();
    
    // Get the highest number for this year
    const { data, error } = await supabase
        .from('bids')
        .select('bid_number')
        .like('bid_number', `BID-${year}-%`)
        .order('bid_number', { ascending: false })
        .limit(1);
    
    let nextNum = 1;
    if (data && data.length > 0) {
        const lastNum = parseInt(data[0].bid_number.split('-').pop());
        nextNum = lastNum + 1;
    }
    
    return `BID-${year}-${String(nextNum).padStart(4, '0')}`;
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
        // Handle different endpoints
        const path = req.url.split('?')[0];
        const isRFPEndpoint = path === '/api/rfps';
        const isBidEndpoint = path === '/api/rfps/bids' || path.includes('/bids');

        if (isBidEndpoint) {
            // Handle Bids/Proposals
            switch (req.method) {
                case 'GET':
                    // Get bids
                    let bidQuery = supabase
                        .from('bids')
                        .select(`
                            *,
                            rfp:rfps!rfp_id(
                                rfp_number,
                                title,
                                description,
                                due_date,
                                status
                            ),
                            bidder:user_profiles!bidder_id(
                                full_name,
                                email,
                                company_name
                            )
                        `)
                        .order('created_at', { ascending: false });

                    // Filter based on role
                    if (userRole === 'subcontractor') {
                        // Subcontractors see only their bids
                        bidQuery = bidQuery.eq('bidder_id', userId);
                    } else if (userRole === 'client') {
                        // Clients see bids for their RFPs
                        const { data: clientRFPs } = await supabase
                            .from('rfps')
                            .select('id')
                            .eq('client_id', user.profile.client_id);
                        
                        if (clientRFPs) {
                            const rfpIds = clientRFPs.map(r => r.id);
                            bidQuery = bidQuery.in('rfp_id', rfpIds);
                        }
                    }
                    // Admins see all bids

                    // Apply filters
                    if (req.query.rfp_id) {
                        bidQuery = bidQuery.eq('rfp_id', req.query.rfp_id);
                    }
                    if (req.query.status) {
                        bidQuery = bidQuery.eq('status', req.query.status);
                    }

                    const { data: bids, error: bidError } = await bidQuery;

                    if (bidError) throw bidError;

                    res.json({ 
                        success: true, 
                        data: bids,
                        count: bids.length 
                    });
                    break;

                case 'POST':
                    // Submit a bid
                    if (userRole !== 'subcontractor' && userRole !== 'admin') {
                        return res.status(403).json({ 
                            error: 'Only subcontractors can submit bids' 
                        });
                    }

                    const bidNumber = await generateBidNumber();
                    
                    const newBid = {
                        bid_number: bidNumber,
                        rfp_id: req.body.rfp_id,
                        bidder_id: userId,
                        company_name: user.profile.company_name || req.body.company_name,
                        total_amount: req.body.total_amount,
                        cost_breakdown: req.body.cost_breakdown || {},
                        executive_summary: req.body.executive_summary,
                        technical_approach: req.body.technical_approach,
                        timeline: req.body.timeline || [],
                        team_members: req.body.team_members || [],
                        status: req.body.submit ? 'submitted' : 'draft',
                        submitted_at: req.body.submit ? new Date().toISOString() : null,
                        documents: req.body.documents || []
                    };

                    const { data: createdBid, error: createBidError } = await supabase
                        .from('bids')
                        .insert(newBid)
                        .select()
                        .single();

                    if (createBidError) throw createBidError;

                    // Send notification to RFP creator
                    if (req.body.submit) {
                        const { data: rfp } = await supabase
                            .from('rfps')
                            .select('created_by, title')
                            .eq('id', req.body.rfp_id)
                            .single();

                        if (rfp) {
                            await supabase
                                .from('notifications')
                                .insert({
                                    user_id: rfp.created_by,
                                    type: 'rfp',
                                    title: 'New Bid Received',
                                    message: `New bid received for RFP: ${rfp.title}`,
                                    data: { rfp_id: req.body.rfp_id, bid_id: createdBid.id },
                                    action_url: `/rfps/${req.body.rfp_id}/bids/${createdBid.id}`
                                });
                        }
                    }

                    res.json({ 
                        success: true, 
                        data: createdBid,
                        message: req.body.submit ? 'Bid submitted successfully' : 'Bid saved as draft'
                    });
                    break;

                case 'PUT':
                    // Update bid
                    const bidId = req.query.id || req.body.id;
                    
                    if (!bidId) {
                        return res.status(400).json({ error: 'Bid ID is required' });
                    }

                    // Check permissions
                    const { data: existingBid } = await supabase
                        .from('bids')
                        .select('*')
                        .eq('id', bidId)
                        .single();

                    if (!existingBid) {
                        return res.status(404).json({ error: 'Bid not found' });
                    }

                    // Check if user can update this bid
                    const canUpdateBid = userRole === 'admin' || 
                                        existingBid.bidder_id === userId;

                    if (!canUpdateBid) {
                        return res.status(403).json({ 
                            error: 'You do not have permission to update this bid' 
                        });
                    }

                    // Can't update submitted bids (except admin can update status)
                    if (existingBid.status === 'submitted' && userRole !== 'admin') {
                        return res.status(403).json({ 
                            error: 'Cannot modify submitted bids' 
                        });
                    }

                    const bidUpdateData = {};
                    const allowedBidFields = [
                        'total_amount', 'cost_breakdown', 'executive_summary',
                        'technical_approach', 'timeline', 'team_members',
                        'documents'
                    ];

                    // Admin-only fields
                    if (userRole === 'admin') {
                        allowedBidFields.push('status', 'score', 'evaluation_notes');
                    }

                    allowedBidFields.forEach(field => {
                        if (req.body[field] !== undefined) {
                            bidUpdateData[field] = req.body[field];
                        }
                    });

                    // Handle submission
                    if (req.body.submit && existingBid.status === 'draft') {
                        bidUpdateData.status = 'submitted';
                        bidUpdateData.submitted_at = new Date().toISOString();
                    }

                    const { data: updatedBid, error: updateBidError } = await supabase
                        .from('bids')
                        .update(bidUpdateData)
                        .eq('id', bidId)
                        .select()
                        .single();

                    if (updateBidError) throw updateBidError;

                    res.json({ 
                        success: true, 
                        data: updatedBid,
                        message: 'Bid updated successfully' 
                    });
                    break;

                default:
                    res.status(405).json({ error: 'Method not allowed' });
            }
        } else {
            // Handle RFPs
            switch (req.method) {
                case 'GET':
                    // Get RFPs
                    let rfpQuery = supabase
                        .from('rfps')
                        .select(`
                            *,
                            client:clients!client_id(company_name),
                            location:locations!location_id(name, address, city, state),
                            bids:bids(count)
                        `)
                        .order('created_at', { ascending: false });

                    // Filter based on role and status
                    if (userRole === 'subcontractor') {
                        // Subcontractors see only open RFPs
                        rfpQuery = rfpQuery.eq('status', 'open');
                    } else if (userRole === 'client') {
                        // Clients see their own RFPs
                        const { data: clientUser } = await supabase
                            .from('client_users')
                            .select('client_id')
                            .eq('user_id', userId)
                            .single();
                        
                        if (clientUser) {
                            rfpQuery = rfpQuery.eq('client_id', clientUser.client_id);
                        }
                    }
                    // Admins see all RFPs

                    // Apply filters
                    if (req.query.status) {
                        rfpQuery = rfpQuery.eq('status', req.query.status);
                    }
                    if (req.query.location_id) {
                        rfpQuery = rfpQuery.eq('location_id', req.query.location_id);
                    }

                    const { data: rfps, error: rfpError } = await rfpQuery;

                    if (rfpError) throw rfpError;

                    res.json({ 
                        success: true, 
                        data: rfps,
                        count: rfps.length 
                    });
                    break;

                case 'POST':
                    // Create new RFP
                    if (userRole !== 'admin' && userRole !== 'client') {
                        return res.status(403).json({ 
                            error: 'Only admins and clients can create RFPs' 
                        });
                    }

                    const rfpNumber = await generateRFPNumber();
                    
                    const newRFP = {
                        rfp_number: rfpNumber,
                        client_id: req.body.client_id,
                        title: req.body.title,
                        description: req.body.description,
                        location_id: req.body.location_id,
                        location_name: req.body.location_name,
                        scope_of_work: req.body.scope_of_work,
                        requirements: req.body.requirements || [],
                        budget_min: req.body.budget_min,
                        budget_max: req.body.budget_max,
                        budget_visibility: req.body.budget_visibility || 'hidden',
                        due_date: req.body.due_date,
                        project_start_date: req.body.project_start_date,
                        project_end_date: req.body.project_end_date,
                        status: req.body.publish ? 'open' : 'draft',
                        evaluation_criteria: req.body.evaluation_criteria || {},
                        documents: req.body.documents || [],
                        created_by: userId
                    };

                    const { data: createdRFP, error: createRFPError } = await supabase
                        .from('rfps')
                        .insert(newRFP)
                        .select()
                        .single();

                    if (createRFPError) throw createRFPError;

                    // Send notifications to eligible subcontractors if published
                    if (req.body.publish) {
                        const { data: subcontractors } = await supabase
                            .from('user_profiles')
                            .select('id')
                            .eq('role', 'subcontractor')
                            .eq('is_active', true);

                        if (subcontractors && subcontractors.length > 0) {
                            const notifications = subcontractors.map(sub => ({
                                user_id: sub.id,
                                type: 'rfp',
                                title: 'New RFP Available',
                                message: `New RFP: ${newRFP.title}`,
                                data: { rfp_id: createdRFP.id },
                                action_url: `/rfps/${createdRFP.id}`
                            }));

                            await supabase
                                .from('notifications')
                                .insert(notifications);
                        }
                    }

                    res.json({ 
                        success: true, 
                        data: createdRFP,
                        message: req.body.publish ? 'RFP published successfully' : 'RFP saved as draft'
                    });
                    break;

                case 'PUT':
                    // Update RFP
                    const rfpId = req.query.id || req.body.id;
                    
                    if (!rfpId) {
                        return res.status(400).json({ error: 'RFP ID is required' });
                    }

                    // Check permissions
                    const { data: existingRFP } = await supabase
                        .from('rfps')
                        .select('*')
                        .eq('id', rfpId)
                        .single();

                    if (!existingRFP) {
                        return res.status(404).json({ error: 'RFP not found' });
                    }

                    // Check if user can update this RFP
                    const canUpdateRFP = userRole === 'admin' || 
                                        existingRFP.created_by === userId;

                    if (!canUpdateRFP) {
                        return res.status(403).json({ 
                            error: 'You do not have permission to update this RFP' 
                        });
                    }

                    const rfpUpdateData = {};
                    const allowedRFPFields = [
                        'title', 'description', 'scope_of_work', 'requirements',
                        'budget_min', 'budget_max', 'budget_visibility',
                        'due_date', 'project_start_date', 'project_end_date',
                        'status', 'evaluation_criteria', 'documents'
                    ];

                    // Admin-only fields
                    if (userRole === 'admin') {
                        allowedRFPFields.push('selected_bid_id', 'selection_notes');
                    }

                    allowedRFPFields.forEach(field => {
                        if (req.body[field] !== undefined) {
                            rfpUpdateData[field] = req.body[field];
                        }
                    });

                    const { data: updatedRFP, error: updateRFPError } = await supabase
                        .from('rfps')
                        .update(rfpUpdateData)
                        .eq('id', rfpId)
                        .select()
                        .single();

                    if (updateRFPError) throw updateRFPError;

                    // Send notifications if status changed to awarded
                    if (rfpUpdateData.status === 'awarded' && rfpUpdateData.selected_bid_id) {
                        const { data: selectedBid } = await supabase
                            .from('bids')
                            .select('bidder_id')
                            .eq('id', rfpUpdateData.selected_bid_id)
                            .single();

                        if (selectedBid) {
                            await supabase
                                .from('notifications')
                                .insert({
                                    user_id: selectedBid.bidder_id,
                                    type: 'rfp',
                                    title: 'Bid Awarded!',
                                    message: `Your bid for "${existingRFP.title}" has been selected!`,
                                    priority: 'high',
                                    data: { rfp_id: rfpId, bid_id: rfpUpdateData.selected_bid_id },
                                    action_url: `/rfps/${rfpId}`
                                });
                        }
                    }

                    res.json({ 
                        success: true, 
                        data: updatedRFP,
                        message: 'RFP updated successfully' 
                    });
                    break;

                case 'DELETE':
                    // Delete RFP (admin only)
                    if (userRole !== 'admin') {
                        return res.status(403).json({ 
                            error: 'Only admins can delete RFPs' 
                        });
                    }

                    const deleteId = req.query.id;
                    
                    if (!deleteId) {
                        return res.status(400).json({ error: 'RFP ID is required' });
                    }

                    const { error: deleteError } = await supabase
                        .from('rfps')
                        .delete()
                        .eq('id', deleteId);

                    if (deleteError) throw deleteError;

                    res.json({ 
                        success: true, 
                        message: 'RFP deleted successfully' 
                    });
                    break;

                default:
                    res.status(405).json({ error: 'Method not allowed' });
            }
        }
    } catch (error) {
        console.error('RFPs API error:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
};