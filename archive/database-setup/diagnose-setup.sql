-- Diagnostic SQL to check your Supabase setup
-- Run each section to understand the current state

-- 1. Check if demo users already exist in auth
SELECT 'Checking existing auth users:' as step;
SELECT id, email, created_at, email_confirmed_at, last_sign_in_at
FROM auth.users 
WHERE email LIKE '%demo%' OR email LIKE '%heyspruce%'
ORDER BY created_at DESC;

-- 2. Check users table structure
SELECT 'Checking users table structure:' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 3. Check if users table exists
SELECT 'Checking if users table exists:' as step;
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'users'
) as users_table_exists;

-- 4. Check existing user profiles
SELECT 'Checking existing user profiles:' as step;
SELECT * FROM users LIMIT 5;

-- 5. Check for any constraints or policies
SELECT 'Checking RLS policies:' as step;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'users';

-- 6. Check if properties table exists
SELECT 'Checking if properties table exists:' as step;
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'properties'
) as properties_table_exists;

-- 7. Check if work_orders table exists
SELECT 'Checking if work_orders table exists:' as step;
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'work_orders'
) as work_orders_table_exists;

-- 8. Try to create a simple test user (safe to run)
SELECT 'Attempting to create test profile:' as step;
DO $$
BEGIN
  -- This will only insert if a user with email 'test@example.com' exists in auth.users
  INSERT INTO users (id, email, full_name, role, company_name)
  SELECT id, email, 'Test User', 'client', 'Test Company'
  FROM auth.users 
  WHERE email = 'test@example.com'
  ON CONFLICT (id) DO NOTHING;
  
  IF FOUND THEN
    RAISE NOTICE 'Test profile created successfully';
  ELSE
    RAISE NOTICE 'No test user found in auth.users or profile already exists';
  END IF;
END $$;

-- 9. Check authentication configuration
SELECT 'Checking auth configuration:' as step;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users LIMIT 1) 
    THEN 'Auth system is working'
    ELSE 'No users in auth system'
  END as auth_status;