# Stripe Webhook Setup

## Configure Stripe to Send Payment Events

### 1. Go to Stripe Dashboard
Visit: https://dashboard.stripe.com/webhooks

### 2. Add Webhook Endpoint
Click "Add endpoint" and enter:
- **Endpoint URL**: `https://openwrench-stripe.vercel.app/api/webhooks/stripe`
- **Description**: OpenWrench Payment Updates

### 3. Select Events to Listen For
Select these events:
- `payment_intent.succeeded` ✅
- `payment_intent.payment_failed` ✅
- `checkout.session.completed` ✅
- `charge.succeeded` ✅
- `transfer.created` ✅
- `account.updated` ✅

### 4. Copy Webhook Secret
After creating, you'll see a "Signing secret" that looks like:
`whsec_xxxxxxxxxxxxx`

### 5. Update Environment Variable
Add to Vercel:
```bash
vercel env rm STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_WEBHOOK_SECRET
# Paste the webhook secret when prompted
```

Or update in `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

## What Happens Now

### When Payment Succeeds:
1. Stripe sends webhook to your app
2. App verifies the webhook signature
3. Invoice status updated to "paid" in OpenWrench
4. Payment recorded in history
5. Platform fees calculated
6. Vendor payout tracked

### Dashboard Features:
- **Real-time updates** when payments complete
- **Automatic reconciliation** with OpenWrench
- **Payment history** with full details
- **Vendor payout tracking**

## Testing Webhooks Locally

For local testing, use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook secret shown and use it in your `.env` file.

## Verify It's Working

1. Create a test payment link
2. Complete the payment
3. Check the Analytics Dashboard
4. Verify invoice status updated in OpenWrench

## Troubleshooting

If webhooks aren't working:
1. Check webhook secret is correct
2. Verify endpoint URL is accessible
3. Check Stripe Dashboard > Webhooks > View logs
4. Ensure events are selected in Stripe

The webhook handler will gracefully handle any errors and continue processing other events.