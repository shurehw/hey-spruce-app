require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
    origin: true,
    credentials: true
}));

// Middleware
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl === '/api/webhooks/stripe') {
      req.rawBody = buf.toString('utf-8');
    }
  }
}));

// Static files - serve everything from current directory
app.use(express.static(__dirname, {
    extensions: ['html', 'htm'],
    index: 'index.html'
}));

// In-memory storage
let vendors = [];
let invoices = [];
let vendorId = 1;
let invoiceId = 1;

// Email configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    stripe: !!process.env.STRIPE_SECRET_KEY,
    endpoints: {
      webhook: '/api/webhooks/stripe',
      payment: '/api/payment',
      invoices: '/api/invoices',
      vendors: '/api/vendors'
    }
  });
});

// VENDOR ENDPOINTS
app.get('/api/vendors', (req, res) => {
    res.json(vendors);
});

app.get('/api/vendors/:id', (req, res) => {
    const vendor = vendors.find(v => v.id === req.params.id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
});

app.post('/api/vendors', (req, res) => {
    const vendor = {
        id: `vendor_${vendorId++}`,
        ...req.body,
        created_at: new Date().toISOString()
    };
    vendors.push(vendor);
    res.status(201).json(vendor);
});

// PAYMENT ENDPOINTS
app.post('/api/payment/create-intent', async (req, res) => {
    try {
        const { amount, currency = 'usd', customer_email, metadata } = req.body;
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount),
            currency,
            receipt_email: customer_email,
            metadata: metadata || {}
        });
        
        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/payment/create-checkout', async (req, res) => {
    try {
        const { 
            line_items, 
            success_url = 'http://localhost:3000/success',
            cancel_url = 'http://localhost:3000/cancel',
            customer_email
        } = req.body;
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url,
            cancel_url,
            customer_email
        });
        
        res.json({
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// INVOICE ENDPOINTS
app.get('/api/invoices', (req, res) => {
    res.json(invoices);
});

app.get('/api/invoices/:id', (req, res) => {
    const invoice = invoices.find(i => i.id === req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
});

app.post('/api/invoices', (req, res) => {
    const { invoice_number, vendor, customer, items, tax_rate = 0 } = req.body;
    
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = subtotal * tax_rate;
    const total = subtotal + tax;
    
    const invoice = {
        id: `inv_${invoiceId++}`,
        invoice_number,
        vendor,
        customer,
        items,
        subtotal,
        tax_rate,
        tax,
        total,
        status: 'pending',
        created_at: new Date().toISOString()
    };
    
    invoices.push(invoice);
    res.status(201).json(invoice);
});

app.get('/api/invoices/:id/pdf', (req, res) => {
    const invoice = invoices.find(i => i.id === req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);
    
    doc.pipe(res);
    
    doc.fontSize(20).text('INVOICE', 50, 50);
    doc.fontSize(12).text(`Invoice #: ${invoice.invoice_number}`, 50, 80);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 100);
    
    doc.text('From:', 50, 140);
    doc.text(invoice.vendor.name, 50, 160);
    doc.text(invoice.vendor.email, 50, 180);
    
    doc.text('To:', 300, 140);
    doc.text(invoice.customer.name, 300, 160);
    doc.text(invoice.customer.email, 300, 180);
    
    let y = 240;
    doc.text('Items:', 50, y);
    y += 20;
    
    invoice.items.forEach(item => {
        doc.text(`${item.description} - Qty: ${item.quantity} x $${item.price} = $${(item.quantity * item.price).toFixed(2)}`, 50, y);
        y += 20;
    });
    
    y += 20;
    doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 350, y);
    y += 20;
    doc.text(`Tax: $${invoice.tax.toFixed(2)}`, 350, y);
    y += 20;
    doc.fontSize(14).text(`Total: $${invoice.total.toFixed(2)}`, 350, y);
    
    doc.end();
});

// EMAIL ENDPOINTS
app.post('/api/team-invite', async (req, res) => {
    const { firstName, lastName, email, role, clientPortalAccess, inviteUrl } = req.body;
    
    try {
        // Email HTML template
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
                    .content { padding: 30px; background-color: #f9f9f9; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to OpenWrench</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${firstName} ${lastName},</h2>
                        <p>You've been invited to join OpenWrench as a <strong>${role}</strong>.</p>
                        <p>Click the button below to set up your account and get started:</p>
                        <center>
                            <a href="${inviteUrl}" class="button">Accept Invitation</a>
                        </center>
                        <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
                        ${clientPortalAccess ? '<p><strong>Note:</strong> You will also have access to the client portal.</p>' : ''}
                    </div>
                    <div class="footer">
                        <p>&copy; 2024 OpenWrench. All rights reserved.</p>
                        <p>If you didn't expect this invitation, please ignore this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@openwrench.com',
            to: email,
            subject: 'Invitation to Join OpenWrench Team',
            html: htmlContent
        };
        
        // Check if email is properly configured
        if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            console.log('Email would be sent to:', email);
            console.log('Invite URL:', inviteUrl);
            res.json({ success: true, message: 'Invite logged (email not configured)' });
        } else {
            await transporter.sendMail(mailOptions);
            console.log('Email sent successfully to:', email);
            res.json({ success: true, message: 'Invitation email sent successfully' });
        }
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send invitation email' });
    }
});

// WEBHOOK ENDPOINT
app.post('/api/webhooks/stripe', async (req, res) => {
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
            default:
                console.log(`Unhandled event: ${event.type}`);
        }
        
        res.json({ received: true });
    } catch (err) {
        console.error('Webhook error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// For Vercel deployment
if (process.env.VERCEL) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Test the API at http://localhost:${PORT}/api/health`);
    });
}