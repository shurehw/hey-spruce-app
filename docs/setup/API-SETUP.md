# Spruce App API Configuration

## Current Issue
The Spruce App API endpoint is not accessible. The system is falling back to demo data.

## How to Fix

### Option 1: Update the API URL in `.env`
Edit the `.env` file and update `SPRUCE_API_URL` with the correct URL:

```
SPRUCE_API_URL=https://your-actual-api-url.com
```

Common patterns to try:
- `https://app.heyspruce.com/api`
- `https://api.heyspruce.com`
- `https://api.yourdomain.com`
- `http://localhost:PORT` (if running locally)

### Option 2: Check with Spruce App Support
Contact Spruce App to get:
1. The correct API endpoint URL
2. Verify your API credentials are correct
3. Check if your IP needs to be whitelisted

### Option 3: Deploy Environment Variables
If deploying to Vercel, set the environment variable:

```bash
vercel env add OPENWRENCH_API_URL
# Enter the correct API URL when prompted
```

## Current Credentials in Use
- API Key: `eXlC64sUdDwb6NBKl9cq`
- OW Key: `cBhff$DRuC#fmUQNkw2qyBZ&89uh%&vm6Ftr4rDyq!w3$`

## Testing the API
Once you have the correct URL, test it with:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "X-OW-Key: YOUR_OW_KEY" \
     https://YOUR_API_URL/v1/invoices
```

## Demo Mode
While the API is not connected, the system works with demo data:
- Demo invoices are shown
- Demo vendors are displayed
- All Stripe payment features work normally
- Emails will attempt to send via OpenWrench but fall back to SendGrid/SMTP

## Features Working in Demo Mode
✅ Payment link creation
✅ Vendor management
✅ Stripe Connect onboarding
✅ Payment splits
✅ Logo management
✅ Email sending (with fallback)

## What Needs the Real API
❌ Real invoice data from OpenWrench
❌ Real vendor data from OpenWrench
❌ Syncing data back to OpenWrench
❌ OpenWrench email sending

Once you have the correct API URL, update `.env` and redeploy to connect to real data.