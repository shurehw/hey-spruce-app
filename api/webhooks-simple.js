const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Stripe webhook handler
router.post('/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    try {
        const event = stripe.webhooks.constructEvent(
            req.rawBody,
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
                
            case 'account.updated':
                console.log('Connect account updated:', event.data.object.id);
                break;
                
            case 'account.application.authorized':
                console.log('Connect account authorized:', event.data.object.id);
                break;
                
            default:
                console.log(`Unhandled event: ${event.type}`);
        }
        
        res.json({ received: true });
    } catch (err) {
        console.error('Webhook error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

module.exports = router;