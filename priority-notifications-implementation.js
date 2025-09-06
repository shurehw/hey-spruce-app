// Priority Notification Implementations for Hey Spruce
// These are the most critical notifications for business operations

const { createClient } = require('@supabase/supabase-js');
const nodeCron = require('node-cron');

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================
// 1. APPOINTMENT REMINDERS (24hr & 1hr before)
// ============================================

// Schedule cron job to run every hour
const appointmentReminderJob = nodeCron.schedule('0 * * * *', async () => {
    try {
        const now = new Date();
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

        // Get work orders scheduled for 24 hours from now
        const { data: workOrders24hr } = await supabase
            .from('work_orders')
            .select(`
                *,
                clients!inner(email, phone, contact_name),
                assigned_to_profile:user_profiles!assigned_to(full_name, phone)
            `)
            .gte('scheduled_date', in24Hours.toISOString().split('T')[0])
            .lte('scheduled_date', in24Hours.toISOString().split('T')[0])
            .eq('status', 'assigned')
            .eq('reminder_24hr_sent', false);

        // Send 24-hour reminders
        for (const wo of workOrders24hr || []) {
            await sendAppointmentReminder(wo, '24_hour');
            
            // Mark as sent
            await supabase
                .from('work_orders')
                .update({ reminder_24hr_sent: true })
                .eq('id', wo.id);
        }

        // Get work orders scheduled for 1 hour from now
        const { data: workOrders1hr } = await supabase
            .from('work_orders')
            .select(`
                *,
                clients!inner(email, phone, contact_name),
                assigned_to_profile:user_profiles!assigned_to(full_name, phone)
            `)
            .gte('scheduled_date', in1Hour.toISOString().split('T')[0])
            .lte('scheduled_date', in1Hour.toISOString().split('T')[0])
            .eq('status', 'assigned')
            .eq('reminder_1hr_sent', false);

        // Send 1-hour reminders
        for (const wo of workOrders1hr || []) {
            await sendAppointmentReminder(wo, '1_hour');
            
            // Mark as sent
            await supabase
                .from('work_orders')
                .update({ reminder_1hr_sent: true })
                .eq('id', wo.id);
        }
    } catch (error) {
        console.error('Appointment reminder job error:', error);
    }
});

async function sendAppointmentReminder(workOrder, type) {
    const isOneHour = type === '1_hour';
    const title = isOneHour 
        ? `Service Starting Soon - ${workOrder.scheduled_time}`
        : `Service Scheduled Tomorrow`;
    
    const message = isOneHour
        ? `Your ${workOrder.service_type} service is scheduled in 1 hour. ${workOrder.assigned_to_profile?.full_name} will arrive at ${workOrder.scheduled_time}.`
        : `Reminder: ${workOrder.service_type} service scheduled for tomorrow at ${workOrder.scheduled_time}. Technician: ${workOrder.assigned_to_profile?.full_name}`;

    // Send to client
    if (workOrder.clients?.email) {
        await supabase.from('notifications').insert({
            user_id: workOrder.client_id,
            type: 'appointment_reminder',
            title,
            message,
            data: {
                work_order_id: workOrder.id,
                reminder_type: type,
                scheduled_time: workOrder.scheduled_time,
                tech_name: workOrder.assigned_to_profile?.full_name,
                tech_phone: workOrder.assigned_to_profile?.phone
            },
            priority: isOneHour ? 'high' : 'normal',
            action_url: `/work-orders/${workOrder.id}`
        });

        // TODO: Send SMS/Email through external service
        console.log(`Would send ${type} reminder to ${workOrder.clients.phone || workOrder.clients.email}`);
    }
}

// ============================================
// 2. TECH RUNNING LATE NOTIFICATION
// ============================================

async function checkTechRunningLate(workOrderId, currentLocation, previousJobEndTime) {
    try {
        const { data: workOrder } = await supabase
            .from('work_orders')
            .select(`
                *,
                clients!inner(email, phone, contact_name)
            `)
            .eq('id', workOrderId)
            .single();

        if (!workOrder) return;

        const scheduledTime = new Date(`${workOrder.scheduled_date} ${workOrder.scheduled_time}`);
        const now = new Date();
        const estimatedArrival = new Date(previousJobEndTime.getTime() + 30 * 60 * 1000); // Add 30 min travel

        // If estimated arrival is more than 15 minutes after scheduled time
        if (estimatedArrival > new Date(scheduledTime.getTime() + 15 * 60 * 1000)) {
            const delayMinutes = Math.round((estimatedArrival - scheduledTime) / 60000);
            
            // Notify client
            await supabase.from('notifications').insert({
                user_id: workOrder.client_id,
                type: 'service_delay',
                title: 'Service Running Late',
                message: `Your technician is running approximately ${delayMinutes} minutes behind schedule. New estimated arrival: ${estimatedArrival.toLocaleTimeString()}`,
                data: {
                    work_order_id: workOrderId,
                    original_time: workOrder.scheduled_time,
                    estimated_arrival: estimatedArrival.toISOString(),
                    delay_minutes: delayMinutes
                },
                priority: 'high',
                action_url: `/track-technician/${workOrderId}`
            });

            // Update work order with delay
            await supabase
                .from('work_orders')
                .update({ 
                    is_delayed: true,
                    estimated_arrival: estimatedArrival.toISOString()
                })
                .eq('id', workOrderId);
        }
    } catch (error) {
        console.error('Tech running late check error:', error);
    }
}

// ============================================
// 3. NEGATIVE REVIEW ALERT
// ============================================

async function handleNegativeReview(review) {
    if (review.rating <= 2) {
        // Alert admin and account manager immediately
        const admins = await supabase
            .from('user_profiles')
            .select('id, email, full_name')
            .eq('role', 'admin');

        for (const admin of admins.data || []) {
            await supabase.from('notifications').insert({
                user_id: admin.id,
                type: 'negative_review',
                title: '⚠️ Negative Review Received',
                message: `${review.client_name} left a ${review.rating}-star review for ${review.service_type}. Immediate action required.`,
                data: {
                    review_id: review.id,
                    work_order_id: review.work_order_id,
                    rating: review.rating,
                    client_id: review.client_id,
                    tech_id: review.tech_id,
                    review_text: review.comment
                },
                priority: 'urgent',
                action_url: `/reviews/${review.id}/respond`
            });
        }

        // Create service recovery task
        await supabase.from('service_recovery_tasks').insert({
            review_id: review.id,
            client_id: review.client_id,
            status: 'pending',
            priority: 'urgent',
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });
    }
}

// ============================================
// 4. PAYMENT FAILED NOTIFICATION
// ============================================

async function handlePaymentFailed(payment) {
    // Notify admin
    const admins = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin');

    for (const admin of admins.data || []) {
        await supabase.from('notifications').insert({
            user_id: admin.id,
            type: 'payment_failed',
            title: '💳 Payment Failed',
            message: `Payment of $${payment.amount} from ${payment.client_name} failed. Reason: ${payment.failure_reason}`,
            data: {
                payment_id: payment.id,
                invoice_id: payment.invoice_id,
                amount: payment.amount,
                client_id: payment.client_id,
                failure_reason: payment.failure_reason,
                retry_count: payment.retry_count || 0
            },
            priority: 'high',
            action_url: `/payments/${payment.id}/retry`
        });
    }

    // Notify client
    await supabase.from('notifications').insert({
        user_id: payment.client_id,
        type: 'payment_failed',
        title: 'Payment Issue',
        message: `Your payment of $${payment.amount} could not be processed. Please update your payment method.`,
        data: {
            payment_id: payment.id,
            invoice_id: payment.invoice_id,
            amount: payment.amount
        },
        priority: 'high',
        action_url: `/update-payment-method`
    });

    // Schedule retry
    setTimeout(() => retryPayment(payment.id), 24 * 60 * 60 * 1000); // Retry in 24 hours
}

// ============================================
// 5. CONTRACT RENEWAL REMINDERS
// ============================================

const contractRenewalJob = nodeCron.schedule('0 9 * * *', async () => {
    try {
        const now = new Date();
        const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // 90-day renewals
        const { data: contracts90 } = await supabase
            .from('clients')
            .select('*')
            .eq('contract_end_date', in90Days.toISOString().split('T')[0])
            .eq('renewal_90_sent', false);

        for (const contract of contracts90 || []) {
            await sendContractRenewalReminder(contract, 90);
            await supabase
                .from('clients')
                .update({ renewal_90_sent: true })
                .eq('id', contract.id);
        }

        // 60-day renewals
        const { data: contracts60 } = await supabase
            .from('clients')
            .select('*')
            .eq('contract_end_date', in60Days.toISOString().split('T')[0])
            .eq('renewal_60_sent', false);

        for (const contract of contracts60 || []) {
            await sendContractRenewalReminder(contract, 60);
            await supabase
                .from('clients')
                .update({ renewal_60_sent: true })
                .eq('id', contract.id);
        }

        // 30-day renewals
        const { data: contracts30 } = await supabase
            .from('clients')
            .select('*')
            .eq('contract_end_date', in30Days.toISOString().split('T')[0])
            .eq('renewal_30_sent', false);

        for (const contract of contracts30 || []) {
            await sendContractRenewalReminder(contract, 30);
            await supabase
                .from('clients')
                .update({ renewal_30_sent: true })
                .eq('id', contract.id);
        }
    } catch (error) {
        console.error('Contract renewal job error:', error);
    }
});

async function sendContractRenewalReminder(contract, daysUntilExpiry) {
    const priority = daysUntilExpiry <= 30 ? 'high' : 'normal';
    
    // Notify client
    await supabase.from('notifications').insert({
        user_id: contract.primary_contact_id,
        type: 'contract_renewal',
        title: `Contract Renewal - ${daysUntilExpiry} Days`,
        message: `Your service contract expires in ${daysUntilExpiry} days on ${contract.contract_end_date}. Let's discuss renewal options.`,
        data: {
            client_id: contract.id,
            contract_end_date: contract.contract_end_date,
            days_until_expiry: daysUntilExpiry,
            contract_value: contract.contract_value
        },
        priority,
        action_url: `/contracts/${contract.id}/renew`
    });

    // Notify account manager
    if (contract.account_manager_id) {
        await supabase.from('notifications').insert({
            user_id: contract.account_manager_id,
            type: 'contract_renewal',
            title: `Client Renewal Opportunity - ${contract.company_name}`,
            message: `${contract.company_name}'s contract expires in ${daysUntilExpiry} days. Contract value: $${contract.contract_value}/year`,
            data: {
                client_id: contract.id,
                contract_end_date: contract.contract_end_date,
                days_until_expiry: daysUntilExpiry,
                contract_value: contract.contract_value
            },
            priority,
            action_url: `/clients/${contract.id}/renewal`
        });
    }
}

// ============================================
// 6. QUOTE EXPIRATION WARNINGS
// ============================================

const quoteExpirationJob = nodeCron.schedule('0 10 * * *', async () => {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const in3Days = new Date();
        in3Days.setDate(in3Days.getDate() + 3);

        // Quotes expiring tomorrow
        const { data: quotesTomorrow } = await supabase
            .from('quotes')
            .select(`
                *,
                clients!inner(email, contact_name)
            `)
            .eq('status', 'pending')
            .eq('expiry_date', tomorrow.toISOString().split('T')[0]);

        for (const quote of quotesTomorrow || []) {
            await supabase.from('notifications').insert({
                user_id: quote.client_id,
                type: 'quote_expiring',
                title: '⏰ Quote Expiring Tomorrow',
                message: `Your quote for ${quote.service_description} ($${quote.total_amount}) expires tomorrow. Approve now to lock in this price.`,
                data: {
                    quote_id: quote.id,
                    amount: quote.total_amount,
                    service: quote.service_description,
                    expiry_date: quote.expiry_date
                },
                priority: 'high',
                action_url: `/quotes/${quote.id}/approve`
            });

            // Notify sales rep
            if (quote.created_by) {
                await supabase.from('notifications').insert({
                    user_id: quote.created_by,
                    type: 'quote_expiring',
                    title: `Quote Expiring - ${quote.clients.company_name}`,
                    message: `Follow up needed: Quote #${quote.quote_number} expires tomorrow`,
                    data: {
                        quote_id: quote.id,
                        client_name: quote.clients.company_name,
                        amount: quote.total_amount
                    },
                    priority: 'high',
                    action_url: `/quotes/${quote.id}`
                });
            }
        }
    } catch (error) {
        console.error('Quote expiration job error:', error);
    }
});

// ============================================
// 7. WORK ORDER LIFECYCLE NOTIFICATIONS
// ============================================

async function updateWorkOrderStatus(workOrderId, newStatus, userId) {
    try {
        const { data: workOrder } = await supabase
            .from('work_orders')
            .select(`
                *,
                clients!inner(*),
                assigned_to_profile:user_profiles!assigned_to(*)
            `)
            .eq('id', workOrderId)
            .single();

        if (!workOrder) return;

        // Update status
        await supabase
            .from('work_orders')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', workOrderId);

        // Send appropriate notifications based on status
        switch (newStatus) {
            case 'assigned':
                // Notify technician
                await supabase.from('notifications').insert({
                    user_id: workOrder.assigned_to,
                    type: 'work_order_assigned',
                    title: 'New Work Order Assignment',
                    message: `You've been assigned: ${workOrder.service_type} at ${workOrder.location_address}`,
                    data: {
                        work_order_id: workOrderId,
                        scheduled_date: workOrder.scheduled_date,
                        scheduled_time: workOrder.scheduled_time,
                        priority: workOrder.priority
                    },
                    priority: workOrder.priority === 'emergency' ? 'urgent' : 'high',
                    action_url: `/work-orders/${workOrderId}`
                });
                break;

            case 'accepted':
                // Notify client
                await supabase.from('notifications').insert({
                    user_id: workOrder.client_id,
                    type: 'work_order_accepted',
                    title: 'Technician Assigned',
                    message: `${workOrder.assigned_to_profile.full_name} has accepted your service request`,
                    data: {
                        work_order_id: workOrderId,
                        tech_name: workOrder.assigned_to_profile.full_name,
                        tech_phone: workOrder.assigned_to_profile.phone
                    },
                    priority: 'normal',
                    action_url: `/work-orders/${workOrderId}`
                });
                break;

            case 'en_route':
                // Notify client with ETA
                const eta = new Date(Date.now() + 30 * 60 * 1000); // Default 30 min ETA
                await supabase.from('notifications').insert({
                    user_id: workOrder.client_id,
                    type: 'tech_en_route',
                    title: 'Technician On the Way',
                    message: `${workOrder.assigned_to_profile.full_name} is heading to your location. ETA: ${eta.toLocaleTimeString()}`,
                    data: {
                        work_order_id: workOrderId,
                        tech_name: workOrder.assigned_to_profile.full_name,
                        estimated_arrival: eta.toISOString()
                    },
                    priority: 'high',
                    action_url: `/track-technician/${workOrderId}`
                });
                break;

            case 'arrived':
                // Notify client
                await supabase.from('notifications').insert({
                    user_id: workOrder.client_id,
                    type: 'tech_arrived',
                    title: 'Technician Has Arrived',
                    message: `${workOrder.assigned_to_profile.full_name} has arrived at your location`,
                    data: {
                        work_order_id: workOrderId,
                        arrival_time: new Date().toISOString()
                    },
                    priority: 'normal',
                    action_url: `/work-orders/${workOrderId}`
                });
                break;

            case 'completed':
                // Notify client and request review
                await supabase.from('notifications').insert({
                    user_id: workOrder.client_id,
                    type: 'work_order_completed',
                    title: 'Service Completed',
                    message: `Your ${workOrder.service_type} service has been completed. Please review your experience.`,
                    data: {
                        work_order_id: workOrderId,
                        completion_time: new Date().toISOString(),
                        tech_name: workOrder.assigned_to_profile.full_name
                    },
                    priority: 'normal',
                    action_url: `/work-orders/${workOrderId}/review`
                });

                // Schedule review reminder for 24 hours later
                setTimeout(() => sendReviewReminder(workOrderId), 24 * 60 * 60 * 1000);
                break;
        }

        // Log status change
        await supabase.from('work_order_history').insert({
            work_order_id: workOrderId,
            status: newStatus,
            changed_by: userId,
            notes: `Status changed to ${newStatus}`
        });

    } catch (error) {
        console.error('Work order status update error:', error);
    }
}

async function sendReviewReminder(workOrderId) {
    const { data: workOrder } = await supabase
        .from('work_orders')
        .select('*, clients!inner(*)')
        .eq('id', workOrderId)
        .single();

    if (workOrder && !workOrder.review_submitted) {
        await supabase.from('notifications').insert({
            user_id: workOrder.client_id,
            type: 'review_reminder',
            title: 'How was your service?',
            message: 'Take a moment to review your recent service experience',
            data: {
                work_order_id: workOrderId
            },
            priority: 'low',
            action_url: `/work-orders/${workOrderId}/review`
        });
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function retryPayment(paymentId) {
    // Implementation for payment retry logic
    console.log(`Retrying payment ${paymentId}`);
}

// Export functions for use in API endpoints
module.exports = {
    sendAppointmentReminder,
    checkTechRunningLate,
    handleNegativeReview,
    handlePaymentFailed,
    sendContractRenewalReminder,
    updateWorkOrderStatus,
    appointmentReminderJob,
    contractRenewalJob,
    quoteExpirationJob
};