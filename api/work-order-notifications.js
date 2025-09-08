const smsPreferences = require('./sms-preferences');

// Import SMS sending function
async function sendSMS(phone, message, type = 'standard') {
    try {
        const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: phone,
                message: message,
                type: type
            })
        });
        
        return await response.json();
    } catch (error) {
        console.error('SMS sending error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { eventType, workOrder, users } = req.body;
    
    if (!eventType || !workOrder) {
        return res.status(400).json({
            error: 'Missing required fields',
            details: 'eventType and workOrder are required'
        });
    }

    const results = {
        sent: [],
        skipped: [],
        failed: []
    };

    // Define message templates
    const messageTemplates = {
        work_order_created: (wo) => `New work order ${wo.id} created: ${wo.title} at ${wo.location}. Due: ${wo.due_date}`,
        work_order_assigned: (wo) => `Work order ${wo.id} assigned to you: ${wo.title}. Due: ${wo.due_date}`,
        work_order_status_changed: (wo) => `Work order ${wo.id} status changed to ${wo.status}: ${wo.title}`,
        work_order_completed: (wo) => `Work order ${wo.id} completed: ${wo.title} at ${wo.location}`,
        work_order_urgent: (wo) => `URGENT: Work order ${wo.id} requires immediate attention: ${wo.title}`,
        work_order_due_reminder: (wo) => `Reminder: Work order ${wo.id} is due today: ${wo.title}`,
        payment_received: (wo) => `Payment received for work order ${wo.id}: ${wo.title}`,
        system_maintenance: (wo) => `System maintenance scheduled. Some features may be unavailable.`
    };

    const messageTemplate = messageTemplates[eventType];
    if (!messageTemplate) {
        return res.status(400).json({
            error: 'Invalid event type',
            details: `Event type '${eventType}' is not supported`
        });
    }

    // Generate the message
    const message = messageTemplate(workOrder);
    
    // Determine which users to notify
    let usersToNotify = users || [];
    
    // If no specific users provided, determine based on event type
    if (usersToNotify.length === 0) {
        switch (eventType) {
            case 'work_order_created':
                // Notify admins and property managers
                usersToNotify = ['admin_1', 'property_manager_1'];
                break;
            case 'work_order_assigned':
                // Notify assigned contractor
                usersToNotify = [workOrder.assigned_to];
                break;
            case 'work_order_completed':
                // Notify client and admin
                usersToNotify = [workOrder.client_id, 'admin_1'];
                break;
            case 'work_order_urgent':
                // Notify everyone involved
                usersToNotify = [workOrder.client_id, workOrder.assigned_to, 'admin_1'];
                break;
            default:
                // Notify relevant parties
                usersToNotify = [workOrder.client_id, workOrder.assigned_to];
        }
    }

    // Send SMS to each user based on their preferences
    for (const userId of usersToNotify) {
        try {
            const smsCheck = smsPreferences.shouldSendSMS(userId, eventType);
            
            if (!smsCheck) {
                results.skipped.push({
                    userId,
                    reason: 'SMS disabled or phone not configured'
                });
                continue;
            }

            const smsResult = await sendSMS(smsCheck.phone, message, smsCheck.type);
            
            if (smsResult.success) {
                results.sent.push({
                    userId,
                    phone: smsCheck.phone,
                    messageId: smsResult.messageId,
                    type: smsCheck.type
                });
                console.log(`SMS sent to user ${userId} for event ${eventType}`);
            } else {
                results.failed.push({
                    userId,
                    phone: smsCheck.phone,
                    error: smsResult.error
                });
                console.error(`Failed to send SMS to user ${userId}:`, smsResult.error);
            }
        } catch (error) {
            results.failed.push({
                userId,
                error: error.message
            });
            console.error(`Error processing SMS for user ${userId}:`, error);
        }
    }

    return res.json({
        success: true,
        eventType,
        workOrderId: workOrder.id,
        message,
        results: {
            total: usersToNotify.length,
            sent: results.sent.length,
            skipped: results.skipped.length,
            failed: results.failed.length
        },
        details: results
    });
};

// Export helper functions for use in other parts of the application
module.exports.triggerWorkOrderSMS = async (eventType, workOrder, users = []) => {
    try {
        const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/work-order-notifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                eventType,
                workOrder,
                users
            })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Error triggering work order SMS:', error);
        return { success: false, error: error.message };
    }
};