const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    async generateInvoicePDF(invoiceData, vendorLogo, paymentLink) {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            
            // Create HTML content with vendor logo
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                            max-width: 800px;
                            margin: 0 auto;
                        }
                        .header {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 30px;
                            padding-bottom: 20px;
                            border-bottom: 2px solid #333;
                        }
                        .logo {
                            max-width: 200px;
                            max-height: 80px;
                        }
                        .invoice-title {
                            font-size: 32px;
                            color: #333;
                            margin: 0;
                        }
                        .invoice-details {
                            margin: 20px 0;
                        }
                        .detail-row {
                            display: flex;
                            justify-content: space-between;
                            margin: 10px 0;
                            padding: 10px;
                            background: #f5f5f5;
                        }
                        .items-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                        }
                        .items-table th {
                            background: #333;
                            color: white;
                            padding: 10px;
                            text-align: left;
                        }
                        .items-table td {
                            padding: 10px;
                            border-bottom: 1px solid #ddd;
                        }
                        .totals {
                            text-align: right;
                            margin-top: 20px;
                        }
                        .total-row {
                            display: flex;
                            justify-content: flex-end;
                            margin: 5px 0;
                        }
                        .total-label {
                            margin-right: 20px;
                            font-weight: bold;
                        }
                        .total-amount {
                            min-width: 100px;
                            text-align: right;
                        }
                        .payment-section {
                            margin-top: 40px;
                            padding: 20px;
                            background: #e8f4fd;
                            border-radius: 8px;
                            text-align: center;
                        }
                        .payment-button {
                            display: inline-block;
                            padding: 15px 30px;
                            background: #4CAF50;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            font-size: 18px;
                            margin-top: 10px;
                        }
                        .footer {
                            margin-top: 50px;
                            padding-top: 20px;
                            border-top: 1px solid #ddd;
                            text-align: center;
                            color: #666;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        ${vendorLogo ? `<img src="${vendorLogo}" alt="Company Logo" class="logo">` : ''}
                        <h1 class="invoice-title">INVOICE</h1>
                    </div>
                    
                    <div class="invoice-details">
                        <div class="detail-row">
                            <span><strong>Invoice Number:</strong></span>
                            <span>${invoiceData.invoiceNumber}</span>
                        </div>
                        <div class="detail-row">
                            <span><strong>Date:</strong></span>
                            <span>${new Date().toLocaleDateString()}</span>
                        </div>
                        <div class="detail-row">
                            <span><strong>Due Date:</strong></span>
                            <span>${new Date(invoiceData.dueDate).toLocaleDateString()}</span>
                        </div>
                        <div class="detail-row">
                            <span><strong>Payment Terms:</strong></span>
                            <span>${invoiceData.paymentTerms}</span>
                        </div>
                    </div>
                    
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoiceData.laborTotalBeforeTax > 0 ? `
                            <tr>
                                <td>Labor</td>
                                <td>$${parseFloat(invoiceData.laborTotalBeforeTax).toFixed(2)}</td>
                            </tr>` : ''}
                            ${invoiceData.materialTotalBeforeTax > 0 ? `
                            <tr>
                                <td>Materials</td>
                                <td>$${parseFloat(invoiceData.materialTotalBeforeTax).toFixed(2)}</td>
                            </tr>` : ''}
                            ${invoiceData.freightTotalBeforeTax > 0 ? `
                            <tr>
                                <td>Freight</td>
                                <td>$${parseFloat(invoiceData.freightTotalBeforeTax).toFixed(2)}</td>
                            </tr>` : ''}
                            ${invoiceData.travelTotalBeforeTax > 0 ? `
                            <tr>
                                <td>Travel</td>
                                <td>$${parseFloat(invoiceData.travelTotalBeforeTax).toFixed(2)}</td>
                            </tr>` : ''}
                            ${invoiceData.miscTotalBeforeTax > 0 ? `
                            <tr>
                                <td>Miscellaneous</td>
                                <td>$${parseFloat(invoiceData.miscTotalBeforeTax).toFixed(2)}</td>
                            </tr>` : ''}
                        </tbody>
                    </table>
                    
                    <div class="totals">
                        <div class="total-row">
                            <span class="total-label">Subtotal:</span>
                            <span class="total-amount">$${parseFloat(invoiceData.invoiceTotalBeforeTax || 0).toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                            <span class="total-label">Tax:</span>
                            <span class="total-amount">$${parseFloat(invoiceData.invoiceTax || 0).toFixed(2)}</span>
                        </div>
                        <div class="total-row" style="font-size: 1.2em; font-weight: bold;">
                            <span class="total-label">Total Due:</span>
                            <span class="total-amount">$${parseFloat(invoiceData.invoiceTotalAfterTax || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    
                    ${paymentLink ? `
                    <div class="payment-section">
                        <h3>Payment Information</h3>
                        <p>Click the button below to pay this invoice securely online:</p>
                        <a href="${paymentLink}" class="payment-button">Pay Now</a>
                        <p style="margin-top: 10px; font-size: 14px;">Or copy this link: ${paymentLink}</p>
                    </div>
                    ` : ''}
                    
                    <div class="footer">
                        <p>Thank you for your business!</p>
                        <p>Generated on ${new Date().toLocaleDateString()}</p>
                        ${vendorLogo ? '<p>Powered by OpenWrench + Stripe Connect</p>' : ''}
                    </div>
                </body>
                </html>
            `;
            
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            
            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'Letter',
                printBackground: true,
                margin: {
                    top: '0.5in',
                    right: '0.5in',
                    bottom: '0.5in',
                    left: '0.5in'
                }
            });
            
            // Save to temp file
            const tempDir = path.join(process.cwd(), 'temp');
            await fs.mkdir(tempDir, { recursive: true });
            
            const pdfPath = path.join(tempDir, `invoice_${invoiceData.invoiceNumber || Date.now()}.pdf`);
            await fs.writeFile(pdfPath, pdfBuffer);
            
            return pdfPath;
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
};