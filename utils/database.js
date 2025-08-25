// Simple in-memory database for development
// In production, replace with actual PostgreSQL/MySQL connection

const vendors = [];
let vendorIdCounter = 1;

const db = {
    // Execute query (mock implementation)
    query: async (sql, params = []) => {
        // Mock vendor queries
        if (sql.includes('SELECT * FROM vendors')) {
            if (sql.includes('WHERE email')) {
                const email = params[0];
                const filtered = vendors.filter(v => v.email === email);
                return { rows: filtered };
            }
            if (sql.includes('ORDER BY')) {
                return { rows: [...vendors].reverse() };
            }
            return { rows: vendors };
        }
        
        if (sql.includes('INSERT INTO vendors')) {
            const [name, email, stripe_account_id, default_split_percentage] = params;
            const newVendor = {
                id: vendorIdCounter++,
                name,
                email,
                stripe_account_id,
                default_split_percentage,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            vendors.push(newVendor);
            return { rows: [newVendor] };
        }
        
        if (sql.includes('UPDATE vendors')) {
            // Parse the vendor ID from params (last param)
            const vendorId = params[params.length - 1];
            const vendor = vendors.find(v => v.id == vendorId);
            if (vendor) {
                // Update vendor fields based on params
                if (params[0] !== undefined && params[0] !== vendorId) {
                    // Update based on field order in the UPDATE statement
                    Object.assign(vendor, {
                        updated_at: new Date().toISOString()
                    });
                }
                return { rows: [vendor] };
            }
            return { rows: [] };
        }
        
        if (sql.includes('SELECT * FROM invoice_splits')) {
            return { rows: [] }; // No invoice splits for now
        }
        
        return { rows: [] };
    },
    
    // Get single vendor
    getVendor: async (id) => {
        return vendors.find(v => v.id == id) || null;
    }
};

module.exports = db;