const storage = require('./_storage');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Handle GET /api/vendors/:id
    const urlParts = req.url.split('/');
    const id = urlParts[urlParts.length - 1];
    
    if (req.method === 'GET') {
        if (id && id !== 'vendors') {
            const vendor = storage.vendors.find(v => v.id === id);
            if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
            return res.json(vendor);
        }
        return res.json(storage.vendors);
    }
    
    if (req.method === 'POST') {
        const vendor = {
            id: storage.getNextVendorId(),
            ...req.body,
            created_at: new Date().toISOString()
        };
        storage.vendors.push(vendor);
        return res.status(201).json(vendor);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
};