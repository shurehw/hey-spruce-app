// Enhanced Notifications API with Priority Notifications
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Import notification handlers
const {
    sendAppointmentReminder,
    checkTechRunningLate,
    handleNegativeReview,
    handlePaymentFailed,
    sendContractRenewalReminder,
    updateWorkOrderStatus
} = require('./notification-handlers');

// Helper function to verify auth token
async function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { user: null, error: 'No valid auth token provided' };
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) throw error;
        
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

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Parse the endpoint path
    const path = req.url.split('?')[0];
    const endpoint = path.split('/').pop();

    // Handle cron endpoints (no auth required for system crons)
    if (endpoint === 'cron-appointments') {
        return handleAppointmentCron(req, res);
    }
    if (endpoint === 'cron-contracts') {
        return handleContractCron(req, res);
    }
    if (endpoint === 'cron-quotes') {
        return handleQuoteCron(req, res);
    }

    // Verify authentication for other endpoints
    const { user, error: authError } = await verifyToken(req.headers.authorization);
    
    if (authError && endpoint !== 'webhook') {
        return res.status(401).json({ error: authError });
    }

    const userId = user?.id;
    const userRole = user?.profile?.role;

    try {
        switch (endpoint) {
            case 'work-order-status':
                return handleWorkOrderStatusChange(req, res, userId);
            
            case 'tech-location':
                return handleTechLocation(req, res, userId);
            
            case 'review-submitted':
                return handleReviewSubmitted(req, res);
            
            case 'payment-status':
                return handlePaymentStatus(req, res);
            
            case 'send-custom':
                return handleCustomNotification(req, res, userRole);
            
            default:
                // Original notification endpoints
                return handleStandardNotifications(req, res, userId, userRole);
        }
    } catch (error) {
        console.error('Notifications API error:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
};

// ============================================
// CRON JOB HANDLERS
// ============================================

async function handleAppointmentCron(req, res) {
    try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

        // 24-hour reminders
        const { data: workOrders24hr } = await supabase
            .from('work_orders')
            .select(`
                *,
                clients!inner(*),
                assigned_to_profile:user_profiles!assigned_to(*)
            `)
            .eq('scheduled_date', tomorrow.toISOString().split('T')[0])
            .eq('status', 'assigned')
            .eq('reminder_24hr_sent', false);

        let count24hr = 0;
        for (const wo of workOrders24hr || []) {
            await sendAppointmentReminder(wo, '24_hour');
            await supabase
                .from('work_orders')
                .update({ reminder_24hr_sent: true })
                .eq('id', wo.id);
            count24hr++;
        }

        // 1-hour reminders
        const { data: workOrders1hr } = await supabase
            .from('work_orders')
            .select(`
                *,
                clients!inner(*),
                assigned_to_profile:user_profiles!assigned_to(*)
            `)
            .gte('scheduled_date', now.toISOString().split('T')[0])
            .lte('scheduled_date', now.toISOString().split('T')[0])
            .eq('status', 'assigned')
            .eq('reminder_1hr_sent', false);

        let count1hr = 0;
        for (const wo of workOrders1hr || []) {
            const scheduledTime = new Date(`${wo.scheduled_date} ${wo.scheduled_time}`);
            const timeDiff = scheduledTime - now;
            
            if (timeDiff > 0 && timeDiff <= 90 * 60 * 1000) { // Within 90 minutes
                await sendAppointmentReminder(wo, '1_hour');
                await supabase
                    .from('work_orders')
                    .update({ reminder_1hr_sent: true })
                    .eq('id', wo.id);
                count1hr++;
            }
        }

        res.json({ 
            success: true, 
            reminders_sent: {
                '24_hour': count24hr,
                '1_hour': count1hr
            }
        });
    } catch (error) {
        console.error('Appointment cron error:', error);
        res.status(500).json({ error: error.message });
    }
}

async function handleContractCron(req, res) {
    try {
        const now = new Date();
        const renewalCounts = {};

        // Check 90, 60, and 30 day renewals
        for (const days of [90, 60, 30]) {
            const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
            const columnName = `renewal_${days}_sent`;
            
            const { data: contracts } = await supabase
                .from('clients')
                .select('*')
                .eq('contract_end_date', targetDate.toISOString().split('T')[0])
                .eq('contract_status', 'active')
                .eq(columnName, false);

            renewalCounts[`${days}_day`] = 0;
            for (const contract of contracts || []) {
                await sendContractRenewalReminder(contract, days);
                await supabase
                    .from('clients')
                    .update({ [columnName]: true })
                    .eq('id', contract.id);
                renewalCounts[`${days}_day`]++;
            }
        }

        res.json({ 
            success: true, 
            renewals_sent: renewalCounts 
        });
    } catch (error) {
        console.error('Contract renewal cron error:', error);
        res.status(500).json({ error: error.message });
    }
}

async function handleQuoteCron(req, res) {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const { data: expiringQuotes } = await supabase
            .from('quotes')
            .select(`
                *,
                clients!inner(*)
            `)
            .eq('status', 'pending')
            .eq('expiry_date', tomorrow.toISOString().split('T')[0])
            .eq('expiry_warning_sent', false);

        let count = 0;
        for (const quote of expiringQuotes || []) {
            // Notify client
            await supabase.from('notifications').insert({
                user_id: quote.client_id,
                type: 'quote_expiring',
                title: '⏰ Quote Expiring Tomorrow',
                message: `Your quote for ${quote.service_description} ($${quote.total_amount}) expires tomorrow.`,
                data: {
                    quote_id: quote.id,
                    amount: quote.total_amount,
                    expiry_date: quote.expiry_date
                },
                priority: 'high',
                action_url: `/quotes/${quote.id}`
            });

            // Mark as sent
            await supabase
                .from('quotes')
                .update({ expiry_warning_sent: true })
                .eq('id', quote.id);
            count++;
        }

        res.json({ 
            success: true, 
            expiry_warnings_sent: count 
        });
    } catch (error) {
        console.error('Quote expiry cron error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// WORK ORDER STATUS CHANGE HANDLER
// ============================================

async function handleWorkOrderStatusChange(req, res, userId) {
    const { work_order_id, new_status } = req.body;

    if (!work_order_id || !new_status) {
        return res.status(400).json({ 
            error: 'work_order_id and new_status required' 
        });
    }

    try {
        await updateWorkOrderStatus(work_order_id, new_status, userId);
        res.json({ 
            success: true, 
            message: `Work order status updated to ${new_status}` 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// TECH LOCATION UPDATE HANDLER
// ============================================

async function handleTechLocation(req, res, userId) {
    const { work_order_id, latitude, longitude, previous_job_end } = req.body;

    try {
        // Store location
        await supabase.from('tech_locations').insert({
            tech_id: userId,
            work_order_id,
            latitude,
            longitude,
            timestamp: new Date().toISOString()
        });

        // Check if running late
        if (previous_job_end) {
            await checkTechRunningLate(
                work_order_id, 
                { latitude, longitude }, 
                new Date(previous_job_end)
            );
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// REVIEW SUBMITTED HANDLER
// ============================================

async function handleReviewSubmitted(req, res) {
    const { review } = req.body;

    if (!review) {
        return res.status(400).json({ error: 'Review data required' });
    }

    try {
        // Insert review
        const { data: newReview, error } = await supabase
            .from('reviews')
            .insert(review)
            .select()
            .single();

        if (error) throw error;

        // Check if negative
        if (review.rating <= 2) {
            await handleNegativeReview(newReview);
        }

        // Mark work order as reviewed
        if (review.work_order_id) {
            await supabase
                .from('work_orders')
                .update({ review_submitted: true })
                .eq('id', review.work_order_id);
        }

        res.json({ 
            success: true, 
            review_id: newReview.id 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// PAYMENT STATUS HANDLER
// ============================================

async function handlePaymentStatus(req, res) {
    const { payment } = req.body;

    if (!payment) {
        return res.status(400).json({ error: 'Payment data required' });
    }

    try {
        if (payment.status === 'failed') {
            await handlePaymentFailed(payment);
            
            // Record failure
            await supabase.from('payment_failures').insert({
                payment_id: payment.id,
                invoice_id: payment.invoice_id,
                client_id: payment.client_id,
                amount: payment.amount,
                failure_reason: payment.failure_reason,
                failure_code: payment.failure_code
            });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// CUSTOM NOTIFICATION HANDLER
// ============================================

async function handleCustomNotification(req, res, userRole) {
    if (userRole !== 'admin') {
        return res.status(403).json({ 
            error: 'Only admins can send custom notifications' 
        });
    }

    const { user_ids, title, message, type, priority, action_url } = req.body;

    if (!user_ids || !title || !message) {
        return res.status(400).json({ 
            error: 'user_ids, title, and message required' 
        });
    }

    try {
        const notifications = user_ids.map(user_id => ({
            user_id,
            type: type || 'system',
            title,
            message,
            priority: priority || 'normal',
            action_url
        }));

        const { data, error } = await supabase
            .from('notifications')
            .insert(notifications)
            .select();

        if (error) throw error;

        res.json({ 
            success: true, 
            notifications_sent: data.length 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// STANDARD NOTIFICATIONS (Original)
// ============================================

async function handleStandardNotifications(req, res, userId, userRole) {
    // Original notification handling code here
    // (GET, POST, PUT, DELETE methods from original file)
    
    try {
        switch (req.method) {
            case 'GET':
                // Get notifications for user
                let query = supabase
                    .from('notifications')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (userRole !== 'admin' || !req.query.user_id) {
                    query = query.eq('user_id', userId);
                } else if (req.query.user_id && userRole === 'admin') {
                    query = query.eq('user_id', req.query.user_id);
                }

                if (req.query.unread_only === 'true') {
                    query = query.eq('read', false);
                }

                const { data: notifications, error } = await query;
                if (error) throw error;

                res.json({ 
                    success: true, 
                    data: notifications 
                });
                break;

            case 'PUT':
                // Mark as read
                const notificationId = req.query.id || req.body.id;
                
                if (req.body.mark_all_read) {
                    await supabase
                        .from('notifications')
                        .update({ read: true, read_at: new Date().toISOString() })
                        .eq('user_id', userId)
                        .eq('read', false);

                    res.json({ 
                        success: true, 
                        message: 'All notifications marked as read' 
                    });
                } else if (notificationId) {
                    await supabase
                        .from('notifications')
                        .update({ read: true, read_at: new Date().toISOString() })
                        .eq('id', notificationId)
                        .eq('user_id', userId);

                    res.json({ 
                        success: true, 
                        message: 'Notification marked as read' 
                    });
                }
                break;

            default:
                res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        throw error;
    }
}