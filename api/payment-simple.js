const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create payment intent
router.post('/create-intent', async (req, res) => {
    try {
        const { amount, currency = 'usd', customer_email, metadata } = req.body;
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            receipt_email: customer_email,
            metadata: metadata || {}
        });
        
        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create checkout session
router.post('/create-checkout', async (req, res) => {
    try {
        const { 
            line_items, 
            success_url = 'http://localhost:3000/success',
            cancel_url = 'http://localhost:3000/cancel',
            customer_email,
            metadata
        } = req.body;
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url,
            cancel_url,
            customer_email,
            metadata: metadata || {}
        });
        
        res.json({
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get payment status
router.get('/status/:id', async (req, res) => {
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(req.params.id);
        res.json({
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;