# Environment Setup Guide for Hey Spruce Portal

## Required Environment Variables

### 1. Supabase Configuration (REQUIRED)
Get these from your Supabase project dashboard at https://supabase.com

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Where to find them:**
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api
2. Copy the **Project URL** → `SUPABASE_URL`
3. Copy the **anon public** key → `SUPABASE_ANON_KEY`
4. Copy the **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### 2. Optional Services

#### Stripe (for payments)
```
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
```

#### SendGrid (for emails)
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
EMAIL_FROM=noreply@heyspruce.com
```

## How to Add to Vercel

1. Go to https://vercel.com/dashboard
2. Select your project: **openwrench-portal**
3. Go to **Settings** tab
4. Click **Environment Variables** in the left sidebar
5. Add each variable:
   - **Key**: Variable name (e.g., `SUPABASE_URL`)
   - **Value**: Your actual value
   - **Environment**: Select all (Production, Preview, Development)
6. Click **Save** for each variable
7. **IMPORTANT**: After adding all variables, you must **redeploy**:
   - Go to **Deployments** tab
   - Click the three dots on your latest deployment
   - Select **Redeploy**

## Testing the Setup

After redeploying, test these endpoints:
- API Health: https://openwrench-portal.vercel.app/api/health
- Main API: https://openwrench-portal.vercel.app/api/main

## Demo Accounts
Once Supabase is connected, these accounts will work:
- Client: demo.client@heyspruce.com / demo123
- Admin: demo.admin@heyspruce.com / demo123
- Subcontractor: demo.sub@heyspruce.com / demo123