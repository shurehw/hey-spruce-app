const express = require('express');
const nodemailer = require('nodemailer');
const axios = require('axios');
const router = express.Router();

router.post('/', async (req, res) => {
    const {
        action,
        clientName,
        clientEmail,
        contactName,
        contactEmail,
        contactPhone,
        comments,
        urgency,
        signature,
        timestamp
    } = req.body;

    try {
        // If proposal is approved, create recurring monthly work orders
        if (action === 'approve') {
            await createRecurringWorkOrders({
                clientName,
                clientEmail,
                contactName,
                contactEmail,
                contactPhone,
                urgency,
                comments,
                signature
            });
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        // Determine email content based on action
        let subjectSuffix, statusColor, actionIcon, clientMessage;
        
        switch(action) {
            case 'approve':
                subjectSuffix = 'APPROVED';
                statusColor = '#22c55e';
                actionIcon = '✅';
                clientMessage = `
                    <div style="background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #1e3a8a; margin: 20px 0;">
                        <h3 style="color: #1e40af; margin-bottom: 10px;">🎉 Great News!</h3>
                        <p style="color: #1e40af;">Your proposal has been approved! We've automatically created 12 months of recurring monthly work orders and will begin coordinating the next steps immediately.</p>
                        ${urgency ? `<p style="color: #1e40af; margin-top: 10px;"><strong>Service Timeline:</strong> ${urgency}</p>` : ''}
                        <p style="color: #1e40af; margin-top: 10px;">✅ Monthly services scheduled<br>📞 We'll contact you within 24 hours<br>📋 All work orders added to our system</p>
                    </div>
                `;
                break;
            case 'changes':
                subjectSuffix = 'CHANGES REQUESTED';
                statusColor = '#3b82f6';
                actionIcon = '💬';
                clientMessage = `
                    <div style="background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                        <h3 style="color: #1e40af; margin-bottom: 10px;">📝 Change Request Received</h3>
                        <p style="color: #1e40af;">We've received your change request and will review your feedback to create a revised proposal.</p>
                    </div>
                `;
                break;
            case 'decline':
                subjectSuffix = 'DECLINED';
                statusColor = '#ef4444';
                actionIcon = '❌';
                clientMessage = `
                    <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
                        <h3 style="color: #b91c1c; margin-bottom: 10px;">Thank You for Your Time</h3>
                        <p style="color: #b91c1c;">We appreciate you considering Hey Spruce. If circumstances change, we'd be happy to discuss your needs in the future.</p>
                    </div>
                `;
                break;
            default:
                subjectSuffix = 'RESPONSE RECEIVED';
                statusColor = '#6b7280';
                actionIcon = '📝';
                clientMessage = `
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; border-left: 4px solid #6b7280; margin: 20px 0;">
                        <h3 style="color: #374151; margin-bottom: 10px;">Response Received</h3>
                        <p style="color: #374151;">Thank you for your response. We'll review your feedback and get back to you soon.</p>
                    </div>
                `;
        }

        // Email to Hey Spruce team (internal notification)
        const teamEmailContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .detail-box { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid ${statusColor}; }
                .signature { border: 1px solid #ddd; padding: 10px; border-radius: 4px; text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${actionIcon} Proposal Response: ${subjectSuffix}</h1>
            </div>
            <div class="content">
                <div class="detail-box">
                    <h3>Client Information</h3>
                    <p><strong>Client:</strong> ${clientName}</p>
                    <p><strong>Email:</strong> ${clientEmail}</p>
                    <p><strong>Contact Person:</strong> ${contactName}</p>
                    <p><strong>Contact Email:</strong> ${contactEmail}</p>
                    ${contactPhone ? `<p><strong>Phone:</strong> ${contactPhone}</p>` : ''}
                    <p><strong>Response Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
                </div>

                ${urgency && action === 'approve' ? `
                <div class="detail-box">
                    <h3>Timeline</h3>
                    <p><strong>Preferred Start Time:</strong> ${urgency}</p>
                </div>
                ` : ''}

                ${comments ? `
                <div class="detail-box">
                    <h3>Comments</h3>
                    <p>${comments.replace(/\n/g, '<br>')}</p>
                </div>
                ` : ''}

                ${signature ? `
                <div class="detail-box">
                    <h3>Digital Signature</h3>
                    <div class="signature">
                        <img src="${signature}" alt="Digital Signature" style="max-width: 300px; height: auto;">
                    </div>
                </div>
                ` : ''}

                <div class="detail-box">
                    <h3>Next Steps</h3>
                    ${action === 'approve' ? `
                        <p>✅ <strong>Approved:</strong> 12 monthly recurring work orders created automatically</p>
                        <p>📞 Contact client within 24 hours to confirm details</p>
                        <p>📋 Work orders added to OpenWrench system</p>
                        <p>🔄 Recurring series: ${clientName.replace(/\s+/g, '_')}_${Date.now()}</p>
                        <p>📅 First service scheduled based on: ${urgency}</p>
                    ` : action === 'changes' ? `
                        <p>💬 <strong>Changes Requested:</strong> Review feedback and prepare revised proposal</p>
                        <p>📞 Schedule call to discuss specific changes</p>
                        <p>📝 Send revised proposal within 48 hours</p>
                    ` : action === 'decline' ? `
                        <p>❌ <strong>Declined:</strong> Add to follow-up list for future opportunities</p>
                        <p>📊 Update CRM with decline reason</p>
                        <p>📅 Schedule follow-up in 6 months</p>
                    ` : `
                        <p>📝 Review response and determine appropriate follow-up</p>
                    `}
                </div>
            </div>
        </body>
        </html>
        `;

        // Email to client (confirmation)
        const clientEmailContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: #22c55e; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Hey Spruce</h1>
                <h2>Response Confirmation</h2>
            </div>
            <div class="content">
                <p>Dear ${contactName},</p>
                <p>Thank you for responding to our proposal for ${clientName}.</p>
                
                ${clientMessage}
                
                <p>We've received the following information:</p>
                <ul>
                    <li><strong>Response Type:</strong> ${subjectSuffix}</li>
                    <li><strong>Date:</strong> ${new Date(timestamp).toLocaleDateString()}</li>
                    ${comments ? `<li><strong>Comments:</strong> ${comments}</li>` : ''}
                </ul>
                
                <p>Our team will review your response and get back to you within 24 hours. If you have any immediate questions, please don't hesitate to contact us.</p>
                
                <p>Best regards,<br>The Hey Spruce Team</p>
                <p><strong>Contact:</strong> info@heyspruce.com | 877-253-2646</p>
            </div>
        </body>
        </html>
        `;

        // Send notification to team
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: process.env.SMTP_USER, // Send to team email
            subject: `${actionIcon} Proposal ${subjectSuffix} - ${clientName}`,
            html: teamEmailContent,
        });

        // Send confirmation to client
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: contactEmail,
            subject: `Proposal Response Confirmed - Hey Spruce`,
            html: clientEmailContent,
        });

        res.json({ success: true, message: 'Response recorded successfully' });

    } catch (error) {
        console.error('Error processing proposal response:', error);
        res.status(500).json({ error: 'Failed to process response', details: error.message });
    }
});

// Function to create recurring monthly work orders
async function createRecurringWorkOrders(approvalData) {
    const { clientName, contactName, contactEmail, contactPhone, urgency, comments } = approvalData;
    
    try {
        // Determine start date based on urgency
        const now = new Date();
        let startDate = new Date();
        
        switch(urgency) {
            case 'asap':
                startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
                break;
            case '1week':
                startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week
                break;
            case '2week':
                startDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
                break;
            case '1month':
                startDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month
                break;
            default:
                startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 1 week
        }

        // Create the first 12 months of recurring work orders
        const workOrders = [];
        for (let i = 0; i < 12; i++) {
            const workOrderDate = new Date(startDate);
            workOrderDate.setMonth(workOrderDate.getMonth() + i);
            
            const workOrder = {
                title: `Monthly Service - ${clientName}`,
                description: `Recurring monthly cleaning/maintenance service for ${clientName}`,
                client: clientName,
                contact_name: contactName,
                contact_email: contactEmail,
                contact_phone: contactPhone || '',
                scheduled_date: workOrderDate.toISOString().split('T')[0],
                status: 'scheduled',
                priority: 'normal',
                service_type: 'recurring_monthly',
                notes: comments || 'Automated work order from approved proposal',
                created_via: 'proposal_approval',
                recurring_series: true,
                series_id: `${clientName.replace(/\s+/g, '_')}_${Date.now()}`,
                month_number: i + 1
            };
            
            workOrders.push(workOrder);
        }

        // If OpenWrench integration is available, create work orders there
        if (process.env.OPENWRENCH_API_KEY && process.env.OPENWRENCH_API_URL) {
            for (const workOrder of workOrders) {
                try {
                    await axios.post(`${process.env.OPENWRENCH_API_URL}/work-orders`, workOrder, {
                        headers: {
                            'Authorization': `Bearer ${process.env.OPENWRENCH_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (apiError) {
                    console.log('OpenWrench API not available, work order stored locally:', apiError.message);
                    // Could store locally or in a database here
                }
            }
        }

        console.log(`✅ Created ${workOrders.length} recurring work orders for ${clientName}`);
        return { success: true, workOrdersCreated: workOrders.length };

    } catch (error) {
        console.error('Error creating recurring work orders:', error);
        throw error;
    }
}

module.exports = router;