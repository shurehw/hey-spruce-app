# 🚀 Quick Email Setup - 5 Minutes

## What This Does
When you create a vendor, they automatically get an email with their Stripe onboarding link.

## Fastest Setup: Make.com (Recommended)

### Step 1: Create Make.com Account
1. Go to https://www.make.com
2. Sign up free (1,000 emails/month free)

### Step 2: Create Your Email Automation
1. Click **"Create a new scenario"**
2. Click the **+** button
3. Search and select **"Webhooks"**
4. Choose **"Custom webhook"**
5. Click **"Add"** and name it "Vendor Email"
6. **COPY THE WEBHOOK URL** (Important!)

### Step 3: Add Email Action
1. Click **+** after the webhook
2. Search for **"Gmail"** or **"Email"**
3. Choose **"Send an Email"**
4. Connect your email account
5. Configure the email:
   - **To:** Click the field, select `to` or `vendorEmail` from webhook data
   - **Subject:** Type: `Vendor Account Setup - ` then add `vendorName` variable
   - **Content:** 
   ```
   Hello {{vendorName}},

   Please complete your payment account setup by clicking the link below:
   
   {{onboardingUrl}}
   
   This link expires in 30 days.
   
   Thank you!
   Hey Spruce Team
   ```

### Step 4: Add to Your Project
1. Open your `.env` file
2. Add this line with YOUR webhook URL:
   ```
   MAKE_WEBHOOK_URL=https://hook.us1.make.com/YOUR_WEBHOOK_URL_HERE
   ```
3. Save the file

### Step 5: Test It!
Run this command to test:
```bash
node test-auto-email.js your-email@example.com
```

## That's It! 🎉

Now when you create a vendor:
1. ✅ Stripe account is created
2. ✅ Onboarding link is generated  
3. ✅ **Email is sent automatically**
4. ✅ Vendor clicks link to complete setup

---

## Alternative: Using Zapier

1. Go to https://zapier.com
2. Create new Zap
3. **Trigger:** Webhooks by Zapier → Catch Hook
4. **Action:** Gmail → Send Email
5. Map the fields (vendorEmail, vendorName, onboardingUrl)
6. Copy webhook URL to `.env`:
   ```
   ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/YOUR_URL
   ```

---

## Email Template Variables

Your webhook receives these variables:
- `vendorEmail` or `to` - Vendor's email address
- `vendorName` or `name` - Vendor's name
- `onboardingUrl` or `stripe_link` - The Stripe setup link

---

## Troubleshooting

**Emails not sending?**
- Check your Make.com scenario is "ON" (toggle switch)
- Verify the webhook URL in `.env` is correct
- Run `node test-auto-email.js` to test

**Need help?**
The system works without email setup - you'll get the link to share manually.