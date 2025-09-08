-- First, let's check what roles are allowed
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname LIKE '%role%';

-- Based on common patterns, the role constraint likely allows: 'client', 'admin', 'vendor' or 'supplier'
-- Let's try 'vendor' instead of 'subcontractor'

-- Insert demo user profiles with correct role values
INSERT INTO users (id, email, name, role)
VALUES 
  ('172f3aca-69b5-4368-8a06-213a28478bf2', 'demo.client@heyspruce.com', 'Demo Client User', 'client'),
  ('fabfb8a1-2a24-44de-8d6d-bc22f418eb4c', 'demo.admin@heyspruce.com', 'Demo Admin User', 'admin'),
  ('418715c1-0f16-4770-a047-f10896cd66d2', 'demo.sub@heyspruce.com', 'Demo Subcontractor', 'vendor')
ON CONFLICT (id) DO UPDATE 
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- If 'vendor' doesn't work, try 'supplier'
-- UPDATE users SET role = 'supplier' WHERE id = '418715c1-0f16-4770-a047-f10896cd66d2';

-- Verify the users were created
SELECT id, email, name, role FROM users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');

-- Success message
SELECT '✅ Demo accounts are now ready to use!' as status;
SELECT 'Login at: https://openwrench-portal.vercel.app/portal-login' as url;
SELECT '' as blank;
SELECT 'Credentials:' as info;
SELECT 'Client Portal: demo.client@heyspruce.com / demo123' as client;
SELECT 'Admin Portal: demo.admin@heyspruce.com / demo123' as admin;  
SELECT 'Subcontractor Portal: demo.sub@heyspruce.com / demo123' as subcontractor;