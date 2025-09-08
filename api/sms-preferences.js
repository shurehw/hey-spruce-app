module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Mock user data - in real app, get from authenticated user
    const userId = req.headers['user-id'] || 'user_123';
    
    // In-memory storage (would be database in production)
    if (!global.smsPreferences) {
        global.smsPreferences = {};
    }

    if (req.method === 'GET') {
        // Get user's SMS preferences
        const preferences = global.smsPreferences[userId] || {
            phone_number: '',
            enabled: true,
            notifications: {
                work_order_created: { enabled: true, type: 'notification' },
                work_order_assigned: { enabled: true, type: 'notification' },
                work_order_status_changed: { enabled: true, type: 'standard' },
                work_order_completed: { enabled: true, type: 'standard' },
                work_order_urgent: { enabled: true, type: 'urgent' },
                work_order_due_reminder: { enabled: true, type: 'reminder' },
                payment_received: { enabled: false, type: 'standard' },
                new_message: { enabled: false, type: 'standard' },
                system_maintenance: { enabled: true, type: 'notification' }
            },
            quiet_hours: {
                enabled: true,
                start: '22:00',
                end: '08:00'
            },
            daily_digest: {
                enabled: false,
                time: '09:00'
            }
        };

        return res.json({ success: true, data: preferences });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
        // Update user's SMS preferences
        const updates = req.body;
        
        if (!global.smsPreferences[userId]) {
            global.smsPreferences[userId] = {};
        }
        
        // Validate phone number if provided
        if (updates.phone_number) {
            const phoneRegex = /^\+[1-9]\d{1,14}$/;
            if (!phoneRegex.test(updates.phone_number)) {
                return res.status(400).json({
                    error: 'Invalid phone number format',
                    details: 'Phone number must include country code (e.g., +1234567890)'
                });
            }
        }
        
        // Merge updates with existing preferences
        global.smsPreferences[userId] = {
            ...global.smsPreferences[userId],
            ...updates,
            updated_at: new Date().toISOString()
        };
        
        console.log(`SMS preferences updated for user ${userId}:`, global.smsPreferences[userId]);
        
        return res.json({
            success: true,
            message: 'SMS preferences updated successfully',
            data: global.smsPreferences[userId]
        });
    }

    return res.status(405).json({ error: 'Method not allowed' });
};

// Helper function to get user's SMS preferences
module.exports.getUserSMSPreferences = (userId) => {
    if (!global.smsPreferences) {
        global.smsPreferences = {};
    }
    
    return global.smsPreferences[userId] || null;
};

// Helper function to check if user should receive SMS for event type
module.exports.shouldSendSMS = (userId, eventType) => {
    const preferences = module.exports.getUserSMSPreferences(userId);
    
    if (!preferences || !preferences.enabled || !preferences.phone_number) {
        return false;
    }
    
    const notification = preferences.notifications?.[eventType];
    if (!notification || !notification.enabled) {
        return false;
    }
    
    // Check quiet hours
    if (preferences.quiet_hours?.enabled) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        const startTime = preferences.quiet_hours.start;
        const endTime = preferences.quiet_hours.end;
        
        // Simple quiet hours check (doesn't handle midnight crossover perfectly)
        if (startTime > endTime) {
            // Quiet hours cross midnight
            if (currentTime >= startTime || currentTime <= endTime) {
                return false;
            }
        } else {
            // Normal quiet hours within same day
            if (currentTime >= startTime && currentTime <= endTime) {
                return false;
            }
        }
    }
    
    return {
        phone: preferences.phone_number,
        type: notification.type
    };
};