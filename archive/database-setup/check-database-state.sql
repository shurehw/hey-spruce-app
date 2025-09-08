-- Diagnostic Script to Check Current Database State
-- Run this to see exactly what columns exist in each table

-- =====================================================
-- 1. CHECK IF QUOTES TABLE EXISTS
-- =====================================================
SELECT 
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'quotes'
    ) as quotes_table_exists;

-- =====================================================
-- 2. LIST ALL COLUMNS IN QUOTES TABLE (if it exists)
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'quotes'
ORDER BY ordinal_position;

-- =====================================================
-- 3. CHECK SPECIFIC COLUMN EXISTS
-- =====================================================
SELECT 
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'expiry_date'
    ) as expiry_date_exists,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'expiration_date'
    ) as expiration_date_exists,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'expires_at'
    ) as expires_at_exists,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'valid_until'
    ) as valid_until_exists;

-- =====================================================
-- 4. SHOW CREATE TABLE STATEMENT (PostgreSQL way)
-- =====================================================
SELECT 
    'CREATE TABLE ' || table_name || ' (' || 
    string_agg(
        column_name || ' ' || 
        data_type || 
        CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE 
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END ||
        CASE 
            WHEN column_default IS NOT NULL 
            THEN ' DEFAULT ' || column_default
            ELSE ''
        END,
        ', '
        ORDER BY ordinal_position
    ) || ');' AS create_statement
FROM information_schema.columns
WHERE table_name = 'quotes'
GROUP BY table_name;

-- =====================================================
-- 5. CHECK WORK_ORDERS COLUMNS
-- =====================================================
SELECT 
    'work_orders' as table_name,
    column_name,
    data_type,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns c2 
        WHERE c2.table_name = 'work_orders' 
        AND c2.column_name IN ('reminder_24hr_sent', 'reminder_1hr_sent', 'is_delayed')
    ) as has_notification_columns
FROM information_schema.columns
WHERE table_name = 'work_orders'
AND column_name IN (
    'reminder_24hr_sent', 
    'reminder_1hr_sent', 
    'is_delayed', 
    'estimated_arrival',
    'review_submitted',
    'scheduled_date',
    'status'
)
ORDER BY column_name;

-- =====================================================
-- 6. FIX: Add missing expiry_date column if needed
-- =====================================================
DO $$
BEGIN
    -- Check if quotes table exists but expiry_date column is missing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'expiry_date') THEN
        
        -- Add the missing column
        ALTER TABLE quotes ADD COLUMN expiry_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days');
        RAISE NOTICE 'Added expiry_date column to quotes table';
        
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'expiry_date') THEN
        RAISE NOTICE 'expiry_date column already exists in quotes table';
    ELSE
        RAISE NOTICE 'quotes table does not exist';
    END IF;
END $$;

-- =====================================================
-- 7. NOW TRY TO CREATE THE INDEX AGAIN
-- =====================================================
DO $$
BEGIN
    -- Only create index if both table and column exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'expiry_date') THEN
        
        -- Drop the index if it exists (to recreate fresh)
        DROP INDEX IF EXISTS idx_quotes_expiring;
        
        -- Create the index
        CREATE INDEX idx_quotes_expiring 
        ON quotes(expiry_date, status) 
        WHERE status = 'pending';
        
        RAISE NOTICE 'Successfully created idx_quotes_expiring index';
    ELSE
        RAISE NOTICE 'Cannot create index - quotes table or expiry_date column missing';
    END IF;
END $$;

-- =====================================================
-- 8. VERIFY FINAL STATE
-- =====================================================
SELECT 
    'Final Check' as check_type,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') as quotes_exists,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'expiry_date') as expiry_date_exists,
    EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'quotes' AND indexname = 'idx_quotes_expiring') as index_exists;