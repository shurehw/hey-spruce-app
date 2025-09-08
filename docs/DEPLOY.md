# Deployment Guide for Vercel

## Prerequisites

1. Vercel CLI is installed (already done)
2. A Vercel account (sign up at https://vercel.com)
3. Your environment variables ready

## Deployment Steps

### 1. Login to Vercel

```bash
vercel login
```

### 2. Deploy to Vercel

Run this command in the project directory:

```bash
vercel
```

Follow the prompts:
- Confirm the project path
- Link to existing project or create new
- Choose project name (e.g., "openwrench-stripe")


### 3. Set Environment Variables

After first deployment, set your environment variables:

```bash
# Set each variable
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add OPENWRENCH_API_KEY
vercel env add OPENWRENCH_KEY
vercel env add OPENWRENCH_API_URL
```

Or set them in the Vercel Dashboard:
1. Go to your project on vercel.com
2. Navigate to Settings → Environment Variables
3. Add each variable from your .env file

### 4. Deploy with Environment Variables

```bash
vercel --prod
```

## Post-Deployment Setup

### 1. Update Stripe Webhook

In your Stripe Dashboard:
1. Go to Developers → Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
3. Select events to listen for:
   - payment_intent.succeeded
   - invoice.payment_succeeded
   - checkout.session.completed
   - account.updated (for Connect)

### 2. Update Connect URLs

Update your Connect return and refresh URLs:
- Return URL: `https://your-app.vercel.app/api/connect/return`
- Refresh URL: `https://your-app.vercel.app/api/connect/refresh`

### 3. Test Your Deployment

Visit your deployed app:
- Main dashboard: `https://your-app.vercel.app`
- Connect management: `https://your-app.vercel.app/connect.html`
- API health: `https://your-app.vercel.app/api/health`

## Important Notes

### For Production

⚠️ **HTTPS is Required**: Vercel provides HTTPS by default, which is required for:
- Stripe Connect onboarding
- Secure payment processing
- Webhook endpoints

### Environment Variables

Make sure to use:
- **Test keys** for staging/development deployments
- **Live keys** only for production deployment

### Custom Domain

To add a custom domain:
```bash
vercel domains add your-domain.com
```

## Quick Redeploy

After making changes:

```bash
git add .
git commit -m "Update message"
vercel --prod
```

## Troubleshooting

### Check Logs
```bash
vercel logs
```

### Check Environment Variables
```bash
vercel env ls
```

### Remove and Redeploy
```bash
vercel rm openwrench-stripe
vercel --prod
```

## Support

- Vercel Docs: https://vercel.com/docs
- Stripe Docs: https://stripe.com/docs
- Project issues: Check the README.md