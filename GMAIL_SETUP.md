# 📧 Gmail Setup for Automatic Vendor Emails

## Quick Setup (5 minutes)

### Step 1: Get Your Gmail App Password

1. **Enable 2-Factor Authentication** (if not already enabled)
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow the setup

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Sign in if needed
   - Select app: **Mail**
   - Select device: **Other** (type "OpenWrench")
   - Click **Generate**
   - **COPY THE 16-CHARACTER PASSWORD**

### Step 2: Update Your .env File

Replace these lines in your `.env` file:

```env
# Gmail Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=your-email@gmail.com
```

**Example with real values:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=john@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=john@gmail.com
```

### Step 3: Test It!

Run this command to test:
```bash
node test-email.js your-email@example.com
```

You should see:
```
✅ Email sent successfully!
   Method: smtp
```

## What Happens Now

When you create a vendor:
1. ✅ Vendor is created in the system
2. ✅ Stripe Connect account is created
3. ✅ **Email is sent from your Gmail** with the onboarding link
4. ✅ Vendor receives professional email with setup instructions

## Email Template

The vendor receives a professional HTML email with:
- Their name
- Company branding (Hey Spruce)
- Stripe onboarding link (button)
- Instructions to complete setup
- 30-day expiration notice
- Contact information

## Troubleshooting

### "Invalid credentials" error?
- Make sure you're using the **App Password**, not your regular Gmail password
- The app password is 16 characters (like: abcd efgh ijkl mnop)
- Spaces in the password don't matter

### "Less secure app" error?
- You MUST use an App Password (not your regular password)
- 2-Factor Authentication must be enabled

### Not receiving emails?
- Check spam folder
- Verify the email address is correct
- Try sending to a different email address
- Check Gmail's sending limits (500 emails/day)

## Gmail Sending Limits
- **500 emails per day** (free Gmail)
- **2000 emails per day** (Google Workspace)
- More than enough for vendor onboarding!

## Security Notes
- App passwords are secure and can be revoked anytime
- Only gives access to send emails (not read)
- Can be managed at: https://myaccount.google.com/apppasswords

## Alternative: Use Gmail via Make.com
If you prefer not to use app passwords, you can use Gmail through Make.com:
1. Set up Make.com webhook (see QUICK_EMAIL_SETUP.md)
2. Connect your Gmail account to Make.com
3. Make.com handles the authentication for you

---

That's it! Your vendor emails now send automatically from your Gmail account.