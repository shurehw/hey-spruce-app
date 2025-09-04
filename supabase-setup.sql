-- Create team_members table
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

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);

-- Create an index on status for filtering
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

-- Enable Row Level Security
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now
-- In production, you'd want more restrictive policies
CREATE POLICY "Enable all operations for team_members" ON team_members
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Insert default team members if the table is empty
INSERT INTO team_members (name, email, role, department, status, client_portal_access)
SELECT * FROM (VALUES
    ('Jacob Shure', 'jacob@hwood.com', 'Admin', 'Management', 'Active', true),
    ('Emily Chen', 'emily.chen@hwood.com', 'Vendor Manager', 'Procurement', 'Active', true),
    ('Robert Davis', 'robert.davis@hwood.com', 'Coordinator', 'Operations', 'Active', false),
    ('Lisa Martinez', 'lisa.martinez@hwood.com', 'Analyst', 'Finance', 'Pending', false)
) AS default_members(name, email, role, department, status, client_portal_access)
WHERE NOT EXISTS (SELECT 1 FROM team_members LIMIT 1);