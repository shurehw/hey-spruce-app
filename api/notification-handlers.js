// Notification Handler Functions
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================
// APPOINTMENT REMINDER
// ============================================
async function sendAppointmentReminder(workOrder, type) {
    const isOneHour = type === '1_hour';
    const title = isOneHour 
        ? `Service Starting Soon - ${workOrder.scheduled_time}`
        : `Service Scheduled Tomorrow`;
    
    const message = isOneHour
        ? `Your ${workOrder.service_type} service is scheduled in 1 hour. ${workOrder.assigned_to_profile?.full_name} will arrive at ${workOrder.scheduled_time}.`
        : `Reminder: ${workOrder.service_type} service scheduled for tomorrow at ${workOrder.scheduled_time}. Technician: ${workOrder.assigned_to_profile?.full_name}`;

    // Send in-app notification
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

    return { success: true };
}

// ============================================
// TECH RUNNING LATE
// ============================================
async function checkTechRunningLate(workOrderId, currentLocation, previousJobEndTime) {
    const { data: workOrder } = await supabase
        .from('work_orders')
        .select(`
            *,
            clients!inner(*)
        `)
        .eq('id', workOrderId)
        .single();

    if (!workOrder) return;

    const scheduledTime = new Date(`${workOrder.scheduled_date} ${workOrder.scheduled_time}`);
    const now = new Date();
    const estimatedArrival = new Date(previousJobEndTime.getTime() + 30 * 60 * 1000);

    if (estimatedArrival > new Date(scheduledTime.getTime() + 15 * 60 * 1000)) {
        const delayMinutes = Math.round((estimatedArrival - scheduledTime) / 60000);
        
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

        await supabase
            .from('work_orders')
            .update({ 
                is_delayed: true,
                estimated_arrival: estimatedArrival.toISOString()
            })
            .eq('id', workOrderId);
    }

    return { success: true };
}

// ============================================
// NEGATIVE REVIEW ALERT
// ============================================
async function handleNegativeReview(review) {
    if (review.rating <= 2) {
        const { data: admins } = await supabase
            .from('user_profiles')
            .select('id, email, full_name')
            .eq('role', 'admin');

        for (const admin of admins || []) {
            await supabase.from('notifications').insert({
                user_id: admin.id,
                type: 'negative_review',
                title: '⚠️ Negative Review Received',
                message: `${review.client_name} left a ${review.rating}-star review. Immediate action required.`,
                data: {
                    review_id: review.id,
                    work_order_id: review.work_order_id,
                    rating: review.rating,
                    client_id: review.client_id,
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
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
    }

    return { success: true };
}

// ============================================
// PAYMENT FAILED
// ============================================
async function handlePaymentFailed(payment) {
    const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin');

    for (const admin of admins || []) {
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
                failure_reason: payment.failure_reason
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

    return { success: true };
}

// ============================================
// CONTRACT RENEWAL
// ============================================
async function sendContractRenewalReminder(contract, daysUntilExpiry) {
    const priority = daysUntilExpiry <= 30 ? 'high' : 'normal';
    
    // Notify client
    if (contract.primary_contact_id) {
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
    }

    // Notify account manager
    if (contract.account_manager_id) {
        await supabase.from('notifications').insert({
            user_id: contract.account_manager_id,
            type: 'contract_renewal',
            title: `Client Renewal - ${contract.company_name}`,
            message: `${contract.company_name}'s contract expires in ${daysUntilExpiry} days. Value: $${contract.contract_value}/year`,
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

    return { success: true };
}

// ============================================
// WORK ORDER STATUS UPDATE
// ============================================
async function updateWorkOrderStatus(workOrderId, newStatus, userId) {
    const { data: workOrder } = await supabase
        .from('work_orders')
        .select(`
            *,
            clients!inner(*),
            assigned_to_profile:user_profiles!assigned_to(*)
        `)
        .eq('id', workOrderId)
        .single();

    if (!workOrder) throw new Error('Work order not found');

    // Update status
    await supabase
        .from('work_orders')
        .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', workOrderId);

    // Send notifications based on status
    switch (newStatus) {
        case 'assigned':
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
            const eta = new Date(Date.now() + 30 * 60 * 1000);
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
            break;
    }

    // Log status change
    await supabase.from('work_order_history').insert({
        work_order_id: workOrderId,
        status: newStatus,
        changed_by: userId,
        notes: `Status changed to ${newStatus}`
    });

    return { success: true };
}

module.exports = {
    sendAppointmentReminder,
    checkTechRunningLate,
    handleNegativeReview,
    handlePaymentFailed,
    sendContractRenewalReminder,
    updateWorkOrderStatus
};