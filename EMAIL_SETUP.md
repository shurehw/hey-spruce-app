# Email Setup for Vendor Notifications

This system now automatically sends email notifications to vendors when they are added to OpenWrench.

## Features Added

1. **Automatic Email on Vendor Creation**: When a new vendor is added via the POST `/api/vendors` endpoint, they automatically receive an email with their Stripe onboarding link.

2. **Resend Invite Functionality**: Use POST `/api/vendors/:id/resend-invite` to resend the invitation email to any vendor.

3. **Email Templates**: Professional HTML email templates for vendor invitations that include:
   - Company branding
   - Clear call-to-action button
   - Stripe onboarding link
   - Contact information
   - Mobile-responsive design

## Configuration

### Option 1: SendGrid (Recommended)

1. Sign up for a SendGrid account at https://sendgrid.com
2. Create an API key in SendGrid dashboard
3. Add to your `.env` file:
   ```
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   ```

### Option 2: SMTP (Gmail, Outlook, etc.)

1. Configure SMTP settings in your `.env` file:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_app_password
   ```

   **For Gmail:**
   - Enable 2-factor authentication
   - Generate an app-specific password at https://myaccount.google.com/apppasswords
   - Use the app password (not your regular password) for SMTP_PASSWORD

### Additional Settings

Configure these in your `.env` file to customize emails:
```
EMAIL_FROM=noreply@yourdomain.com
COMPANY_NAME=Your Company Name
CONTACT_PHONE=Your Contact Number
```

## Testing

Test your email configuration:
```bash
# Test email template generation (no actual send)
node test-email.js

# Test sending to a real email address
node test-email.js your-email@example.com
```

## API Endpoints

### Create Vendor with Auto-Email
```
POST /api/vendors
{
  "name": "Vendor Name",
  "email": "vendor@example.com",
  "default_split_percentage": 70
}
```
Response includes:
- `email_sent`: boolean indicating if email was sent
- `email_method`: method used (sendgrid/smtp/none)
- `onboarding_url`: Stripe Connect onboarding link

### Resend Vendor Invitation
```
POST /api/vendors/:vendor_id/resend-invite
```
Generates a new Stripe onboarding link and emails it to the vendor.

## How It Works

1. **Vendor Creation Flow**:
   - New vendor is created in database
   - Stripe Connect account is created
   - Onboarding link is generated
   - Email is automatically sent with the link
   - Vendor clicks link to complete Stripe setup

2. **Email Fallback**:
   - If email service is not configured, the system still works
   - The onboarding URL is returned in the API response
   - You can manually share the link with vendors

## Troubleshooting

- **Emails not sending**: Check your `.env` configuration and test with `node test-email.js`
- **Invalid API key**: Verify your SendGrid API key or SMTP credentials
- **Emails going to spam**: Use a verified sender domain and proper SPF/DKIM records
- **Rate limiting**: SendGrid free tier allows 100 emails/day

## Security Notes

- Never commit `.env` file with real API keys
- Use environment variables in production
- Stripe onboarding links expire after 30 days
- Each link can only be used once