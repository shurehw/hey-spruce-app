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

    const userId = user.id;
    const userRole = user.profile?.role;

    try {
        switch (req.method) {
            case 'GET':
                // Get notifications for the user
                let query = supabase
                    .from('notifications')
                    .select('*')
                    .order('created_at', { ascending: false });

                // Users can only see their own notifications (unless admin)
                if (userRole !== 'admin' || !req.query.user_id) {
                    query = query.eq('user_id', userId);
                } else if (req.query.user_id && userRole === 'admin') {
                    query = query.eq('user_id', req.query.user_id);
                }

                // Apply filters
                if (req.query.unread_only === 'true') {
                    query = query.eq('read', false);
                }
                if (req.query.type) {
                    query = query.eq('type', req.query.type);
                }
                if (req.query.priority) {
                    query = query.eq('priority', req.query.priority);
                }

                // Limit results
                const limit = parseInt(req.query.limit) || 50;
                query = query.limit(limit);

                const { data: notifications, error: fetchError } = await query;

                if (fetchError) throw fetchError;

                // Get unread count
                const { count: unreadCount } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('read', false);

                res.json({ 
                    success: true, 
                    data: notifications,
                    unread_count: unreadCount || 0,
                    total_count: notifications.length 
                });
                break;

            case 'POST':
                // Create notification (admin only or system)
                if (userRole !== 'admin' && !req.headers['x-system-key']) {
                    return res.status(403).json({ 
                        error: 'Only admins can create notifications' 
                    });
                }

                // Validate required fields
                if (!req.body.user_id || !req.body.title || !req.body.message) {
                    return res.status(400).json({ 
                        error: 'user_id, title, and message are required' 
                    });
                }

                const newNotification = {
                    user_id: req.body.user_id,
                    type: req.body.type || 'system',
                    title: req.body.title,
                    message: req.body.message,
                    data: req.body.data || {},
                    priority: req.body.priority || 'normal',
                    action_url: req.body.action_url
                };

                // Support bulk notifications
                const notifications = req.body.bulk ? req.body.notifications : [newNotification];

                const { data: created, error: createError } = await supabase
                    .from('notifications')
                    .insert(notifications)
                    .select();

                if (createError) throw createError;

                // Check notification preferences and send external notifications if needed
                for (const notif of notifications) {
                    const { data: prefs } = await supabase
                        .from('notification_preferences')
                        .select('*')
                        .eq('user_id', notif.user_id);

                    if (prefs && prefs.length > 0) {
                        // Check if this notification type is enabled for external channels
                        for (const pref of prefs) {
                            const categories = pref.categories || {};
                            const typeEnabled = categories[notif.type] !== false;

                            if (pref.enabled && typeEnabled) {
                                // Here you would integrate with external notification services
                                // For example: email, SMS, push notifications
                                if (pref.channel === 'email') {
                                    // TODO: Send email notification
                                    console.log(`Would send email to user ${notif.user_id}`);
                                }
                                if (pref.channel === 'push' && notif.priority === 'urgent') {
                                    // TODO: Send push notification
                                    console.log(`Would send push notification to user ${notif.user_id}`);
                                }
                            }
                        }
                    }
                }

                res.json({ 
                    success: true, 
                    data: created,
                    message: `${created.length} notification(s) created successfully` 
                });
                break;

            case 'PUT':
                // Mark notification as read/unread
                const notificationId = req.query.id || req.body.id;
                
                // Support marking multiple as read
                if (req.body.mark_all_read) {
                    const { error: updateAllError } = await supabase
                        .from('notifications')
                        .update({ read: true, read_at: new Date().toISOString() })
                        .eq('user_id', userId)
                        .eq('read', false);

                    if (updateAllError) throw updateAllError;

                    res.json({ 
                        success: true, 
                        message: 'All notifications marked as read' 
                    });
                } else if (req.body.ids && Array.isArray(req.body.ids)) {
                    // Mark specific notifications as read
                    const { error: updateMultipleError } = await supabase
                        .from('notifications')
                        .update({ read: true, read_at: new Date().toISOString() })
                        .eq('user_id', userId)
                        .in('id', req.body.ids);

                    if (updateMultipleError) throw updateMultipleError;

                    res.json({ 
                        success: true, 
                        message: `${req.body.ids.length} notifications marked as read` 
                    });
                } else if (notificationId) {
                    // Mark single notification
                    const read = req.body.read !== undefined ? req.body.read : true;
                    
                    const updateData = {
                        read: read,
                        read_at: read ? new Date().toISOString() : null
                    };

                    const { data: updated, error: updateError } = await supabase
                        .from('notifications')
                        .update(updateData)
                        .eq('id', notificationId)
                        .eq('user_id', userId) // Ensure user owns this notification
                        .select()
                        .single();

                    if (updateError) {
                        if (updateError.code === 'PGRST116') {
                            return res.status(404).json({ error: 'Notification not found' });
                        }
                        throw updateError;
                    }

                    res.json({ 
                        success: true, 
                        data: updated,
                        message: `Notification marked as ${read ? 'read' : 'unread'}` 
                    });
                } else {
                    return res.status(400).json({ 
                        error: 'Notification ID or bulk operation required' 
                    });
                }
                break;

            case 'DELETE':
                // Delete notification(s)
                if (req.body.delete_all_read) {
                    // Delete all read notifications for user
                    const { error: deleteAllError } = await supabase
                        .from('notifications')
                        .delete()
                        .eq('user_id', userId)
                        .eq('read', true);

                    if (deleteAllError) throw deleteAllError;

                    res.json({ 
                        success: true, 
                        message: 'All read notifications deleted' 
                    });
                } else if (req.body.ids && Array.isArray(req.body.ids)) {
                    // Delete specific notifications
                    const { error: deleteMultipleError } = await supabase
                        .from('notifications')
                        .delete()
                        .eq('user_id', userId)
                        .in('id', req.body.ids);

                    if (deleteMultipleError) throw deleteMultipleError;

                    res.json({ 
                        success: true, 
                        message: `${req.body.ids.length} notifications deleted` 
                    });
                } else {
                    const deleteId = req.query.id;
                    
                    if (!deleteId) {
                        return res.status(400).json({ 
                            error: 'Notification ID required for deletion' 
                        });
                    }

                    const { error: deleteError } = await supabase
                        .from('notifications')
                        .delete()
                        .eq('id', deleteId)
                        .eq('user_id', userId); // Ensure user owns this notification

                    if (deleteError) throw deleteError;

                    res.json({ 
                        success: true, 
                        message: 'Notification deleted successfully' 
                    });
                }
                break;

            default:
                res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Notifications API error:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
};

// Helper function to send notification (can be called from other APIs)
async function sendNotification(userId, type, title, message, data = {}, priority = 'normal', actionUrl = null) {
    try {
        const notification = {
            user_id: userId,
            type: type,
            title: title,
            message: message,
            data: data,
            priority: priority,
            action_url: actionUrl
        };

        const { data: created, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) throw error;

        // Check if urgent and send push notification
        if (priority === 'urgent') {
            // TODO: Integrate with push notification service
            console.log(`Urgent notification sent to user ${userId}: ${title}`);
        }

        return { success: true, data: created };
    } catch (error) {
        console.error('Error sending notification:', error);
        return { success: false, error: error.message };
    }
}

// Export helper function for use in other modules
module.exports.sendNotification = sendNotification;