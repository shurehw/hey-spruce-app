-- Check what role values are actually allowed
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND contype = 'c';

-- Also check if there are any existing users to see what roles are used
SELECT DISTINCT role FROM users WHERE role IS NOT NULL;

-- Let's try using 'client' role for all demo accounts for now
-- This will at least get them into the system
INSERT INTO users (id, email, name, role)
VALUES 
  ('172f3aca-69b5-4368-8a06-213a28478bf2', 'demo.client@heyspruce.com', 'Demo Client User', 'client'),
  ('fabfb8a1-2a24-44de-8d6d-bc22f418eb4c', 'demo.admin@heyspruce.com', 'Demo Admin User', 'admin'),
  ('418715c1-0f16-4770-a047-f10896cd66d2', 'demo.sub@heyspruce.com', 'Demo Subcontractor', 'client')  -- Using 'client' for now
ON CONFLICT (id) DO UPDATE 
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Verify the users were created
SELECT id, email, name, role FROM users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');

-- Note about roles
SELECT '⚠️ NOTE: Subcontractor account created with "client" role' as warning,
       'The portal selection on login determines actual access' as info,
       'Select "Subcontractor" portal when logging in with demo.sub@heyspruce.com' as instruction;

-- Success message
SELECT '✅ Demo accounts are ready!' as status;
SELECT 'Login at: https://openwrench-portal.vercel.app/portal-login' as url;