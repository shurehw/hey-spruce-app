module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Return comprehensive health status
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: {
            supabase_url: !!process.env.SUPABASE_URL,
            supabase_anon_key: !!process.env.SUPABASE_ANON_KEY,
            supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            stripe: !!process.env.STRIPE_SECRET_KEY,
            sendgrid: !!process.env.SENDGRID_API_KEY
        },
        endpoints: {
            health: '/api/health',
            main: '/api/main',
            workOrders: '/api/work-orders',
            rfps: '/api/rfps',
            notifications: '/api/notifications',
            payments: '/api/payments',
            fileUpload: '/api/file-upload'
        },
        setup_required: !process.env.SUPABASE_URL ? 
            'Please configure Supabase environment variables in Vercel dashboard' : 
            'Environment configured'
    });
};