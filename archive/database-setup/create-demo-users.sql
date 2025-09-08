-- SQL script to create demo users in Supabase
-- Run this in the Supabase SQL Editor

-- Note: You'll need to use Supabase Dashboard to create auth users first
-- Go to Authentication > Users > Invite User for each demo account

-- After creating auth users, run this to create user profiles:

-- Create demo client profile
INSERT INTO users (id, email, full_name, role, company_name, created_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'demo.client@heyspruce.com'),
  'demo.client@heyspruce.com',
  'Demo Client User',
  'client',
  'Demo Property Management LLC',
  NOW()
) ON CONFLICT (id) DO UPDATE
SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_name = EXCLUDED.company_name;

-- Create demo admin profile
INSERT INTO users (id, email, full_name, role, company_name, created_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'demo.admin@heyspruce.com'),
  'demo.admin@heyspruce.com',
  'Demo Admin User',
  'admin',
  'Hey Spruce Admin',
  NOW()
) ON CONFLICT (id) DO UPDATE
SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_name = EXCLUDED.company_name;

-- Create demo subcontractor profile
INSERT INTO users (id, email, full_name, role, company_name, created_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'demo.sub@heyspruce.com'),
  'demo.sub@heyspruce.com',
  'Demo Subcontractor',
  'role',
  'Demo Landscaping Services',
  NOW()
) ON CONFLICT (id) DO UPDATE
SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_name = EXCLUDED.company_name;

-- Create demo properties for client
INSERT INTO properties (owner_id, address, type, size, status, created_at)
VALUES 
  ((SELECT id FROM auth.users WHERE email = 'demo.client@heyspruce.com'), 
   '123 Demo Street, Demo City, DC 12345', 
   'commercial', 
   5000, 
   'active', 
   NOW()),
  ((SELECT id FROM auth.users WHERE email = 'demo.client@heyspruce.com'), 
   '456 Test Avenue, Test Town, TT 67890', 
   'residential', 
   2500, 
   'active', 
   NOW());

-- Create demo work orders
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
  created_at
)
VALUES 
  ((SELECT id FROM properties LIMIT 1),
   (SELECT id FROM auth.users WHERE email = 'demo.client@heyspruce.com'),
   (SELECT id FROM auth.users WHERE email = 'demo.sub@heyspruce.com'),
   'Lawn Maintenance',
   'Weekly lawn mowing and trimming',
   'in_progress',
   'normal',
   'landscaping',
   NOW() + INTERVAL '2 days',
   NOW()),
  ((SELECT id FROM properties LIMIT 1 OFFSET 1),
   (SELECT id FROM auth.users WHERE email = 'demo.client@heyspruce.com'),
   (SELECT id FROM auth.users WHERE email = 'demo.sub@heyspruce.com'),
   'Sprinkler Repair',
   'Fix broken sprinkler heads in zone 3',
   'scheduled',
   'high',
   'irrigation',
   NOW() + INTERVAL '1 day',
   NOW());

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

SELECT 'Demo users and data created successfully!' as message;