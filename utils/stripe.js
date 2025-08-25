const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const stripeUtils = {
    // Create Stripe Connect account
    createConnectAccount: async (email, name) => {
        try {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'US',
                email: email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true }
                },
                metadata: {
                    vendor_name: name,
                    source: 'openwrench'
                }
            });
            return account;
        } catch (error) {
            console.error('Error creating Connect account:', error);
            throw error;
        }
    },
    
    // Create account onboarding link
    createAccountLink: async (accountId) => {
        try {
            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/vendors/reauth?account_id=${accountId}`,
                return_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/vendors/return?account_id=${accountId}`,
                type: 'account_onboarding'
            });
            return accountLink;
        } catch (error) {
            console.error('Error creating account link:', error);
            throw error;
        }
    },
    
    // Get account details
    getAccountDetails: async (accountId) => {
        try {
            const account = await stripe.accounts.retrieve(accountId);
            return account;
        } catch (error) {
            console.error('Error fetching account details:', error);
            throw error;
        }
    }
};

module.exports = stripeUtils;