require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTable() {
    console.log('Creating team_members table in Supabase...');
    
    try {
        // Method 1: Try using the built-in REST API to create table
        const tableSchema = {
            table_name: 'team_members',
            columns: [
                { name: 'id', type: 'uuid', default: 'gen_random_uuid()', primary_key: true },
                { name: 'name', type: 'text', nullable: false },
                { name: 'email', type: 'text', nullable: false, unique: true },
                { name: 'role', type: 'text', nullable: false },
                { name: 'department', type: 'text', nullable: true },
                { name: 'status', type: 'text', default: 'Pending' },
                { name: 'client_portal_access', type: 'boolean', default: false },
                { name: 'created_at', type: 'timestamptz', default: 'now()' },
                { name: 'updated_at', type: 'timestamptz', default: 'now()' }
            ]
        };

        // Try inserting a test record to see if table exists
        const { data: testData, error: testError } = await supabase
            .from('team_members')
            .select('id')
            .limit(1);

        if (testError && testError.message.includes('relation') && testError.message.includes('does not exist')) {
            console.log('Table does not exist. You need to create it manually in your Supabase dashboard.');
            console.log('\nPlease go to your Supabase dashboard and run this SQL:');
            console.log('\n--- COPY THE SQL BELOW ---');
            console.log(`
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

CREATE POLICY "Enable all operations for team_members" ON team_members
    FOR ALL
    USING (true)
    WITH CHECK (true);

INSERT INTO team_members (name, email, role, department, status, client_portal_access)
VALUES 
    ('Jacob Shure', 'jacob@hwood.com', 'Admin', 'Management', 'Active', true),
    ('Emily Chen', 'emily.chen@hwood.com', 'Vendor Manager', 'Procurement', 'Active', true),
    ('Robert Davis', 'robert.davis@hwood.com', 'Coordinator', 'Operations', 'Active', false),
    ('Lisa Martinez', 'lisa.martinez@hwood.com', 'Analyst', 'Finance', 'Pending', false);
            `);
            console.log('--- END OF SQL ---\n');
            console.log('Steps:');
            console.log('1. Go to https://supabase.com/dashboard');
            console.log('2. Select your project');
            console.log('3. Go to SQL Editor');
            console.log('4. Paste and run the SQL above');
        } else if (testError) {
            console.error('Error checking table:', testError.message);
        } else {
            console.log('Table already exists!');
            console.log('Current team members:', testData?.length || 0);
            
            // Insert default data if table is empty
            if (!testData || testData.length === 0) {
                const { error: insertError } = await supabase
                    .from('team_members')
                    .insert([
                        { name: 'Jacob Shure', email: 'jacob@hwood.com', role: 'Admin', department: 'Management', status: 'Active', client_portal_access: true },
                        { name: 'Emily Chen', email: 'emily.chen@hwood.com', role: 'Vendor Manager', department: 'Procurement', status: 'Active', client_portal_access: true },
                        { name: 'Robert Davis', email: 'robert.davis@hwood.com', role: 'Coordinator', department: 'Operations', status: 'Active', client_portal_access: false },
                        { name: 'Lisa Martinez', email: 'lisa.martinez@hwood.com', role: 'Analyst', department: 'Finance', status: 'Pending', client_portal_access: false }
                    ]);
                
                if (insertError) {
                    console.error('Error inserting default data:', insertError.message);
                } else {
                    console.log('Default team members inserted successfully!');
                }
            }
        }

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

if (require.main === module) {
    createTable().then(() => {
        console.log('Done!');
        process.exit(0);
    });
}