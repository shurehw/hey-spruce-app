const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');

// In-memory storage
let invoices = [];
let nextId = 1;

// Get all invoices
router.get('/', (req, res) => {
    res.json(invoices);
});

// Get invoice by ID
router.get('/:id', (req, res) => {
    const invoice = invoices.find(i => i.id === req.params.id);
    if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
});

// Create invoice
router.post('/', (req, res) => {
    const { invoice_number, vendor, customer, items, tax_rate = 0 } = req.body;
    
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = subtotal * tax_rate;
    const total = subtotal + tax;
    
    const invoice = {
        id: `inv_${nextId++}`,
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
    
    invoices.push(invoice);
    res.status(201).json(invoice);
});

// Generate PDF
router.get('/:id/pdf', (req, res) => {
    const invoice = invoices.find(i => i.id === req.params.id);
    if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(20).text('INVOICE', 50, 50);
    doc.fontSize(12).text(`Invoice #: ${invoice.invoice_number}`, 50, 80);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 100);
    
    // Vendor info
    doc.text('From:', 50, 140);
    doc.text(invoice.vendor.name, 50, 160);
    doc.text(invoice.vendor.email, 50, 180);
    
    // Customer info
    doc.text('To:', 300, 140);
    doc.text(invoice.customer.name, 300, 160);
    doc.text(invoice.customer.email, 300, 180);
    
    // Items
    let y = 240;
    doc.text('Description', 50, y);
    doc.text('Qty', 300, y);
    doc.text('Price', 400, y);
    doc.text('Total', 500, y);
    
    y += 20;
    invoice.items.forEach(item => {
        doc.text(item.description, 50, y);
        doc.text(item.quantity.toString(), 300, y);
        doc.text(`$${item.price.toFixed(2)}`, 400, y);
        doc.text(`$${(item.quantity * item.price).toFixed(2)}`, 500, y);
        y += 20;
    });
    
    // Totals
    y += 20;
    doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 400, y);
    y += 20;
    doc.text(`Tax (${(invoice.tax_rate * 100).toFixed(0)}%): $${invoice.tax.toFixed(2)}`, 400, y);
    y += 20;
    doc.fontSize(14).text(`Total: $${invoice.total.toFixed(2)}`, 400, y);
    
    doc.end();
});

// Update invoice status
router.patch('/:id/status', (req, res) => {
    const invoice = invoices.find(i => i.id === req.params.id);
    if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
    }
    
    invoice.status = req.body.status;
    invoice.updated_at = new Date().toISOString();
    
    res.json(invoice);
});

module.exports = router;