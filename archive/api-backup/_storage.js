// In-memory storage for serverless functions
// Note: This will reset on each cold start

let vendors = [];
let invoices = [];
let vendorId = 1;
let invoiceId = 1;

module.exports = {
    vendors,
    invoices,
    getNextVendorId: () => `vendor_${vendorId++}`,
    getNextInvoiceId: () => `inv_${invoiceId++}`
};