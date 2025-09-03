const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const sig = req.headers['stripe-signature'];
    
    try {
        // For Vercel, the raw body is available as req.body when bodyParser is disabled
        const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        
        const event = stripe.webhooks.constructEvent(
            rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        
        console.log(`Webhook received: ${event.type}`);
        
        switch (event.type) {
            case 'payment_intent.succeeded':
                console.log('Payment succeeded:', event.data.object.id);
                break;
            case 'invoice.payment_succeeded':
                console.log('Invoice payment succeeded:', event.data.object.id);
                break;
            case 'checkout.session.completed':
                console.log('Checkout completed:', event.data.object.id);
                break;
            default:
                console.log(`Unhandled event: ${event.type}`);
        }
        
        res.json({ received: true });
    } catch (err) {
        console.error('Webhook error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
};

// Disable body parsing for raw body access
export const config = {
    api: {
        bodyParser: false,
    },
};