-- Reset passwords for demo accounts
-- Unfortunately, we cannot directly set passwords via SQL in Supabase Auth
-- You need to use the Supabase Dashboard

-- First, verify the auth users exist
SELECT id, email, created_at, last_sign_in_at, email_confirmed_at
FROM auth.users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');

-- Instructions to reset passwords:
SELECT '⚠️ TO SET PASSWORDS, USE SUPABASE DASHBOARD:' as instructions;
SELECT '1. Go to Authentication → Users in Supabase Dashboard' as step1;
SELECT '2. For each demo user, click the 3 dots menu → "Send password recovery"' as step2;
SELECT '3. OR click "Reset password" and set to: demo123' as step3;
SELECT '4. Make sure "Email confirmed" is checked for each user' as step4;

-- Alternative: Delete and recreate the auth users
-- If you want to start fresh, uncomment and run these:
/*
-- First, delete from users table
DELETE FROM users WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');

-- Then go to Supabase Dashboard and:
-- 1. Delete the auth users
-- 2. Recreate them with password 'demo123'
-- 3. Re-run the insert script
*/

-- Check if email confirmation might be the issue
SELECT email, 
       CASE WHEN email_confirmed_at IS NULL THEN '❌ Not confirmed' ELSE '✅ Confirmed' END as email_status
FROM auth.users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');