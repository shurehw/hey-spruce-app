-- SAFE Database Updates - Run Each Block Separately
-- First, let's check what tables already exist

-- =====================================================
-- CHECK EXISTING TABLES (Run this first)
-- =====================================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('work_orders', 'clients', 'quotes', 'reviews', 'payments', 'invoices', 'notifications')
ORDER BY table_name;

-- =====================================================
-- SECTION 1: WORK ORDERS UPDATES ONLY
-- =====================================================
DO $$ 
BEGIN
    -- Only update if work_orders table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_orders') THEN
        -- Add columns one by one to avoid failures
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'reminder_24hr_sent') THEN
            ALTER TABLE work_orders ADD COLUMN reminder_24hr_sent BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'reminder_1hr_sent') THEN
            ALTER TABLE work_orders ADD COLUMN reminder_1hr_sent BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'is_delayed') THEN
            ALTER TABLE work_orders ADD COLUMN is_delayed BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'estimated_arrival') THEN
            ALTER TABLE work_orders ADD COLUMN estimated_arrival TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'review_submitted') THEN
            ALTER TABLE work_orders ADD COLUMN review_submitted BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'review_reminder_sent') THEN
            ALTER TABLE work_orders ADD COLUMN review_reminder_sent BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'tech_location') THEN
            ALTER TABLE work_orders ADD COLUMN tech_location JSONB;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'tech_eta') THEN
            ALTER TABLE work_orders ADD COLUMN tech_eta TIMESTAMP WITH TIME ZONE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'actual_arrival_time') THEN
            ALTER TABLE work_orders ADD COLUMN actual_arrival_time TIMESTAMP WITH TIME ZONE;
        END IF;
        
        RAISE NOTICE 'Work orders table updated successfully';
    ELSE
        RAISE NOTICE 'Work orders table does not exist - skipping updates';
    END IF;
END $$;

-- =====================================================
-- SECTION 2: CLIENTS UPDATES ONLY
-- =====================================================
DO $$ 
BEGIN
    -- Only update if clients table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        -- Add columns one by one
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'renewal_90_sent') THEN
            ALTER TABLE clients ADD COLUMN renewal_90_sent BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'renewal_60_sent') THEN
            ALTER TABLE clients ADD COLUMN renewal_60_sent BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'renewal_30_sent') THEN
            ALTER TABLE clients ADD COLUMN renewal_30_sent BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'account_manager_id') THEN
            ALTER TABLE clients ADD COLUMN account_manager_id UUID REFERENCES user_profiles(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'primary_contact_id') THEN
            ALTER TABLE clients ADD COLUMN primary_contact_id UUID REFERENCES user_profiles(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'contract_value') THEN
            ALTER TABLE clients ADD COLUMN contract_value DECIMAL(10,2);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'auto_renew') THEN
            ALTER TABLE clients ADD COLUMN auto_renew BOOLEAN DEFAULT false;
        END IF;
        
        RAISE NOTICE 'Clients table updated successfully';
    ELSE
        RAISE NOTICE 'Clients table does not exist - skipping updates';
    END IF;
END $$;

-- =====================================================
-- SECTION 3: CREATE QUOTES TABLE ONLY
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
        CREATE TABLE quotes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            quote_number TEXT UNIQUE NOT NULL,
            client_id UUID REFERENCES clients(id),
            service_description TEXT NOT NULL,
            line_items JSONB DEFAULT '[]'::JSONB,
            subtotal DECIMAL(10,2) NOT NULL,
            tax_amount DECIMAL(10,2) DEFAULT 0,
            total_amount DECIMAL(10,2) NOT NULL,
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'expired')),
            valid_from DATE DEFAULT CURRENT_DATE,
            expiry_date DATE NOT NULL,
            terms_conditions TEXT,
            notes TEXT,
            created_by UUID REFERENCES user_profiles(id),
            approved_by UUID REFERENCES user_profiles(id),
            approved_at TIMESTAMP WITH TIME ZONE,
            rejection_reason TEXT,
            expiry_warning_sent BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Quotes table created successfully';
    ELSE
        RAISE NOTICE 'Quotes table already exists';
    END IF;
END $$;

-- =====================================================
-- SECTION 4: CREATE OTHER NEW TABLES
-- =====================================================

-- Reviews table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        CREATE TABLE reviews (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            work_order_id UUID REFERENCES work_orders(id),
            client_id UUID REFERENCES clients(id),
            client_name TEXT,
            tech_id UUID REFERENCES user_profiles(id),
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            service_type TEXT,
            response TEXT,
            response_by UUID REFERENCES user_profiles(id),
            response_at TIMESTAMP WITH TIME ZONE,
            is_public BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Reviews table created successfully';
    ELSE
        RAISE NOTICE 'Reviews table already exists';
    END IF;
END $$;

-- Service Recovery Tasks table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_recovery_tasks') THEN
        CREATE TABLE service_recovery_tasks (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            review_id UUID REFERENCES reviews(id),
            client_id UUID REFERENCES clients(id),
            assigned_to UUID REFERENCES user_profiles(id),
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'escalated')),
            priority TEXT DEFAULT 'high' CHECK (priority IN ('normal', 'high', 'urgent')),
            actions_taken TEXT[],
            resolution TEXT,
            follow_up_date DATE,
            due_date DATE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            resolved_at TIMESTAMP WITH TIME ZONE
        );
        RAISE NOTICE 'Service recovery tasks table created successfully';
    ELSE
        RAISE NOTICE 'Service recovery tasks table already exists';
    END IF;
END $$;

-- =====================================================
-- SECTION 5: CREATE INDEXES SAFELY
-- =====================================================

-- Only create index if table AND column exist
DO $$ 
BEGIN
    -- Work orders indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_orders') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'scheduled_date') THEN
            CREATE INDEX IF NOT EXISTS idx_work_orders_reminders 
            ON work_orders(scheduled_date, status) 
            WHERE status = 'assigned';
            RAISE NOTICE 'Work orders index created';
        END IF;
    END IF;
    
    -- Clients indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'contract_end_date') THEN
            CREATE INDEX IF NOT EXISTS idx_clients_renewals 
            ON clients(contract_end_date) 
            WHERE contract_status = 'active';
            RAISE NOTICE 'Clients index created';
        END IF;
    END IF;
    
    -- Quotes indexes - ONLY if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'expiry_date') THEN
            CREATE INDEX IF NOT EXISTS idx_quotes_expiring 
            ON quotes(expiry_date, status) 
            WHERE status = 'pending';
            RAISE NOTICE 'Quotes index created';
        ELSE
            RAISE NOTICE 'Quotes table exists but expiry_date column not found';
        END IF;
    ELSE
        RAISE NOTICE 'Quotes table does not exist - skipping index creation';
    END IF;
    
    -- Reviews indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        CREATE INDEX IF NOT EXISTS idx_reviews_low_rating 
        ON reviews(rating) 
        WHERE rating <= 2;
        RAISE NOTICE 'Reviews index created';
    END IF;
END $$;

-- =====================================================
-- SECTION 6: VERIFY ALL UPDATES
-- =====================================================

-- Check work_orders columns
SELECT 
    'work_orders' as table_name,
    column_name, 
    data_type,
    CASE WHEN column_name IN ('reminder_24hr_sent', 'reminder_1hr_sent', 'is_delayed') 
         THEN 'NEW' ELSE 'EXISTING' END as status
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND column_name IN ('reminder_24hr_sent', 'reminder_1hr_sent', 'is_delayed', 'estimated_arrival', 'review_submitted')
ORDER BY column_name;

-- Check if quotes table was created with correct columns
SELECT 
    'quotes' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'quotes'
AND column_name IN ('id', 'quote_number', 'expiry_date', 'status')
ORDER BY column_name;

-- List all indexes on quotes table (if it exists)
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'quotes';