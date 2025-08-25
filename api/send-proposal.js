const nodemailer = require('nodemailer');
const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { 
        clientName, 
        clientEmail, 
        proposalData, 
        message,
        services = [],
        equipment = [],
        cleaningAreas = [],
        simpleCleaningData = null,
        proposalType = 'maintenance'
    } = req.body;

    if (!clientEmail || !clientName) {
        return res.status(400).json({ error: 'Client name and email are required' });
    }

    try {
        // Create transporter using Gmail SMTP
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER, // Your Gmail address
                pass: process.env.SMTP_PASSWORD, // App-specific password
            },
        });

        // Determine service type for title
        const serviceTypeTitle = proposalType === 'cleaning' ? 'Cleaning Services Proposal' : 
                                proposalType === 'combined' ? 'Facilities Services Proposal' :
                                'Facilities Maintenance Proposal';

        // Build proposal content
        let proposalContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; }
                .logo { height: 30px; margin-bottom: 10px; }
                .content { padding: 20px; }
                .section { margin-bottom: 30px; }
                .section h3 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; }
                .service-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #1e3a8a; }
                .equipment-item { background: #f1f5f9; padding: 10px; margin: 5px 0; border-radius: 4px; }
                .cleaning-item { background: #f8fafc; padding: 10px; margin: 5px 0; border-radius: 4px; }
                .total { background: #1e3a8a; color: white; padding: 15px; text-align: center; font-size: 18px; font-weight: bold; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; margin-top: 30px; }
                .cleaning-intro { background: #f1f5f9; padding: 20px; border-left: 4px solid #1e3a8a; margin-bottom: 30px; border-radius: 4px; }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="https://openwrench-stripe-2u0wvh9oz-shureprint.vercel.app/public/hey-spruce-logo.png" alt="Hey Spruce" class="logo">
                <h1>Hey Spruce</h1>
                <h2>${serviceTypeTitle}</h2>
            </div>
            
            <div class="content">
                ${proposalType === 'cleaning' || proposalType === 'combined' ? `
                <div class="cleaning-intro">
                    <h3>Professional Cleaning Services</h3>
                    <p>Hey Spruce delivers professional nightly cleaning services for restaurants and hotels, ensuring your venue meets the highest standards of cleanliness, safety, and efficiency. Our program covers all essential areas—from kitchen equipment and floors to dining spaces and bathrooms—so your team can focus on operations while we keep your venue spotless, safe, and ready for business each day.</p>
                </div>
                ` : ''}
                
                <div class="section">
                    <h3>Proposal Details</h3>
                    <p><strong>To:</strong> ${clientName}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Proposal Type:</strong> ${proposalType.charAt(0).toUpperCase() + proposalType.slice(1)} Services</p>
                    ${proposalData.locations ? `<p><strong>Locations:</strong> ${proposalData.locations}</p>` : ''}
                    ${proposalData.facilityType ? `<p><strong>Facility Type:</strong> ${proposalData.facilityType}</p>` : ''}
                    ${proposalData.squareFootage ? `<p><strong>Square Footage:</strong> ${proposalData.squareFootage}</p>` : ''}
                </div>
        `;

        // Add services section
        if (services && services.length > 0) {
            let totalMonthly = 0;
            proposalContent += `
                <div class="section">
                    <h3>Services & Pricing</h3>
            `;
            
            services.forEach(service => {
                totalMonthly += service.price || 0;
                proposalContent += `
                    <div class="service-item">
                        <h4>${service.name}</h4>
                        <p><strong>Frequency:</strong> ${service.frequency}</p>
                        <p><strong>Price:</strong> $${(service.price || 0).toFixed(2)}/month</p>
                        ${service.notes ? `<p><strong>Notes:</strong> ${service.notes}</p>` : ''}
                    </div>
                `;
            });
            
            proposalContent += `
                    <div class="total">
                        Total Monthly: $${totalMonthly.toFixed(2)}
                    </div>
                </div>
            `;
        }

        // Add equipment coverage
        if (equipment && equipment.length > 0) {
            proposalContent += `
                <div class="section">
                    <h3>🔧 Equipment Coverage</h3>
            `;
            equipment.forEach(eq => {
                proposalContent += `
                    <div class="equipment-item">
                        <strong>${eq.category}:</strong> ${eq.details}
                    </div>
                `;
            });
            proposalContent += '</div>';
        }

        // Add cleaning areas (detailed)
        if (cleaningAreas && cleaningAreas.length > 0) {
            proposalContent += `
                <div class="section">
                    <h3>🧹 Cleaning Areas</h3>
            `;
            cleaningAreas.forEach(area => {
                proposalContent += `
                    <div class="cleaning-item">
                        <strong>${area.area}</strong> (${area.size}) - ${area.frequency}
                    </div>
                `;
            });
            proposalContent += '</div>';
        }

        // Add simple cleaning data
        if (simpleCleaningData && simpleCleaningData.cost) {
            const priceType = simpleCleaningData.type === 'monthly' ? 'Monthly' : 'Nightly';
            proposalContent += `
                <div class="section">
                    <h3>🧹 Cleaning Services</h3>
                    <div class="cleaning-item">
                        <h4>${priceType} Service Rate</h4>
                        <p><strong>Cost:</strong> $${simpleCleaningData.cost}</p>
                        <p><strong>Frequency:</strong> ${simpleCleaningData.frequency}</p>
                        ${simpleCleaningData.times ? `<p><strong>Service Times:</strong> ${simpleCleaningData.times}</p>` : ''}
                        ${simpleCleaningData.services ? `<p><strong>Services Included:</strong> ${simpleCleaningData.services}</p>` : ''}
                    </div>
                </div>
            `;
        }

        // Add custom message
        if (message) {
            proposalContent += `
                <div class="section">
                    <h3>Additional Notes</h3>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }

        proposalContent += `
                <!-- Action Buttons -->
                <div style="text-align: center; padding: 30px 20px; background: #f8f9fa; border-top: 1px solid #e0e0e0;">
                    <h3 style="color: #333; margin-bottom: 20px;">Ready to Move Forward?</h3>
                    <div style="margin: 20px 0;">
                        <a href="https://openwrench-stripe-2u0wvh9oz-shureprint.vercel.app/proposal-response?action=approve&client=${encodeURIComponent(clientName)}&email=${encodeURIComponent(clientEmail)}" 
                           style="background: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 0 10px; display: inline-block;">
                            ✅ Approve Proposal
                        </a>
                        <a href="https://openwrench-stripe-2u0wvh9oz-shureprint.vercel.app/proposal-response?action=changes&client=${encodeURIComponent(clientName)}&email=${encodeURIComponent(clientEmail)}" 
                           style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 0 10px; display: inline-block;">
                            💬 Request Changes
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px; margin-top: 15px;">Or simply reply to this email with your questions or comments.</p>
                </div>

                <div class="footer">
                    <p>Thank you for considering Hey Spruce for your facility services!</p>
                    <p>We look forward to partnering with you to keep your facilities running smoothly.</p>
                    <p><strong>Contact us:</strong> info@heyspruce.com | 877-253-2646</p>
                </div>
            </div>
        </body>
        </html>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: clientEmail,
            subject: `Facilities Maintenance Proposal - ${clientName}`,
            html: proposalContent,
            replyTo: process.env.EMAIL_FROM
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        console.log('Email sent:', info.messageId);
        
        res.status(200).json({ 
            success: true, 
            messageId: info.messageId,
            message: `Proposal sent successfully to ${clientEmail}` 
        });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            error: 'Failed to send email', 
            details: error.message 
        });
    }
});

module.exports = router;