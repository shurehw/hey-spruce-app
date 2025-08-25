# Automatic Vendor Email Setup

When a vendor is created and their Stripe onboarding link is generated, the system automatically sends them an email notification.

## How It Works

1. **Vendor Creation** → Stripe Account Created → Onboarding Link Generated → **Email Sent Automatically**
2. The link is also copied to clipboard for manual sharing if needed
3. Vendors receive the email immediately with their onboarding instructions

## Quick Setup Options

### Option 1: Use Make.com (Recommended - Free tier available)

1. Sign up at [Make.com](https://www.make.com)
2. Create a new scenario with a Webhook trigger
3. Add an Email module (Gmail, Outlook, or SMTP)
4. Copy the webhook URL and add to `.env`:
   ```
   MAKE_WEBHOOK_URL=https://hook.us1.make.com/YOUR_WEBHOOK_ID
   ```

### Option 2: Use Zapier (Free tier: 100 tasks/month)

1. Create a Zap at [Zapier.com](https://zapier.com)
2. Trigger: Webhooks by Zapier → Catch Hook
3. Action: Gmail/Outlook → Send Email
4. Copy webhook URL to `.env`:
   ```
   ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/YOUR_ID
   ```

### Option 3: Use IFTTT (Free tier: 2 applets)

1. Sign up at [IFTTT.com](https://ifttt.com)
2. Create applet: Webhooks → Email
3. Get your key from [IFTTT Webhooks](https://ifttt.com/maker_webhooks)
4. Add to `.env`:
   ```
   IFTTT_WEBHOOK_KEY=YOUR_IFTTT_KEY
   ```

### Option 4: Use n8n (Self-hosted or cloud)

1. Set up n8n workflow with Webhook → Email node
2. Add webhook URL to `.env`:
   ```
   N8N_WEBHOOK_URL=https://your-n8n.app/webhook/YOUR_ID
   ```

### Option 5: Use EmailJS (Free tier: 200 emails/month)

1. Sign up at [EmailJS.com](https://www.emailjs.com)
2. Create email template for vendor onboarding
3. Use their API:
   ```
   EMAIL_API_URL=https://api.emailjs.com/api/v1.0/email/send
   EMAIL_API_KEY=YOUR_EMAILJS_PUBLIC_KEY
   ```

## Email Template Variables

The system sends these variables to your webhook:
- `vendorEmail` or `to` - Recipient email
- `vendorName` or `name` - Vendor's name  
- `onboardingUrl` or `stripe_link` - Stripe Connect onboarding URL
- `timestamp` - When vendor was created

## Testing

1. Create a test vendor:
```bash
curl -X POST http://localhost:3000/api/vendors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Vendor",
    "email": "vendor@example.com",
    "phone": "555-0123"
  }'
```

2. Check the response for:
   - `email_notification.sent` - Whether email was sent
   - `email_notification.method` - Which service was used
   - `onboarding_url` - The Stripe link (also in clipboard)

## What Happens Automatically

✅ When vendor is created:
1. Stripe Connect account created
2. Onboarding link generated  
3. **Email sent automatically** to vendor
4. Link copied to clipboard as backup
5. Vendor can click link in email to complete setup

✅ The vendor receives:
- Professional email with their name
- Secure onboarding link
- Instructions to complete setup
- 30-day expiration notice

## Fallback Behavior

If no email service is configured:
- The API still returns the onboarding URL
- The link is available in the response
- You can manually share it with the vendor
- Configure any webhook service above to enable automatic emails

## API Endpoints

- `POST /api/vendors` - Creates vendor and sends email automatically
- `GET /api/vendors/:id` - Get vendor with Stripe status
- `POST /api/vendors/:id/resend-email` - Resend onboarding email

## Response Example

```json
{
  "success": true,
  "vendor": {
    "id": 1,
    "name": "John's Restaurant",
    "email": "john@restaurant.com"
  },
  "onboarding_url": "https://connect.stripe.com/setup/...",
  "email_notification": {
    "sent": true,
    "method": "make_webhook",
    "message": "✅ Email automatically sent to john@restaurant.com"
  },
  "actions_taken": [
    "✅ Vendor created in system",
    "✅ Stripe Connect account created",
    "✅ Onboarding link generated",
    "✅ Email sent automatically",
    "✅ Link copied to clipboard (ready to paste)"
  ]
}
```