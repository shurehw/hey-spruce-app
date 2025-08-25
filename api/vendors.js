const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const stripeUtils = require('../utils/stripe');
const { upload } = require('../utils/upload');
const { sendEmail, emailTemplates } = require('./email-service');
const axios = require('axios');

// Send email via OpenWrench API
async function sendVendorEmailViaOpenWrench(vendorEmail, vendorName, onboardingUrl) {
    try {
        // Generate email content using existing template
        const emailContent = emailTemplates.vendorInvite({
            vendorName: vendorName,
            companyName: process.env.COMPANY_NAME || 'Hey Spruce',
            onboardingUrl: onboardingUrl,
            contactPhone: process.env.CONTACT_PHONE || '877-253-2646'
        });

        const emailPayload = {
            to: vendorEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            from: process.env.EMAIL_FROM || 'noreply@heyspruce.com',
            type: 'vendor_invite'
        };

        const response = await axios.post(
            `${process.env.OPENWRENCH_API_URL}/api/external/v1/emails/send`,
            emailPayload,
            {
                headers: {
                    'X-API-KEY': process.env.OPENWRENCH_API_KEY,
                    'OW-KEY': process.env.OPENWRENCH_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        return { success: true, method: 'openwrench', data: response.data };
    } catch (error) {
        console.error('OpenWrench email error:', error.response?.data || error.message);
        
        // Fallback to direct email service if OpenWrench fails
        const fallbackResult = await sendEmail(vendorEmail, 'vendorInvite', {
            vendorName: vendorName,
            companyName: process.env.COMPANY_NAME || 'Hey Spruce',
            onboardingUrl: onboardingUrl,
            contactPhone: process.env.CONTACT_PHONE || '877-253-2646'
        });
        
        return fallbackResult;
    }
}

// Get all vendors
router.get('/', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM vendors ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
});

// Get single vendor
router.get('/:id', async (req, res) => {
    try {
        const vendor = await db.getVendor(req.params.id);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        
        // Get vendor's invoice splits
        const { rows: splits } = await db.query(
            'SELECT * FROM invoice_splits WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 10',
            [req.params.id]
        );
        
        res.json({
            ...vendor,
            recent_splits: splits
        });
    } catch (error) {
        console.error('Error fetching vendor:', error);
        res.status(500).json({ error: 'Failed to fetch vendor' });
    }
});

// Create new vendor
router.post('/', async (req, res) => {
    try {
        const { name, email, default_split_percentage = 70 } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }
        
        // Check if vendor already exists
        const { rows: existing } = await db.query(
            'SELECT id FROM vendors WHERE email = $1',
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Vendor with this email already exists' });
        }
        
        // Create Stripe Connect account
        const stripeAccount = await stripeUtils.createConnectAccount(email, name);
        
        // Save vendor to database
        const { rows } = await db.query(
            `INSERT INTO vendors (name, email, stripe_account_id, default_split_percentage)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [name, email, stripeAccount.id, default_split_percentage]
        );
        
        // Create onboarding link
        const accountLink = await stripeUtils.createAccountLink(stripeAccount.id);
        
        // Send email to vendor with onboarding link via OpenWrench
        const emailResult = await sendVendorEmailViaOpenWrench(email, name, accountLink.url);
        
        if (!emailResult.success) {
            console.error('Failed to send vendor invite email:', emailResult.error);
        }
        
        res.json({
            vendor: rows[0],
            onboarding_url: accountLink.url,
            email_sent: emailResult.success,
            email_method: emailResult.method || 'none'
        });
    } catch (error) {
        console.error('Error creating vendor:', error);
        res.status(500).json({ error: 'Failed to create vendor' });
    }
});

// Update vendor
router.patch('/:id', async (req, res) => {
    try {
        const { name, email, default_split_percentage, is_active } = req.body;
        const updates = [];
        const values = [];
        let paramCount = 0;
        
        if (name !== undefined) {
            paramCount++;
            updates.push(`name = $${paramCount}`);
            values.push(name);
        }
        
        if (email !== undefined) {
            paramCount++;
            updates.push(`email = $${paramCount}`);
            values.push(email);
        }
        
        if (default_split_percentage !== undefined) {
            paramCount++;
            updates.push(`default_split_percentage = $${paramCount}`);
            values.push(default_split_percentage);
        }
        
        if (is_active !== undefined) {
            paramCount++;
            updates.push(`is_active = $${paramCount}`);
            values.push(is_active);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }
        
        paramCount++;
        values.push(req.params.id);
        
        const { rows } = await db.query(
            `UPDATE vendors SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $${paramCount} RETURNING *`,
            values
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error updating vendor:', error);
        res.status(500).json({ error: 'Failed to update vendor' });
    }
});

// Upload vendor logo
router.post('/:id/logo', upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const vendorId = req.params.id;
        const logoUrl = `/uploads/${req.file.filename}`;
        
        // Update vendor with logo URL
        const { rows: vendorRows } = await db.query(
            'UPDATE vendors SET logo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [logoUrl, vendorId]
        );
        
        if (vendorRows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        
        // Save logo record
        await db.query(
            'INSERT INTO vendor_logos (vendor_id, filename, url) VALUES ($1, $2, $3)',
            [vendorId, req.file.filename, logoUrl]
        );
        
        res.json({
            vendor: vendorRows[0],
            logo_url: logoUrl
        });
    } catch (error) {
        console.error('Error uploading logo:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});

// Get vendor's Stripe account status
router.get('/:id/stripe-status', async (req, res) => {
    try {
        const vendor = await db.getVendor(req.params.id);
        if (!vendor || !vendor.stripe_account_id) {
            return res.status(404).json({ error: 'Vendor not found or not connected to Stripe' });
        }
        
        const account = await stripeUtils.getAccountDetails(vendor.stripe_account_id);
        
        res.json({
            charges_enabled: account.charges_enabled,
            details_submitted: account.details_submitted,
            payouts_enabled: account.payouts_enabled,
            requirements: account.requirements,
            capabilities: account.capabilities
        });
    } catch (error) {
        console.error('Error fetching Stripe status:', error);
        res.status(500).json({ error: 'Failed to fetch Stripe status' });
    }
});

// Generate new onboarding link
router.post('/:id/onboarding-link', async (req, res) => {
    try {
        const vendor = await db.getVendor(req.params.id);
        if (!vendor || !vendor.stripe_account_id) {
            return res.status(404).json({ error: 'Vendor not found or not connected to Stripe' });
        }
        
        const accountLink = await stripeUtils.createAccountLink(vendor.stripe_account_id);
        
        res.json({
            onboarding_url: accountLink.url
        });
    } catch (error) {
        console.error('Error generating onboarding link:', error);
        res.status(500).json({ error: 'Failed to generate onboarding link' });
    }
});

// Resend vendor invite email
router.post('/:id/resend-invite', async (req, res) => {
    try {
        const vendor = await db.getVendor(req.params.id);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        
        // Generate new onboarding link if Stripe account exists
        let onboardingUrl = '';
        if (vendor.stripe_account_id) {
            const accountLink = await stripeUtils.createAccountLink(vendor.stripe_account_id);
            onboardingUrl = accountLink.url;
        }
        
        // Send email to vendor via OpenWrench
        const emailResult = await sendVendorEmailViaOpenWrench(vendor.email, vendor.name, onboardingUrl);
        
        if (!emailResult.success) {
            return res.status(500).json({ 
                error: 'Failed to send email', 
                details: emailResult.error 
            });
        }
        
        res.json({
            success: true,
            message: 'Vendor invite email sent successfully',
            email_sent_to: vendor.email,
            onboarding_url: onboardingUrl,
            email_method: emailResult.method
        });
    } catch (error) {
        console.error('Error resending vendor invite:', error);
        res.status(500).json({ error: 'Failed to resend vendor invite' });
    }
});

// Stripe Connect return URL
router.get('/return', async (req, res) => {
    const { account_id } = req.query;
    
    try {
        if (account_id) {
            // Update vendor status if needed
            const account = await stripeUtils.getAccountDetails(account_id);
            
            // Redirect to dashboard with success message
            res.redirect(`/?status=onboarding_complete&account=${account_id}`);
        } else {
            res.redirect('/?status=onboarding_incomplete');
        }
    } catch (error) {
        console.error('Error handling Stripe return:', error);
        res.redirect('/?status=error');
    }
});

// Stripe Connect reauth URL
router.get('/reauth', async (req, res) => {
    const { account_id } = req.query;
    
    try {
        if (account_id) {
            const accountLink = await stripeUtils.createAccountLink(account_id);
            res.redirect(accountLink.url);
        } else {
            res.redirect('/?status=reauth_failed');
        }
    } catch (error) {
        console.error('Error handling reauth:', error);
        res.redirect('/?status=error');
    }
});

// Get vendor analytics
router.get('/:id/analytics', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const vendorId = req.params.id;
        
        let query = `
            SELECT 
                COUNT(*) as total_invoices,
                SUM(total_amount) as total_processed,
                SUM(vendor_amount) as total_earnings,
                SUM(platform_amount) as total_fees_paid,
                AVG(split_percentage) as average_split,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments
            FROM invoice_splits
            WHERE vendor_id = $1
        `;
        
        const params = [vendorId];
        
        if (start_date) {
            params.push(start_date);
            query += ` AND created_at >= $${params.length}`;
        }
        
        if (end_date) {
            params.push(end_date);
            query += ` AND created_at <= $${params.length}`;
        }
        
        const { rows } = await db.query(query, params);
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching vendor analytics:', error);
        res.status(500).json({ error: 'Failed to fetch vendor analytics' });
    }
});

module.exports = router;