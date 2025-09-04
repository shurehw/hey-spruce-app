module.exports = async (req, res) => {
    try {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // For now, return default data while we debug the Supabase connection
        const defaultMembers = [
            { id: '1', name: 'Jacob Shure', email: 'jacob@hwood.com', role: 'Admin', department: 'Management', status: 'Active', client_portal_access: true },
            { id: '2', name: 'Emily Chen', email: 'emily.chen@hwood.com', role: 'Vendor Manager', department: 'Procurement', status: 'Active', client_portal_access: true },
            { id: '3', name: 'Robert Davis', email: 'robert.davis@hwood.com', role: 'Coordinator', department: 'Operations', status: 'Active', client_portal_access: false },
            { id: '4', name: 'Lisa Martinez', email: 'lisa.martinez@hwood.com', role: 'Analyst', department: 'Finance', status: 'Pending', client_portal_access: false }
        ];

        switch (req.method) {
            case 'GET':
                return res.json(defaultMembers);
            
            case 'POST':
                const { name, email, role, department, status, clientPortalAccess } = req.body;
                const newMember = {
                    id: Date.now().toString(),
                    name,
                    email,
                    role,
                    department,
                    status: status || 'Pending',
                    client_portal_access: clientPortalAccess || false,
                    created_at: new Date().toISOString()
                };
                return res.json(newMember);
            
            case 'PUT':
                const { id } = req.query;
                const updates = req.body;
                return res.json({
                    id,
                    ...updates,
                    updated_at: new Date().toISOString()
                });
            
            case 'DELETE':
                const { id: deleteId } = req.query;
                return res.json({ success: true, deletedId: deleteId });
            
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(200).json({ 
            error: 'API temporarily using fallback mode',
            members: [
                { id: '1', name: 'Jacob Shure', email: 'jacob@hwood.com', role: 'Admin', department: 'Management', status: 'Active' }
            ]
        });
    }
};