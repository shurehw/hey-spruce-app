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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    const { type, period = '30d' } = req.query;

    try {
        let analyticsData = {};

        switch (type) {
            case 'overview':
                analyticsData = await getOverviewAnalytics(userId, userRole, period);
                break;
            case 'work-orders':
                analyticsData = await getWorkOrderAnalytics(userId, userRole, period);
                break;
            case 'financial':
                analyticsData = await getFinancialAnalytics(userId, userRole, period);
                break;
            case 'performance':
                analyticsData = await getPerformanceAnalytics(userId, userRole, period);
                break;
            case 'communication':
                analyticsData = await getCommunicationAnalytics(userId, userRole, period);
                break;
            default:
                return res.status(400).json({ error: 'Invalid analytics type' });
        }

        return res.json({ success: true, data: analyticsData });
        
    } catch (error) {
        console.error('Analytics API Error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
};

// Get period filter for SQL queries
function getPeriodFilter(period) {
    const now = new Date();
    let startDate;
    
    switch (period) {
        case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        case '1y':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return startDate.toISOString();
}

// Overview Analytics
async function getOverviewAnalytics(userId, userRole, period) {
    const startDate = getPeriodFilter(period);
    
    const { data: workOrders } = await supabase
        .from('work_orders')
        .select('*')
        .gte('created_at', startDate);

    const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate);

    return {
        total_work_orders: workOrders?.length || 0,
        completed_work_orders: workOrders?.filter(w => w.status === 'completed').length || 0,
        pending_work_orders: workOrders?.filter(w => w.status === 'pending').length || 0,
        in_progress_work_orders: workOrders?.filter(w => w.status === 'in_progress').length || 0,
        total_notifications: notifications?.length || 0,
        unread_notifications: notifications?.filter(n => !n.is_read).length || 0,
        completion_rate: workOrders?.length ? 
            ((workOrders.filter(w => w.status === 'completed').length / workOrders.length) * 100).toFixed(1) : 0,
        period
    };
}

// Work Order Analytics
async function getWorkOrderAnalytics(userId, userRole, period) {
    const startDate = getPeriodFilter(period);
    
    let query = supabase.from('work_orders').select('*').gte('created_at', startDate);
    
    // Filter based on user role
    if (userRole === 'client') {
        query = query.eq('client_id', userId);
    } else if (userRole === 'subcontractor') {
        query = query.eq('assigned_to', userId);
    }

    const { data: workOrders } = await query;

    // Generate daily counts for chart
    const dailyCounts = {};
    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        dailyCounts[dateKey] = {
            created: 0,
            completed: 0,
            date: dateKey
        };
    }

    workOrders?.forEach(wo => {
        const dateKey = wo.created_at.split('T')[0];
        if (dailyCounts[dateKey]) {
            dailyCounts[dateKey].created++;
            if (wo.status === 'completed') {
                dailyCounts[dateKey].completed++;
            }
        }
    });

    // Status distribution
    const statusCounts = {
        pending: workOrders?.filter(w => w.status === 'pending').length || 0,
        in_progress: workOrders?.filter(w => w.status === 'in_progress').length || 0,
        completed: workOrders?.filter(w => w.status === 'completed').length || 0,
        cancelled: workOrders?.filter(w => w.status === 'cancelled').length || 0
    };

    // Priority distribution
    const priorityCounts = {
        low: workOrders?.filter(w => w.priority === 'low').length || 0,
        normal: workOrders?.filter(w => w.priority === 'normal').length || 0,
        high: workOrders?.filter(w => w.priority === 'high').length || 0,
        urgent: workOrders?.filter(w => w.priority === 'urgent').length || 0
    };

    return {
        daily_counts: Object.values(dailyCounts),
        status_distribution: statusCounts,
        priority_distribution: priorityCounts,
        total: workOrders?.length || 0,
        average_completion_time: calculateAverageCompletionTime(workOrders),
        period
    };
}

// Financial Analytics
async function getFinancialAnalytics(userId, userRole, period) {
    const startDate = getPeriodFilter(period);
    
    let query = supabase.from('work_orders').select('*').gte('created_at', startDate);
    
    if (userRole === 'client') {
        query = query.eq('client_id', userId);
    }

    const { data: workOrders } = await query;

    // Calculate financial metrics
    const totalSpend = workOrders?.reduce((sum, wo) => sum + (parseFloat(wo.estimated_cost) || 0), 0) || 0;
    const completedSpend = workOrders?.filter(w => w.status === 'completed')
        .reduce((sum, wo) => sum + (parseFloat(wo.estimated_cost) || 0), 0) || 0;

    // Monthly spend trend
    const monthlySpend = {};
    workOrders?.forEach(wo => {
        const month = wo.created_at.substring(0, 7); // YYYY-MM
        monthlySpend[month] = (monthlySpend[month] || 0) + (parseFloat(wo.estimated_cost) || 0);
    });

    // Category breakdown
    const categorySpend = {};
    workOrders?.forEach(wo => {
        const category = wo.service_type || 'Other';
        categorySpend[category] = (categorySpend[category] || 0) + (parseFloat(wo.estimated_cost) || 0);
    });

    return {
        total_spend: totalSpend,
        completed_spend: completedSpend,
        pending_spend: totalSpend - completedSpend,
        monthly_spend: Object.entries(monthlySpend).map(([month, amount]) => ({
            month,
            amount: parseFloat(amount.toFixed(2))
        })),
        category_breakdown: Object.entries(categorySpend).map(([category, amount]) => ({
            category,
            amount: parseFloat(amount.toFixed(2))
        })),
        period
    };
}

// Performance Analytics
async function getPerformanceAnalytics(userId, userRole, period) {
    const startDate = getPeriodFilter(period);
    
    let query = supabase.from('work_orders').select('*').gte('created_at', startDate);
    
    if (userRole === 'subcontractor') {
        query = query.eq('assigned_to', userId);
    }

    const { data: workOrders } = await query;

    // Performance metrics
    const totalCompleted = workOrders?.filter(w => w.status === 'completed').length || 0;
    const onTimeCompleted = workOrders?.filter(w => 
        w.status === 'completed' && 
        w.completed_at && 
        w.due_date && 
        new Date(w.completed_at) <= new Date(w.due_date)
    ).length || 0;

    const onTimeRate = totalCompleted > 0 ? ((onTimeCompleted / totalCompleted) * 100).toFixed(1) : 0;

    // Quality metrics (placeholder - would need quality rating system)
    const averageRating = 4.2; // Placeholder
    const customerSatisfaction = 87; // Placeholder

    return {
        completion_rate: workOrders?.length ? 
            ((totalCompleted / workOrders.length) * 100).toFixed(1) : 0,
        on_time_rate: onTimeRate,
        average_rating: averageRating,
        customer_satisfaction: customerSatisfaction,
        total_jobs: workOrders?.length || 0,
        completed_jobs: totalCompleted,
        period
    };
}

// Communication Analytics
async function getCommunicationAnalytics(userId, userRole, period) {
    const startDate = getPeriodFilter(period);
    
    const { data: messages } = await supabase
        .from('messages')
        .select('*, conversations(*)')
        .gte('created_at', startDate);

    const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate);

    // Message metrics
    const sentMessages = messages?.filter(m => m.sender_id === userId).length || 0;
    const receivedMessages = messages?.filter(m => m.sender_id !== userId).length || 0;
    
    // Response time analytics (placeholder)
    const averageResponseTime = 2.5; // hours placeholder

    // Communication channels
    const emailNotifications = notifications?.filter(n => n.type.includes('email')).length || 0;
    const inAppNotifications = notifications?.filter(n => !n.type.includes('email')).length || 0;

    return {
        messages_sent: sentMessages,
        messages_received: receivedMessages,
        total_conversations: messages?.reduce((acc, m) => {
            acc[m.conversation_id] = true;
            return acc;
        }, {}) ? Object.keys(messages.reduce((acc, m) => {
            acc[m.conversation_id] = true;
            return acc;
        }, {})).length : 0,
        average_response_time: averageResponseTime,
        notifications_sent: emailNotifications + inAppNotifications,
        email_notifications: emailNotifications,
        in_app_notifications: inAppNotifications,
        period
    };
}

// Helper function to calculate average completion time
function calculateAverageCompletionTime(workOrders) {
    const completedOrders = workOrders?.filter(w => w.status === 'completed' && w.created_at && w.completed_at);
    
    if (!completedOrders || completedOrders.length === 0) {
        return 0;
    }

    const totalTime = completedOrders.reduce((sum, wo) => {
        const created = new Date(wo.created_at);
        const completed = new Date(wo.completed_at);
        return sum + (completed - created);
    }, 0);

    // Return average in hours
    return Math.round(totalTime / completedOrders.length / (1000 * 60 * 60));
}