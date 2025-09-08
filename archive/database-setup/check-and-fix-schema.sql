-- First, let's see what columns the users table actually has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- If the table doesn't have the right columns, we need to either:
-- Option 1: Add the missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Option 2: Or if the columns have different names, let's check what they are
-- and insert accordingly. Common variations might be:
-- name instead of full_name
-- user_role instead of role
-- company instead of company_name

-- After adding columns (if needed), insert the demo profiles
-- Using simpler INSERT that should work with minimal columns
INSERT INTO users (id, email)
VALUES 
  ('172f3aca-69b5-4368-8a06-213a28478bf2', 'demo.client@heyspruce.com'),
  ('fabfb8a1-2a24-44de-8d6d-bc22f418eb4c', 'demo.admin@heyspruce.com'),
  ('418715c1-0f16-4770-a047-f10896cd66d2', 'demo.sub@heyspruce.com')
ON CONFLICT (id) DO NOTHING;

-- Now update with additional info if columns exist
UPDATE users SET full_name = 'Demo Client User' WHERE id = '172f3aca-69b5-4368-8a06-213a28478bf2';
UPDATE users SET full_name = 'Demo Admin User' WHERE id = 'fabfb8a1-2a24-44de-8d6d-bc22f418eb4c';
UPDATE users SET full_name = 'Demo Subcontractor' WHERE id = '418715c1-0f16-4770-a047-f10896cd66d2';

UPDATE users SET role = 'client' WHERE id = '172f3aca-69b5-4368-8a06-213a28478bf2';
UPDATE users SET role = 'admin' WHERE id = 'fabfb8a1-2a24-44de-8d6d-bc22f418eb4c';
UPDATE users SET role = 'subcontractor' WHERE id = '418715c1-0f16-4770-a047-f10896cd66d2';

UPDATE users SET company_name = 'Demo Property Management' WHERE id = '172f3aca-69b5-4368-8a06-213a28478bf2';
UPDATE users SET company_name = 'Hey Spruce Admin' WHERE id = 'fabfb8a1-2a24-44de-8d6d-bc22f418eb4c';
UPDATE users SET company_name = 'Demo Landscaping Co' WHERE id = '418715c1-0f16-4770-a047-f10896cd66d2';

-- Verify what we have
SELECT * FROM users WHERE email LIKE '%demo%@heyspruce.com';