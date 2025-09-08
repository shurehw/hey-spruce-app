-- Fix Row Level Security policies for demo accounts

-- Check if user_profiles table exists and what policies it has
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'users');

-- Disable RLS temporarily to allow access (if you're admin)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Or create permissive policies that allow users to manage their own data
-- For user_profiles table
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- For users table (if needed)
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Alternative: Create a more permissive policy for testing
CREATE POLICY "Allow all for authenticated users" ON user_profiles
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON users
    FOR ALL USING (auth.role() = 'authenticated');

-- Check the current user making the request
SELECT auth.uid() as current_user_id, auth.role() as current_role;

-- Verify policies are working
SELECT 'Policies updated. Try logging in again.' as message;