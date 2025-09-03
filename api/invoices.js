const storage = require('./_storage');
const PDFDocument = require('pdfkit');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Parse URL to check for ID and /pdf suffix
    const urlParts = req.url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const secondLastPart = urlParts[urlParts.length - 2];
    
    // Handle PDF generation
    if (lastPart === 'pdf' && secondLastPart) {
        const invoice = storage.invoices.find(i => i.id === secondLastPart);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        
        const doc = new PDFDocument();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);
        
        doc.pipe(res);
        
        doc.fontSize(20).text('INVOICE', 50, 50);
        doc.fontSize(12).text(`Invoice #: ${invoice.invoice_number}`, 50, 80);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 100);
        
        doc.text('From:', 50, 140);
        doc.text(invoice.vendor.name, 50, 160);
        doc.text(invoice.vendor.email, 50, 180);
        
        doc.text('To:', 300, 140);
        doc.text(invoice.customer.name, 300, 160);
        doc.text(invoice.customer.email, 300, 180);
        
        let y = 240;
        doc.text('Items:', 50, y);
        y += 20;
        
        invoice.items.forEach(item => {
            doc.text(`${item.description} - Qty: ${item.quantity} x $${item.price} = $${(item.quantity * item.price).toFixed(2)}`, 50, y);
            y += 20;
        });
        
        y += 20;
        doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 350, y);
        y += 20;
        doc.text(`Tax: $${invoice.tax.toFixed(2)}`, 350, y);
        y += 20;
        doc.fontSize(14).text(`Total: $${invoice.total.toFixed(2)}`, 350, y);
        
        doc.end();
        return;
    }
    
    // Handle GET /api/invoices/:id
    if (req.method === 'GET') {
        if (lastPart && lastPart !== 'invoices') {
            const invoice = storage.invoices.find(i => i.id === lastPart);
            if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
            return res.json(invoice);
        }
        return res.json(storage.invoices);
    }
    
    // Handle POST /api/invoices
    if (req.method === 'POST') {
        const { invoice_number, vendor, customer, items, tax_rate = 0 } = req.body;
        
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const tax = subtotal * tax_rate;
        const total = subtotal + tax;
        
        const invoice = {
            id: storage.getNextInvoiceId(),
            invoice_number,
            vendor,
            customer,
            items,
            subtotal,
            tax_rate,
            tax,
            total,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        storage.invoices.push(invoice);
        return res.status(201).json(invoice);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
};