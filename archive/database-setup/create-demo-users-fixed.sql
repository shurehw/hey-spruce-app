-- SQL script to create demo users in Supabase
-- First, let's check the table structure and create users properly

-- Step 1: Check if users table exists and its structure
-- Run this first to see what columns exist:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users';

-- Step 2: Create auth users using Supabase Dashboard
-- Go to Authentication > Users > Create User (or Invite User) for each:
-- Email: demo.client@heyspruce.com | Password: demo123
-- Email: demo.admin@heyspruce.com | Password: demo123  
-- Email: demo.sub@heyspruce.com | Password: demo123

-- Step 3: If users table doesn't exist, create it:
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('client', 'admin', 'subcontractor')),
  company_name TEXT,
  company_id UUID,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Create policy for admins to read all data
CREATE POLICY "Admins can read all data" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 4: After creating auth users in dashboard, insert user profiles:
-- Note: Replace the IDs below with actual user IDs from auth.users table

-- Get the IDs first (run this query to see the IDs):
-- SELECT id, email FROM auth.users WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');

-- Then insert profiles (update the IDs based on above query):
INSERT INTO users (id, email, full_name, role, company_name)
SELECT 
  id,
  email::text,
  CASE 
    WHEN email::text = 'demo.client@heyspruce.com' THEN 'Demo Client User'
    WHEN email::text = 'demo.admin@heyspruce.com' THEN 'Demo Admin User'
    WHEN email::text = 'demo.sub@heyspruce.com' THEN 'Demo Subcontractor'
  END as full_name,
  CASE 
    WHEN email::text = 'demo.client@heyspruce.com' THEN 'client'
    WHEN email::text = 'demo.admin@heyspruce.com' THEN 'admin'
    WHEN email::text = 'demo.sub@heyspruce.com' THEN 'subcontractor'
  END as role,
  CASE 
    WHEN email::text = 'demo.client@heyspruce.com' THEN 'Demo Property Management'
    WHEN email::text = 'demo.admin@heyspruce.com' THEN 'Hey Spruce Admin'
    WHEN email::text = 'demo.sub@heyspruce.com' THEN 'Demo Landscaping Co'
  END as company_name
FROM auth.users 
WHERE email::text IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com')
ON CONFLICT (id) DO UPDATE
SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_name = EXCLUDED.company_name;

-- Step 5: Create properties table if it doesn't exist
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  type TEXT,
  size INTEGER,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Create policies for properties
CREATE POLICY "Users can read own properties" ON properties
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Admins can read all properties" ON properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 6: Create work_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  client_id UUID REFERENCES users(id),
  assigned_vendor_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  service_type TEXT,
  scheduled_date TIMESTAMPTZ,
  cost DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for work orders
CREATE POLICY "Users can read relevant work orders" ON work_orders
  FOR SELECT USING (
    auth.uid() = client_id OR 
    auth.uid() = assigned_vendor_id OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 7: Insert demo data (after users are created)
-- Insert demo properties
INSERT INTO properties (owner_id, address, type, size, status)
SELECT 
  id as owner_id,
  '123 Demo Street, Demo City, DC 12345' as address,
  'commercial' as type,
  5000 as size,
  'active' as status
FROM users 
WHERE email = 'demo.client@heyspruce.com'
ON CONFLICT DO NOTHING;

INSERT INTO properties (owner_id, address, type, size, status)
SELECT 
  id as owner_id,
  '456 Test Avenue, Test Town, TT 67890' as address,
  'residential' as type,
  2500 as size,
  'active' as status
FROM users 
WHERE email = 'demo.client@heyspruce.com'
ON CONFLICT DO NOTHING;

-- Insert demo work orders
INSERT INTO work_orders (
  property_id,
  client_id,
  assigned_vendor_id,
  title,
  description,
  status,
  priority,
  service_type,
  scheduled_date,
  cost
)
SELECT 
  p.id as property_id,
  c.id as client_id,
  s.id as assigned_vendor_id,
  'Lawn Maintenance' as title,
  'Weekly lawn mowing and trimming' as description,
  'in_progress' as status,
  'normal' as priority,
  'landscaping' as service_type,
  NOW() + INTERVAL '2 days' as scheduled_date,
  150.00 as cost
FROM properties p
CROSS JOIN users c
CROSS JOIN users s
WHERE c.email = 'demo.client@heyspruce.com'
  AND s.email = 'demo.sub@heyspruce.com'
  AND p.owner_id = c.id
LIMIT 1
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
SELECT 'Demo setup complete! Make sure to create auth users in Supabase Dashboard first.' as message;