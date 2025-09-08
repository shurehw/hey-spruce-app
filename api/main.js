// Combined API endpoint to work within Vercel's limits
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with error handling
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
}

// Import individual handlers
const workOrdersHandler = require('./work-orders');
const rfpsHandler = require('./rfps');
const notificationsHandler = require('./notifications');
const paymentsHandler = require('./payments');
const fileUploadHandler = require('./file-upload');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Route to appropriate handler based on path
    const path = req.url.split('?')[0];
    const basePath = path.split('/')[2]; // Gets 'work-orders', 'rfps', etc.

    // Check if Supabase is configured
    if (!supabase && basePath !== 'health' && basePath !== 'setup-status') {
        return res.status(503).json({ 
            error: 'Database not configured',
            message: 'Please set up Supabase environment variables in Vercel',
            required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
        });
    }

    try {
        switch (basePath) {
            case 'work-orders':
                return workOrdersHandler(req, res);
            
            case 'rfps':
            case 'bids':
                return rfpsHandler(req, res);
            
            case 'notifications':
                return notificationsHandler(req, res);
            
            case 'payments':
                return paymentsHandler(req, res);
            
            case 'file-upload':
            case 'files':
                return fileUploadHandler(req, res);
            
            case 'health':
                return res.json({ status: 'healthy', timestamp: new Date().toISOString() });
            
            case 'setup-status':
                return res.json({
                    supabase: !!process.env.SUPABASE_URL,
                    stripe: !!process.env.STRIPE_SECRET_KEY,
                    sendgrid: !!process.env.SENDGRID_API_KEY
                });
            
            default:
                return res.status(404).json({ error: 'Endpoint not found' });
        }
    } catch (error) {
        console.error('API routing error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
};