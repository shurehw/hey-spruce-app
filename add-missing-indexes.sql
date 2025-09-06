-- Add Missing Indexes for Notification System
-- Run after tables have been created

-- =====================================================
-- QUOTES TABLE - Add expiring quotes index
-- =====================================================
-- This index helps find quotes that are about to expire
CREATE INDEX IF NOT EXISTS idx_quotes_expiring 
ON quotes(expiry_date, status) 
WHERE status = 'pending';

-- =====================================================
-- WORK ORDERS - Add notification tracking indexes
-- =====================================================
-- This helps find work orders that need reminders sent
CREATE INDEX IF NOT EXISTS idx_work_orders_reminders 
ON work_orders(scheduled_date, status) 
WHERE status = 'assigned' AND (reminder_24hr_sent = false OR reminder_1hr_sent = false);

-- Index for finding delayed work orders
CREATE INDEX IF NOT EXISTS idx_work_orders_delayed
ON work_orders(is_delayed, status)
WHERE is_delayed = true AND status IN ('assigned', 'in_progress');

-- =====================================================
-- CLIENTS - Add renewal tracking indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clients_renewals 
ON clients(contract_end_date) 
WHERE contract_status = 'active';

-- Index for finding clients by account manager
CREATE INDEX IF NOT EXISTS idx_clients_account_manager
ON clients(account_manager_id)
WHERE account_manager_id IS NOT NULL;

-- =====================================================
-- REVIEWS - Add rating indexes
-- =====================================================
-- Fast lookup of negative reviews
CREATE INDEX IF NOT EXISTS idx_reviews_low_rating 
ON reviews(rating) 
WHERE rating <= 2;

-- Index for finding unresponded reviews
CREATE INDEX IF NOT EXISTS idx_reviews_no_response
ON reviews(created_at, response)
WHERE response IS NULL;

-- =====================================================
-- NOTIFICATIONS - Optimize notification queries
-- =====================================================
-- Find unread notifications efficiently
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications(user_id, read, created_at DESC) 
WHERE read = false;

-- Find recent notifications by type
CREATE INDEX IF NOT EXISTS idx_notifications_by_type
ON notifications(user_id, type, created_at DESC);

-- =====================================================
-- VERIFY ALL INDEXES WERE CREATED
-- =====================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('quotes', 'work_orders', 'clients', 'reviews', 'notifications')
ORDER BY tablename, indexname;

-- =====================================================
-- CHECK TABLE STATISTICS
-- =====================================================
SELECT 
    t.table_name,
    t.table_type,
    COALESCE(s.n_live_tup, 0) as row_count,
    pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name))) as total_size
FROM information_schema.tables t
LEFT JOIN pg_stat_user_tables s ON s.schemaname = t.table_schema AND s.relname = t.table_name
WHERE t.table_schema = 'public'
AND t.table_name IN ('quotes', 'work_orders', 'clients', 'reviews', 'notifications', 'payments', 'invoices')
ORDER BY t.table_name;