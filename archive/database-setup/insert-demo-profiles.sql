-- Insert demo user profiles with the actual IDs from auth.users
-- Run this SQL in Supabase SQL Editor

-- Insert user profiles
INSERT INTO users (id, email, full_name, role, company_name)
VALUES 
  ('172f3aca-69b5-4368-8a06-213a28478bf2', 'demo.client@heyspruce.com', 'Demo Client User', 'client', 'Demo Property Management'),
  ('fabfb8a1-2a24-44de-8d6d-bc22f418eb4c', 'demo.admin@heyspruce.com', 'Demo Admin User', 'admin', 'Hey Spruce Admin'),
  ('418715c1-0f16-4770-a047-f10896cd66d2', 'demo.sub@heyspruce.com', 'Demo Subcontractor', 'subcontractor', 'Demo Landscaping Co')
ON CONFLICT (id) DO UPDATE
SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_name = EXCLUDED.company_name;

-- Verify the profiles were created
SELECT 'User profiles created:' as message;
SELECT id, email, full_name, role, company_name 
FROM users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');

-- Create demo properties for the client
INSERT INTO properties (owner_id, address, type, size, status)
VALUES 
  ('172f3aca-69b5-4368-8a06-213a28478bf2', '123 Demo Street, Demo City, DC 12345', 'commercial', 5000, 'active'),
  ('172f3aca-69b5-4368-8a06-213a28478bf2', '456 Test Avenue, Test Town, TT 67890', 'residential', 2500, 'active')
ON CONFLICT DO NOTHING;

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
  scheduled_date
)
SELECT 
  p.id as property_id,
  '172f3aca-69b5-4368-8a06-213a28478bf2'::uuid as client_id,
  '418715c1-0f16-4770-a047-f10896cd66d2'::uuid as assigned_vendor_id,
  'Lawn Maintenance' as title,
  'Weekly lawn mowing and trimming' as description,
  'in_progress' as status,
  'normal' as priority,
  'landscaping' as service_type,
  NOW() + INTERVAL '2 days' as scheduled_date
FROM properties p
WHERE p.owner_id = '172f3aca-69b5-4368-8a06-213a28478bf2'::uuid
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add another work order
INSERT INTO work_orders (
  property_id,
  client_id,
  assigned_vendor_id,
  title,
  description,
  status,
  priority,
  service_type,
  scheduled_date
)
SELECT 
  p.id as property_id,
  '172f3aca-69b5-4368-8a06-213a28478bf2'::uuid as client_id,
  '418715c1-0f16-4770-a047-f10896cd66d2'::uuid as assigned_vendor_id,
  'Sprinkler System Repair' as title,
  'Fix broken sprinkler heads in zones 2 and 3' as description,
  'scheduled' as status,
  'high' as priority,
  'irrigation' as service_type,
  NOW() + INTERVAL '1 day' as scheduled_date
FROM properties p
WHERE p.owner_id = '172f3aca-69b5-4368-8a06-213a28478bf2'::uuid
LIMIT 1 OFFSET 1
ON CONFLICT DO NOTHING;

-- Verify everything was created
SELECT 'Setup complete! Summary:' as message;

SELECT 'Users:' as section, COUNT(*) as count 
FROM users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com')
UNION ALL
SELECT 'Properties:' as section, COUNT(*) as count 
FROM properties 
WHERE owner_id = '172f3aca-69b5-4368-8a06-213a28478bf2'::uuid
UNION ALL
SELECT 'Work Orders:' as section, COUNT(*) as count 
FROM work_orders 
WHERE client_id = '172f3aca-69b5-4368-8a06-213a28478bf2'::uuid;

-- Success message
SELECT '✅ Demo accounts are ready to use!' as final_message,
       'Login at: https://openwrench-portal.vercel.app/portal-login' as url;