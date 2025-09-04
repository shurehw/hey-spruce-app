const nodemailer = require('nodemailer');

// Email configuration - Use SSL for Gmail
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD // This should be an App Password
    }
});

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { firstName, lastName, email, role, clientPortalAccess, inviteUrl } = req.body;
    
    try {
        // Email HTML template with Hey Spruce branding
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; background: white; }
                    .header { background: #1e3a5f; color: white; padding: 40px 20px; text-align: center; }
                    .logo-circle { width: 120px; height: 120px; background: #1e3a5f; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; border: 4px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
                    .logo-text { font-family: 'Brush Script MT', cursive, 'Segoe Script', 'Lucida Handwriting', sans-serif; font-size: 28px; color: white; text-align: center; line-height: 1.2; font-weight: normal; }
                    .content { padding: 40px 30px; background-color: #ffffff; }
                    .button { display: inline-block; padding: 14px 32px; background: #1e3a5f; color: white; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; font-size: 16px; transition: all 0.3s ease; }
                    .button:hover { background: #2a4d7a; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(30,58,95,0.3); }
                    .footer { text-align: center; padding: 30px 20px; color: #666; font-size: 12px; background-color: #f8f9fa; }
                    h2 { color: #1e3a5f; margin-bottom: 20px; }
                    p { margin: 15px 0; color: #555; }
                    .feature-list { color: #555; text-align: left; max-width: 400px; margin: 20px auto; }
                    .feature-list li { margin: 8px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo-circle">
                            <div class="logo-text">Hey<br>Spruce</div>
                        </div>
                        <h1 style="margin: 0; font-size: 24px; font-weight: 300;">Welcome to the Spruce Portal</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${firstName} ${lastName},</h2>
                        <p>You've been invited to join the Hey Spruce Supplier Portal as a <strong>${role}</strong>.</p>
                        <p>Click the button below to set up your account and get started:</p>
                        <center>
                            <a href="${inviteUrl}" class="button">Accept Invitation</a>
                        </center>
                        <p>Once you accept, you'll have access to:</p>
                        <ul class="feature-list">
                            <li>Manage work orders and service requests</li>
                            <li>Track equipment and maintenance schedules</li>
                            <li>Submit proposals and invoices</li>
                            <li>Communicate with the Hey Spruce team</li>
                        </ul>
                        ${clientPortalAccess ? '<p><strong>Note:</strong> You will also have access to the client portal.</p>' : ''}
                        <p>If you have any questions, please contact us at <a href="tel:877-253-2646" style="color: #1e3a5f; font-weight: 600;">877-253-2646</a></p>
                    </div>
                    <div class="footer">
                        <p style="margin: 5px 0;"><strong>Hey Spruce</strong></p>
                        <p style="margin: 5px 0;">Property Maintenance Solutions</p>
                        <p style="margin: 15px 0; color: #999;">&copy; 2024 Hey Spruce. All rights reserved.</p>
                        <p style="margin: 5px 0; color: #999; font-size: 11px;">If you didn't expect this invitation, please ignore this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@heyspruce.com',
            to: email,
            subject: 'Invitation to Join Hey Spruce Supplier Portal',
            html: htmlContent
        };
        
        // Check if email is properly configured
        if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            console.log('Email would be sent to:', email);
            console.log('Invite URL:', inviteUrl);
            return res.json({ success: true, message: 'Invite logged (email not configured)' });
        }
        
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to:', email);
        res.json({ success: true, message: 'Invitation email sent successfully' });
        
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send invitation email', details: error.message });
    }
};