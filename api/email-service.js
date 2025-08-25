const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');

// Initialize SendGrid if API key is provided
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize Nodemailer for SMTP if configured
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
}

// Email templates
const emailTemplates = {
  proposalApproval: (data) => ({
    subject: `Maintenance Plan Proposal - ${data.clientName} - Action Required`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #2c5f87 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 40px 30px; border: 1px solid #dee2e6; }
          .proposal-summary { background: white; padding: 25px; margin: 25px 0; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .amount { font-size: 28px; color: #1e3a5f; font-weight: bold; margin: 15px 0; }
          .approval-buttons { text-align: center; margin: 40px 0; }
          .approve-btn { display: inline-block; padding: 18px 40px; background: #28a745; color: white; text-decoration: none; border-radius: 8px; margin: 0 15px; font-weight: bold; font-size: 16px; }
          .decline-btn { display: inline-block; padding: 18px 40px; background: #dc3545; color: white; text-decoration: none; border-radius: 8px; margin: 0 15px; font-weight: bold; font-size: 16px; }
          .services-list { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .service-item { padding: 15px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
          .service-item:last-child { border-bottom: none; }
          .service-name { font-weight: 600; color: #1e3a5f; }
          .service-frequency { color: #6c757d; font-size: 14px; }
          .service-price { color: #28a745; font-weight: bold; }
          .footer { text-align: center; padding: 30px; color: #6c757d; font-size: 14px; background: #e9ecef; border-radius: 0 0 10px 10px; }
          .company-info { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="margin-bottom: 20px;">
            <img src="${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/public/hey-spruce-logo.png" 
                 alt="Hey Spruce Logo" 
                 style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 15px;">
          </div>
          <h1>HEY SPRUCE</h1>
          <p>Professional Restaurant Cleaning & Maintenance</p>
        </div>
        
        <div class="content">
          <h2>Maintenance Plan Proposal</h2>
          <p>Dear ${data.clientContact || data.clientName},</p>
          
          <p>We're excited to present your customized preventive maintenance plan. This comprehensive program is designed to keep your restaurant equipment running efficiently while maintaining the highest health and safety standards.</p>
          
          <div class="proposal-summary">
            <h3>📊 Plan Summary</h3>
            <p><strong>Location(s):</strong> ${data.locations || 'All restaurant locations'}</p>
            <p><strong>Equipment Categories:</strong> ${data.equipment?.length || 0}</p>
            <p><strong>Services Included:</strong> ${data.services.length}</p>
            
            <div class="amount">
              Monthly Total: $${data.monthlyTotal}
              <br>
              <span style="font-size: 18px; color: #6c757d;">Annual Value: $${data.annualTotal}</span>
            </div>
          </div>
          
          <div class="services-list">
            <h3>🔧 Services Included</h3>
            ${data.services.map(service => `
              <div class="service-item">
                <div>
                  <div class="service-name">${service.name}</div>
                  <div class="service-frequency">${service.frequency} Service</div>
                  ${service.notes ? `<div style="font-size: 12px; color: #6c757d; margin-top: 5px;">${service.notes}</div>` : ''}
                </div>
                <div class="service-price">$${service.price}</div>
              </div>
            `).join('')}
          </div>
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="color: #1565c0; margin: 0 0 10px 0;">✨ What happens after approval?</h4>
            <ul style="margin: 0; color: #1565c0;">
              <li>Work orders automatically created in OpenWrench</li>
              <li>First month's service scheduled</li>
              <li>Initial invoice sent for the first month</li>
              <li>Our team begins your customized maintenance program</li>
            </ul>
          </div>
          
          <div class="approval-buttons">
            <h3>Ready to get started?</h3>
            <p style="margin-bottom: 30px;">Click below to approve your maintenance plan:</p>
            
            <a href="${data.approveUrl}" class="approve-btn">✅ APPROVE PLAN</a>
            <a href="${data.declineUrl}" class="decline-btn">❌ DECLINE</a>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <strong>Questions?</strong> Reply to this email or call us at (555) 123-4567
          </div>
        </div>
        
        <div class="footer">
          <div class="company-info">
            <strong>HEY SPRUCE</strong><br>
            Professional Restaurant Cleaning & Maintenance<br>
            Email: ${data.fromEmail || 'hello@heyspruce.com'} | Phone: (555) 123-4567
          </div>
          <p style="margin-top: 20px; font-size: 12px;">
            This proposal is valid for 30 days from the date sent.
          </p>
        </div>
      </body>
      </html>
    `
  }),
  paymentLink: (data) => ({
    subject: `Invoice #${data.invoiceNumber} - Payment Request from ${data.companyName || 'Hey Spruce'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a5f; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; }
          .invoice-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .amount { font-size: 32px; color: #1e3a5f; font-weight: bold; margin: 20px 0; }
          .button { display: inline-block; padding: 15px 30px; background: #1e3a5f; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6; }
          th { background: #f8f9fa; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.companyName || 'Hey Spruce'}</h1>
            <p>Restaurant Cleaning & Maintenance</p>
          </div>
          
          <div class="content">
            <h2>Payment Request</h2>
            <p>Dear ${data.customerName || 'Valued Customer'},</p>
            <p>Please find below your invoice details and payment link.</p>
            
            <div class="invoice-details">
              <h3>Invoice #${data.invoiceNumber}</h3>
              <table>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
                ${data.items ? data.items.map(item => `
                  <tr>
                    <td>${item.description || item.name}</td>
                    <td>$${(item.amount || 0).toFixed(2)}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td>${data.description || 'Services'}</td>
                    <td>$${(data.amount || 0).toFixed(2)}</td>
                  </tr>
                `}
              </table>
              
              <div class="amount">
                Total: $${(data.amount || 0).toFixed(2)}
              </div>
              
              ${data.dueDate ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
            </div>
            
            <div style="text-align: center;">
              <a href="${data.paymentLink}" class="button">Pay Now</a>
              <p style="margin-top: 10px;">Or copy this link:<br>
              <small>${data.paymentLink}</small></p>
            </div>
            
            <p style="margin-top: 30px;">If you have any questions about this invoice, please contact us at ${data.contactPhone || '877-253-2646'} or reply to this email.</p>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>${data.companyName || 'Hey Spruce'} | ${data.contactPhone || '877-253-2646'}</p>
            <p>This is an automated payment request. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Invoice #${data.invoiceNumber} - Payment Request from ${data.companyName || 'Hey Spruce'}

Dear ${data.customerName || 'Valued Customer'},

Please find below your invoice details:

Invoice #${data.invoiceNumber}
Amount: $${(data.amount || 0).toFixed(2)}
${data.dueDate ? `Due Date: ${data.dueDate}` : ''}

To make your payment, please visit:
${data.paymentLink}

If you have any questions, please contact us at ${data.contactPhone || '877-253-2646'}.

Thank you for your business!
${data.companyName || 'Hey Spruce'}
    `
  }),

  vendorInvite: (data) => ({
    subject: `Vendor Account Setup - ${data.companyName || 'Hey Spruce'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a5f; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; }
          .button { display: inline-block; padding: 15px 30px; background: #48bb78; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${data.companyName || 'Hey Spruce'}</h1>
            <p>Vendor Payment Setup</p>
          </div>
          
          <div class="content">
            <h2>Complete Your Account Setup</h2>
            <p>Dear ${data.vendorName},</p>
            <p>You've been invited to set up your payment account with ${data.companyName || 'Hey Spruce'}. This will allow you to receive payments directly for your services.</p>
            
            <h3>What you need to do:</h3>
            <ol>
              <li>Click the button below to start the setup process</li>
              <li>Provide your business information</li>
              <li>Add your bank account details for payments</li>
              <li>Verify your identity (required for compliance)</li>
            </ol>
            
            <p>The process takes about 10 minutes to complete.</p>
            
            <div style="text-align: center;">
              <a href="${data.onboardingUrl}" class="button">Set Up Payment Account</a>
              <p style="margin-top: 10px;">Or copy this link:<br>
              <small>${data.onboardingUrl}</small></p>
            </div>
            
            <p><strong>Important:</strong> This link expires in 30 days. Please complete your setup as soon as possible.</p>
            
            <p>If you have any questions, please contact us at ${data.contactPhone || '877-253-2646'}.</p>
          </div>
          
          <div class="footer">
            <p>${data.companyName || 'Hey Spruce'} | ${data.contactPhone || '877-253-2646'}</p>
            <p>Powered by Stripe Connect</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to ${data.companyName || 'Hey Spruce'} - Vendor Payment Setup

Dear ${data.vendorName},

You've been invited to set up your payment account with ${data.companyName || 'Hey Spruce'}.

To complete your setup, please visit:
${data.onboardingUrl}

This link expires in 30 days.

If you have any questions, please contact us at ${data.contactPhone || '877-253-2646'}.

Thank you,
${data.companyName || 'Hey Spruce'}
    `
  })
};

// Send email function
async function sendEmail(to, templateName, data) {
  const template = emailTemplates[templateName](data);
  const from = process.env.EMAIL_FROM || 'noreply@heyspruce.com';
  
  try {
    // Try SendGrid first
    if (process.env.SENDGRID_API_KEY) {
      const msg = {
        to: to,
        from: from,
        subject: template.subject,
        text: template.text,
        html: template.html
      };
      
      await sgMail.send(msg);
      return { success: true, method: 'sendgrid' };
    }
    
    // Try SMTP if configured
    if (transporter) {
      const info = await transporter.sendMail({
        from: from,
        to: to,
        subject: template.subject,
        text: template.text,
        html: template.html
      });
      
      return { success: true, method: 'smtp', messageId: info.messageId };
    }
    
    // No email service configured
    return { 
      success: false, 
      error: 'No email service configured. Please set up SendGrid or SMTP credentials.',
      emailContent: template // Return template for manual sending
    };
    
  } catch (error) {
    console.error('Email sending error:', error);
    return { 
      success: false, 
      error: error.message,
      emailContent: template // Return template for fallback
    };
  }
}

module.exports = {
  sendEmail,
  emailTemplates
};