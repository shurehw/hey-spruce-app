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
        // Email HTML template
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
                    .content { padding: 30px; background-color: #f9f9f9; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to OpenWrench</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${firstName} ${lastName},</h2>
                        <p>You've been invited to join OpenWrench as a <strong>${role}</strong>.</p>
                        <p>Click the button below to set up your account and get started:</p>
                        <center>
                            <a href="${inviteUrl}" class="button">Accept Invitation</a>
                        </center>
                        <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
                        ${clientPortalAccess ? '<p><strong>Note:</strong> You will also have access to the client portal.</p>' : ''}
                    </div>
                    <div class="footer">
                        <p>&copy; 2024 OpenWrench. All rights reserved.</p>
                        <p>If you didn't expect this invitation, please ignore this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@openwrench.com',
            to: email,
            subject: 'Invitation to Join OpenWrench Team',
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