-- Final correct insert with all required fields
-- Based on the errors, the users table requires: id, email, name, and role

-- Insert demo user profiles with all required fields
INSERT INTO users (id, email, name, role)
VALUES 
  ('172f3aca-69b5-4368-8a06-213a28478bf2', 'demo.client@heyspruce.com', 'Demo Client User', 'client'),
  ('fabfb8a1-2a24-44de-8d6d-bc22f418eb4c', 'demo.admin@heyspruce.com', 'Demo Admin User', 'admin'),
  ('418715c1-0f16-4770-a047-f10896cd66d2', 'demo.sub@heyspruce.com', 'Demo Subcontractor', 'subcontractor')
ON CONFLICT (id) DO UPDATE 
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

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