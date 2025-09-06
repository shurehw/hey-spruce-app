const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// Initialize Stripe - You'll need to add your Stripe secret key to environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verify authentication for most endpoints
    let user = null;
    if (req.url !== '/api/payments/webhook') {
        const authResult = await verifyToken(req.headers.authorization);
        if (authResult.error) {
            return res.status(401).json({ error: authResult.error });
        }
        user = authResult.user;
    }

    try {
        const path = req.url.split('?')[0];

        // Handle different payment endpoints
        switch (path) {
            case '/api/payments/create-checkout':
                return handleCreateCheckout(req, res, user);
            
            case '/api/payments/create-payment-link':
                return handleCreatePaymentLink(req, res, user);
            
            case '/api/payments/invoice-payment':
                return handleInvoicePayment(req, res, user);
            
            case '/api/payments/webhook':
                return handleStripeWebhook(req, res);
            
            case '/api/payments/history':
                return handlePaymentHistory(req, res, user);
            
            case '/api/payments/refund':
                return handleRefund(req, res, user);
            
            default:
                return res.status(404).json({ error: 'Endpoint not found' });
        }
    } catch (error) {
        console.error('Payment API error:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
};

// Create Stripe checkout session for invoice payment
async function handleCreateCheckout(req, res, user) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { invoice_id, success_url, cancel_url } = req.body;

    if (!invoice_id) {
        return res.status(400).json({ error: 'Invoice ID is required' });
    }

    try {
        // Get invoice details
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('*, client:clients!client_id(company_name, email)')
            .eq('id', invoice_id)
            .single();

        if (invoiceError || !invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Invoice ${invoice.invoice_number}`,
                            description: invoice.client?.company_name || 'Service Invoice',
                        },
                        unit_amount: Math.round(invoice.total_amount * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: success_url || `${process.env.SITE_URL}/payment-success?invoice=${invoice_id}`,
            cancel_url: cancel_url || `${process.env.SITE_URL}/invoices/${invoice_id}`,
            metadata: {
                invoice_id: invoice_id,
                invoice_number: invoice.invoice_number,
                user_id: user.id
            },
            customer_email: invoice.client?.email || user.profile?.email,
        });

        // Store payment intent in database
        await supabase
            .from('payments')
            .insert({
                invoice_id: invoice_id,
                amount: invoice.total_amount,
                payment_method: 'stripe_checkout',
                processor: 'stripe',
                reference_number: session.id,
                notes: 'Checkout session created',
                created_by: user.id
            });

        res.json({ 
            success: true, 
            checkout_url: session.url,
            session_id: session.id 
        });
    } catch (error) {
        console.error('Checkout creation error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
}

// Create a payment link for an invoice
async function handleCreatePaymentLink(req, res, user) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { invoice_id, expires_in_days = 30 } = req.body;

    if (!invoice_id) {
        return res.status(400).json({ error: 'Invoice ID is required' });
    }

    try {
        // Get invoice details
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', invoice_id)
            .single();

        if (invoiceError || !invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Create Stripe payment link
        const paymentLink = await stripe.paymentLinks.create({
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Invoice ${invoice.invoice_number}`,
                            description: `Payment for invoice ${invoice.invoice_number}`
                        },
                        unit_amount: Math.round(invoice.total_amount * 100),
                    },
                    quantity: 1,
                },
            ],
            after_completion: {
                type: 'redirect',
                redirect: {
                    url: `${process.env.SITE_URL}/payment-success?invoice=${invoice_id}`,
                },
            },
            metadata: {
                invoice_id: invoice_id,
                invoice_number: invoice.invoice_number
            },
        });

        // Update invoice with payment link
        await supabase
            .from('invoices')
            .update({ 
                payment_link: paymentLink.url,
                payment_link_expires: new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000)
            })
            .eq('id', invoice_id);

        res.json({ 
            success: true, 
            payment_link: paymentLink.url,
            expires_in: expires_in_days 
        });
    } catch (error) {
        console.error('Payment link creation error:', error);
        res.status(500).json({ error: 'Failed to create payment link' });
    }
}

// Process invoice payment
async function handleInvoicePayment(req, res, user) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { invoice_id, payment_method_id, amount } = req.body;

    if (!invoice_id || !payment_method_id || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Get invoice details
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', invoice_id)
            .single();

        if (invoiceError || !invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'usd',
            payment_method: payment_method_id,
            confirm: true,
            metadata: {
                invoice_id: invoice_id,
                invoice_number: invoice.invoice_number,
                user_id: user.id
            },
        });

        if (paymentIntent.status === 'succeeded') {
            // Record payment in database
            const { data: payment, error: paymentError } = await supabase
                .from('payments')
                .insert({
                    invoice_id: invoice_id,
                    amount: amount,
                    payment_method: 'credit_card',
                    processor: 'stripe',
                    reference_number: paymentIntent.id,
                    payment_date: new Date(),
                    created_by: user.id
                })
                .select()
                .single();

            if (!paymentError) {
                // Update invoice status
                const newStatus = invoice.total_amount <= (invoice.amount_paid + amount) ? 'paid' : 'partial';
                
                await supabase
                    .from('invoices')
                    .update({
                        amount_paid: invoice.amount_paid + amount,
                        status: newStatus,
                        paid_at: newStatus === 'paid' ? new Date() : null
                    })
                    .eq('id', invoice_id);

                // Send notification
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: invoice.created_by,
                        type: 'invoice',
                        title: 'Payment Received',
                        message: `Payment of $${amount} received for invoice ${invoice.invoice_number}`,
                        data: { invoice_id, payment_id: payment.id },
                        priority: 'high'
                    });
            }

            res.json({ 
                success: true, 
                payment_id: paymentIntent.id,
                status: paymentIntent.status 
            });
        } else {
            res.json({ 
                success: false, 
                status: paymentIntent.status,
                error: 'Payment requires additional action' 
            });
        }
    } catch (error) {
        console.error('Payment processing error:', error);
        res.status(500).json({ error: 'Failed to process payment' });
    }
}

// Handle Stripe webhooks
async function handleStripeWebhook(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).json({ error: 'Invalid signature' });
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            
            // Update invoice as paid
            if (session.metadata?.invoice_id) {
                const { data: invoice } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('id', session.metadata.invoice_id)
                    .single();

                if (invoice) {
                    // Record payment
                    await supabase
                        .from('payments')
                        .insert({
                            invoice_id: session.metadata.invoice_id,
                            amount: session.amount_total / 100, // Convert from cents
                            payment_method: 'credit_card',
                            processor: 'stripe',
                            reference_number: session.payment_intent,
                            payment_date: new Date()
                        });

                    // Update invoice
                    await supabase
                        .from('invoices')
                        .update({
                            status: 'paid',
                            amount_paid: invoice.total_amount,
                            paid_at: new Date()
                        })
                        .eq('id', session.metadata.invoice_id);

                    // Send notification
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: invoice.created_by,
                            type: 'invoice',
                            title: 'Invoice Paid',
                            message: `Invoice ${invoice.invoice_number} has been paid in full`,
                            data: { invoice_id: session.metadata.invoice_id },
                            priority: 'high'
                        });
                }
            }
            break;

        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('Payment succeeded:', paymentIntent.id);
            break;

        case 'payment_intent.payment_failed':
            const failedIntent = event.data.object;
            console.log('Payment failed:', failedIntent.id);
            
            // Send failure notification
            if (failedIntent.metadata?.invoice_id) {
                const { data: invoice } = await supabase
                    .from('invoices')
                    .select('created_by')
                    .eq('id', failedIntent.metadata.invoice_id)
                    .single();

                if (invoice) {
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: invoice.created_by,
                            type: 'invoice',
                            title: 'Payment Failed',
                            message: `Payment failed for invoice. Please check payment details.`,
                            data: { invoice_id: failedIntent.metadata.invoice_id },
                            priority: 'urgent'
                        });
                }
            }
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
}

// Get payment history
async function handlePaymentHistory(req, res, user) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let query = supabase
            .from('payments')
            .select(`
                *,
                invoice:invoices!invoice_id(
                    invoice_number,
                    client_id,
                    total_amount
                )
            `)
            .order('created_at', { ascending: false });

        // Filter based on user role
        if (user.profile?.role === 'client') {
            // Clients see only their payments
            const { data: clientUser } = await supabase
                .from('client_users')
                .select('client_id')
                .eq('user_id', user.id)
                .single();

            if (clientUser) {
                query = query.eq('invoice.client_id', clientUser.client_id);
            }
        }

        // Apply filters
        if (req.query.invoice_id) {
            query = query.eq('invoice_id', req.query.invoice_id);
        }
        if (req.query.from_date) {
            query = query.gte('payment_date', req.query.from_date);
        }
        if (req.query.to_date) {
            query = query.lte('payment_date', req.query.to_date);
        }

        const { data: payments, error } = await query;

        if (error) throw error;

        res.json({ 
            success: true, 
            data: payments,
            count: payments.length 
        });
    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
}

// Process refund
async function handleRefund(req, res, user) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Only admins can process refunds
    if (user.profile?.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can process refunds' });
    }

    const { payment_id, amount, reason } = req.body;

    if (!payment_id || !amount) {
        return res.status(400).json({ error: 'Payment ID and amount are required' });
    }

    try {
        // Get payment details
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .select('*')
            .eq('id', payment_id)
            .single();

        if (paymentError || !payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Process refund in Stripe
        const refund = await stripe.refunds.create({
            payment_intent: payment.reference_number,
            amount: Math.round(amount * 100), // Convert to cents
            reason: reason || 'requested_by_customer',
        });

        // Record refund in database
        await supabase
            .from('payments')
            .insert({
                invoice_id: payment.invoice_id,
                amount: -amount, // Negative amount for refund
                payment_method: 'refund',
                processor: 'stripe',
                reference_number: refund.id,
                notes: `Refund for payment ${payment.reference_number}: ${reason}`,
                payment_date: new Date(),
                created_by: user.id
            });

        // Update invoice if needed
        const { data: invoice } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', payment.invoice_id)
            .single();

        if (invoice) {
            const newAmountPaid = Math.max(0, invoice.amount_paid - amount);
            const newStatus = newAmountPaid === 0 ? 'pending' : 
                            newAmountPaid < invoice.total_amount ? 'partial' : 'paid';

            await supabase
                .from('invoices')
                .update({
                    amount_paid: newAmountPaid,
                    status: newStatus
                })
                .eq('id', payment.invoice_id);
        }

        res.json({ 
            success: true, 
            refund_id: refund.id,
            status: refund.status 
        });
    } catch (error) {
        console.error('Refund processing error:', error);
        res.status(500).json({ error: 'Failed to process refund' });
    }
}