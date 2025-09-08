-- Update existing demo profiles with correct auth user IDs
-- First, get the NEW auth user IDs you just created
SELECT id, email 
FROM auth.users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com')
ORDER BY email;

-- Delete old profiles that have wrong IDs
DELETE FROM users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');

-- Now insert fresh profiles with correct IDs from the auth users you just created
INSERT INTO users (id, email, name, role)
SELECT 
    id, 
    email,
    CASE 
        WHEN email = 'demo.client@heyspruce.com' THEN 'Demo Client'
        WHEN email = 'demo.admin@heyspruce.com' THEN 'Demo Admin'
        WHEN email = 'demo.sub@heyspruce.com' THEN 'Demo Subcontractor'
    END as name,
    CASE 
        WHEN email = 'demo.client@heyspruce.com' THEN 'client'
        WHEN email = 'demo.admin@heyspruce.com' THEN 'admin'
        WHEN email = 'demo.sub@heyspruce.com' THEN 'client'  -- Using 'client' role for subcontractor
    END as role
FROM auth.users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');

-- Verify all profiles are correct
SELECT u.email, u.name, u.role, u.id, 
       CASE WHEN au.id IS NOT NULL THEN '✅ Linked to auth' ELSE '❌ No auth user' END as status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com', 'test@example.com')
ORDER BY u.email;

-- Success
SELECT '✅ Demo profiles updated with correct auth IDs!' as status;
SELECT 'Now test login at: test-login.html' as next_step;