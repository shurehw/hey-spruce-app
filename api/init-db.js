const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function initDatabase() {
    try {
        // First, try to create the table if it doesn't exist
        const { error: createError } = await supabase.rpc('exec', {
            sql: `
                CREATE TABLE IF NOT EXISTS team_members (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    role TEXT NOT NULL,
                    department TEXT,
                    status TEXT DEFAULT 'Pending',
                    client_portal_access BOOLEAN DEFAULT false,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
                CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

                ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

                DROP POLICY IF EXISTS "Enable all operations for team_members" ON team_members;
                CREATE POLICY "Enable all operations for team_members" ON team_members
                    FOR ALL
                    USING (true)
                    WITH CHECK (true);
            `
        });

        if (createError) {
            console.log('Note: Could not create table via RPC, it may already exist:', createError.message);
        } else {
            console.log('Database table created successfully');
        }

        // Check if we have any team members
        const { data: existingMembers, error: checkError } = await supabase
            .from('team_members')
            .select('id')
            .limit(1);

        if (checkError && checkError.message.includes('relation') && checkError.message.includes('does not exist')) {
            console.log('Table does not exist, will be created on first use');
            return { success: false, message: 'Table will be created on first use' };
        }

        if (!existingMembers || existingMembers.length === 0) {
            // Insert default members
            const { error: insertError } = await supabase
                .from('team_members')
                .insert([
                    { name: 'Jacob Shure', email: 'jacob@hwood.com', role: 'Admin', department: 'Management', status: 'Active', client_portal_access: true },
                    { name: 'Emily Chen', email: 'emily.chen@hwood.com', role: 'Vendor Manager', department: 'Procurement', status: 'Active', client_portal_access: true },
                    { name: 'Robert Davis', email: 'robert.davis@hwood.com', role: 'Coordinator', department: 'Operations', status: 'Active', client_portal_access: false },
                    { name: 'Lisa Martinez', email: 'lisa.martinez@hwood.com', role: 'Analyst', department: 'Finance', status: 'Pending', client_portal_access: false }
                ]);

            if (insertError) {
                console.error('Error inserting default members:', insertError);
            } else {
                console.log('Default team members inserted');
            }
        }

        return { success: true, message: 'Database initialized successfully' };

    } catch (error) {
        console.error('Database initialization error:', error);
        return { success: false, message: error.message };
    }
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const result = await initDatabase();
    
    if (result.success) {
        res.json({ success: true, message: result.message });
    } else {
        res.status(500).json({ success: false, error: result.message });
    }
};