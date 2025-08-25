const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Store account data (in production, use a database)
const connectedAccounts = new Map();

// Create a new Connect account
router.post('/create-account', async (req, res) => {
    try {
        const { email, business_type = 'individual', country = 'US' } = req.body;
        
        // Create the account
        const account = await stripe.accounts.create({
            type: 'express', // or 'standard' for more control
            country,
            email,
            business_type,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true }
            }
        });
        
        // Store account info
        connectedAccounts.set(account.id, {
            id: account.id,
            email,
            created_at: new Date().toISOString(),
            status: 'pending_onboarding'
        });
        
        res.json({
            account_id: account.id,
            email,
            status: 'created'
        });
    } catch (error) {
        console.error('Error creating Connect account:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate onboarding link
router.post('/onboarding-link', async (req, res) => {
    try {
        const { account_id, return_url = 'http://localhost:3000/connect/return', refresh_url = 'http://localhost:3000/connect/refresh' } = req.body;
        
        const accountLink = await stripe.accountLinks.create({
            account: account_id,
            refresh_url,
            return_url,
            type: 'account_onboarding'
        });
        
        res.json({
            url: accountLink.url,
            expires_at: accountLink.expires_at
        });
    } catch (error) {
        console.error('Error creating onboarding link:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get account status
router.get('/account/:id', async (req, res) => {
    try {
        const account = await stripe.accounts.retrieve(req.params.id);
        
        const status = {
            id: account.id,
            email: account.email,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            business_type: account.business_type,
            country: account.country,
            created: new Date(account.created * 1000).toISOString(),
            requirements: account.requirements
        };
        
        // Update stored status
        if (connectedAccounts.has(account.id)) {
            connectedAccounts.set(account.id, {
                ...connectedAccounts.get(account.id),
                ...status,
                status: account.charges_enabled && account.payouts_enabled ? 'active' : 'pending'
            });
        }
        
        res.json(status);
    } catch (error) {
        console.error('Error retrieving account:', error);
        res.status(500).json({ error: error.message });
    }
});

// List all connected accounts
router.get('/accounts', async (req, res) => {
    try {
        const { limit = 10, starting_after } = req.query;
        
        const accounts = await stripe.accounts.list({
            limit: parseInt(limit),
            starting_after
        });
        
        const accountsWithStatus = await Promise.all(
            accounts.data.map(async (account) => ({
                id: account.id,
                email: account.email,
                business_type: account.business_type,
                country: account.country,
                charges_enabled: account.charges_enabled,
                payouts_enabled: account.payouts_enabled,
                created: new Date(account.created * 1000).toISOString()
            }))
        );
        
        res.json({
            accounts: accountsWithStatus,
            has_more: accounts.has_more
        });
    } catch (error) {
        console.error('Error listing accounts:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create login link for Express Dashboard
router.post('/dashboard-link', async (req, res) => {
    try {
        const { account_id } = req.body;
        
        const loginLink = await stripe.accounts.createLoginLink(account_id);
        
        res.json({
            url: loginLink.url
        });
    } catch (error) {
        console.error('Error creating dashboard link:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update account information
router.patch('/account/:id', async (req, res) => {
    try {
        const { business_profile, settings, metadata } = req.body;
        
        const updateData = {};
        if (business_profile) updateData.business_profile = business_profile;
        if (settings) updateData.settings = settings;
        if (metadata) updateData.metadata = metadata;
        
        const account = await stripe.accounts.update(
            req.params.id,
            updateData
        );
        
        res.json({
            id: account.id,
            updated: true
        });
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete/reject an account
router.delete('/account/:id', async (req, res) => {
    try {
        const deleted = await stripe.accounts.del(req.params.id);
        
        // Remove from local storage
        connectedAccounts.delete(req.params.id);
        
        res.json({
            deleted: deleted.deleted,
            id: deleted.id
        });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ error: error.message });
    }
});

// Handle return from onboarding
router.get('/return', (req, res) => {
    const { account_id } = req.query;
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Onboarding Complete</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: #4CAF50; }
                button { padding: 10px 20px; margin: 10px; cursor: pointer; }
            </style>
        </head>
        <body>
            <h1 class="success">Onboarding Process Complete!</h1>
            <p>Account ID: ${account_id || 'Not provided'}</p>
            <p>Your account is being reviewed. You'll be notified once it's active.</p>
            <button onclick="checkStatus()">Check Account Status</button>
            <button onclick="window.location.href='/'">Return to Dashboard</button>
            <div id="status"></div>
            <script>
                async function checkStatus() {
                    const accountId = '${account_id || ''}';
                    if (!accountId) {
                        document.getElementById('status').innerHTML = '<p style="color:red;">No account ID available</p>';
                        return;
                    }
                    try {
                        const response = await fetch('/api/connect/account/' + accountId);
                        const data = await response.json();
                        document.getElementById('status').innerHTML = 
                            '<h3>Account Status:</h3>' +
                            '<p>Charges Enabled: ' + (data.charges_enabled ? '✅' : '❌') + '</p>' +
                            '<p>Payouts Enabled: ' + (data.payouts_enabled ? '✅' : '❌') + '</p>';
                    } catch (error) {
                        document.getElementById('status').innerHTML = '<p style="color:red;">Error checking status</p>';
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// Handle refresh during onboarding
router.get('/refresh', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Onboarding Session Expired</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .warning { color: #ff9800; }
                button { padding: 10px 20px; cursor: pointer; }
            </style>
        </head>
        <body>
            <h1 class="warning">Onboarding Session Expired</h1>
            <p>Your onboarding session has expired. Please request a new link.</p>
            <button onclick="window.location.href='/'">Return to Dashboard</button>
        </body>
        </html>
    `);
});

module.exports = router;