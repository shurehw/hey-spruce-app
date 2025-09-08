-- Database Updates Required for Priority Notifications
-- Run these ALTER statements to add missing columns

-- =====================================================
-- WORK ORDERS TABLE UPDATES
-- =====================================================

-- Add reminder tracking columns
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS reminder_24hr_sent BOOLEAN DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS reminder_1hr_sent BOOLEAN DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS estimated_arrival TIMESTAMP WITH TIME ZONE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS review_submitted BOOLEAN DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS review_reminder_sent BOOLEAN DEFAULT false;

-- Add location tracking for tech
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS tech_location JSONB;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS tech_eta TIMESTAMP WITH TIME ZONE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS actual_arrival_time TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- CLIENTS TABLE UPDATES (Contract Renewals)
-- =====================================================

-- Add renewal tracking columns
ALTER TABLE clients ADD COLUMN IF NOT EXISTS renewal_90_sent BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS renewal_60_sent BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS renewal_30_sent BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS account_manager_id UUID REFERENCES user_profiles(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES user_profiles(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_value DECIMAL(10,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;

-- =====================================================
-- QUOTES TABLE (New table for quote management)
-- =====================================================

CREATE TABLE IF NOT EXISTS quotes (
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

-- =====================================================
-- REVIEWS TABLE (For tracking service reviews)
-- =====================================================

CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    work_order_id UUID REFERENCES work_orders(id),
    client_id UUID REFERENCES clients(id),
    client_name TEXT,
    tech_id UUID REFERENCES user_profiles(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    service_type TEXT,
    response TEXT, -- Admin response to review
    response_by UUID REFERENCES user_profiles(id),
    response_at TIMESTAMP WITH TIME ZONE,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for quick negative review lookups
CREATE INDEX IF NOT EXISTS idx_reviews_low_rating ON reviews(rating) WHERE rating <= 2;

-- =====================================================
-- SERVICE RECOVERY TASKS (For negative reviews)
-- =====================================================

CREATE TABLE IF NOT EXISTS service_recovery_tasks (
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

-- =====================================================
-- PAYMENT FAILURES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_failures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID REFERENCES payments(id),
    invoice_id UUID REFERENCES invoices(id),
    client_id UUID REFERENCES clients(id),
    amount DECIMAL(10,2) NOT NULL,
    failure_reason TEXT,
    failure_code TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TECH LOCATION TRACKING (For running late alerts)
-- =====================================================

CREATE TABLE IF NOT EXISTS tech_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tech_id UUID REFERENCES user_profiles(id),
    work_order_id UUID REFERENCES work_orders(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy INTEGER, -- meters
    speed DECIMAL(5, 2), -- km/h
    heading INTEGER, -- degrees
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient location queries
CREATE INDEX IF NOT EXISTS idx_tech_locations_recent 
ON tech_locations(tech_id, timestamp DESC);

-- =====================================================
-- NOTIFICATION TEMPLATES (For consistent messaging)
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL UNIQUE,
    channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push')),
    subject_template TEXT,
    body_template TEXT NOT NULL,
    variables TEXT[], -- List of required variables
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default templates
INSERT INTO notification_templates (type, channel, subject_template, body_template, variables) VALUES
('appointment_24hr', 'sms', NULL, 'Reminder: {{service_type}} service scheduled for tomorrow at {{scheduled_time}}. Tech: {{tech_name}}', ARRAY['service_type', 'scheduled_time', 'tech_name']),
('appointment_1hr', 'sms', NULL, 'Your {{service_type}} service starts in 1 hour. {{tech_name}} will arrive at {{scheduled_time}}.', ARRAY['service_type', 'tech_name', 'scheduled_time']),
('tech_running_late', 'sms', NULL, 'Your technician is running {{delay_minutes}} min late. New arrival time: {{estimated_arrival}}', ARRAY['delay_minutes', 'estimated_arrival']),
('payment_failed', 'email', 'Payment Failed - Action Required', 'Your payment of ${{amount}} could not be processed. Please update your payment method at {{action_url}}', ARRAY['amount', 'action_url']),
('contract_renewal_30', 'email', 'Contract Expiring Soon', 'Your service contract expires in 30 days on {{contract_end_date}}. Contact us to discuss renewal options.', ARRAY['contract_end_date']),
('negative_review_alert', 'push', 'Negative Review Alert', '{{client_name}} left a {{rating}}-star review. Immediate action required.', ARRAY['client_name', 'rating'])
ON CONFLICT (type) DO NOTHING;

-- =====================================================
-- NOTIFICATION QUEUE (For reliable delivery)
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID REFERENCES notifications(id),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    recipient TEXT NOT NULL, -- email address or phone number
    subject TEXT,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    sent_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for queue processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending 
ON notification_queue(status, scheduled_for) 
WHERE status = 'pending';

-- =====================================================
-- FUNCTIONS FOR NOTIFICATION TRIGGERS
-- =====================================================

-- Function to automatically create notifications on work order status change
CREATE OR REPLACE FUNCTION notify_work_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if status actually changed
    IF NEW.status != OLD.status THEN
        -- Insert notification based on status
        IF NEW.status = 'assigned' AND NEW.assigned_to IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, message, data, priority, action_url)
            VALUES (
                NEW.assigned_to,
                'work_order_assigned',
                'New Work Order Assignment',
                'You have been assigned a new work order',
                jsonb_build_object('work_order_id', NEW.id, 'status', NEW.status),
                CASE WHEN NEW.priority = 'emergency' THEN 'urgent' ELSE 'high' END,
                '/work-orders/' || NEW.id
            );
        ELSIF NEW.status = 'completed' THEN
            INSERT INTO notifications (user_id, type, title, message, data, priority, action_url)
            VALUES (
                NEW.client_id,
                'work_order_completed',
                'Service Completed',
                'Your service request has been completed',
                jsonb_build_object('work_order_id', NEW.id, 'status', NEW.status),
                'normal',
                '/work-orders/' || NEW.id || '/review'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for work order status changes
DROP TRIGGER IF EXISTS work_order_status_notification ON work_orders;
CREATE TRIGGER work_order_status_notification
    AFTER UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_work_order_status_change();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Only create indexes after tables exist
CREATE INDEX IF NOT EXISTS idx_work_orders_reminders 
ON work_orders(scheduled_date, status) 
WHERE status = 'assigned' AND (reminder_24hr_sent = false OR reminder_1hr_sent = false);

CREATE INDEX IF NOT EXISTS idx_clients_renewals 
ON clients(contract_end_date) 
WHERE contract_status = 'active';

-- Only create if quotes table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
        CREATE INDEX IF NOT EXISTS idx_quotes_expiring 
        ON quotes(expiry_date, status) 
        WHERE status = 'pending';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications(user_id, read, created_at DESC) 
WHERE read = false;