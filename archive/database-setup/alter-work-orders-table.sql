-- Option 1: Add missing columns to existing work_orders table
-- Run this if you want to keep your existing table and add new columns

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Option 2: Drop and recreate the table (WARNING: This will delete all data!)
-- Uncomment and run only if you want to start fresh

-- DROP TABLE IF EXISTS work_orders;
-- 
-- CREATE TABLE work_orders (
--     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--     title TEXT NOT NULL,
--     description TEXT,
--     location TEXT,
--     category TEXT,
--     priority TEXT,
--     status TEXT DEFAULT 'pending',
--     notes TEXT,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );
-- 
-- ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Enable all operations for work_orders" ON work_orders
--     FOR ALL
--     USING (true)
--     WITH CHECK (true);