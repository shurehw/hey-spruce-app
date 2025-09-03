module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    res.json({ 
        status: 'ok', 
        stripe: !!process.env.STRIPE_SECRET_KEY,
        endpoints: {
            webhook: '/api/webhooks/stripe',
            payment: '/api/payment',
            invoices: '/api/invoices',
            vendors: '/api/vendors',
            teamInvite: '/api/team-invite'
        }
    });
};