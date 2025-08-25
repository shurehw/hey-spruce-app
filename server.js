require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const OpenWrenchClient = require('./openwrench-client');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

// Middleware
app.use(express.json({
  verify: (req, res, buf) => {
    // Store raw body for Stripe webhook verification
    if (req.originalUrl === '/api/webhooks/stripe') {
      req.rawBody = buf.toString('utf-8');
    }
  }
}));

// Initialize OpenWrench client
const owClient = new OpenWrenchClient();

// Import route handlers
const paymentRoutes = require('./api/payment-simple');
const invoiceRoutes = require('./api/invoices-simple');
const vendorRoutes = require('./api/vendors');  // Using full vendors.js with email functionality
const webhookRoutes = require('./api/webhooks-simple');
const connectRoutes = require('./api/connect');
const sendProposalRoutes = require('./api/send-proposal');
const proposalResponseRoutes = require('./api/proposal-response');

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Static files
app.use(express.static('public'));

// Serve HTML files from root directory
app.get('/supplier-portal.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'supplier-portal.html'));
});

app.get('/proposal-response.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'proposal-response.html'));
});

// API routes
app.use('/api/payment', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/connect', connectRoutes);
app.use('/api/send-proposal', sendProposalRoutes);
app.use('/api/proposal-response', proposalResponseRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    stripe: !!process.env.STRIPE_SECRET_KEY,
    openwrench: !!process.env.OPENWRENCH_API_KEY,
    endpoints: {
      webhook: '/api/webhooks/stripe',
      payment: '/api/payment',
      invoices: '/api/invoices',
      vendors: '/api/vendors',
      connect: '/api/connect',
      'send-proposal': '/api/send-proposal'
    }
  });
});

// Catch-all error handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});


// Export upload for use in other modules
module.exports.upload = upload;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/api/webhooks/stripe`);
});