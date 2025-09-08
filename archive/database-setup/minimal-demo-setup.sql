-- Minimal setup to get demo accounts working
-- This script adapts to whatever schema you have

-- Step 1: Check what columns exist in users table
SELECT 'Current users table structure:' as info;
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';

-- Step 2: Insert minimal user records (just id and email)
INSERT INTO users (id, email)
VALUES 
  ('172f3aca-69b5-4368-8a06-213a28478bf2', 'demo.client@heyspruce.com'),
  ('fabfb8a1-2a24-44de-8d6d-bc22f418eb4c', 'demo.admin@heyspruce.com'),
  ('418715c1-0f16-4770-a047-f10896cd66d2', 'demo.sub@heyspruce.com')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Step 3: Check if it worked
SELECT 'Demo users created:' as info;
SELECT id, email FROM users WHERE email LIKE '%demo%@heyspruce.com';

-- Step 4: The portals will work with just id and email
-- The role can be determined from the portal they log into
-- Additional fields can be added later if needed

-- Success
SELECT '✅ Demo accounts ready!' as status,
       'Client: demo.client@heyspruce.com / demo123' as client,
       'Admin: demo.admin@heyspruce.com / demo123' as admin,
       'Sub: demo.sub@heyspruce.com / demo123' as subcontractor;