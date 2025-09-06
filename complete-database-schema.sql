-- Complete Database Schema for Hey Spruce Portal System
-- This includes all tables needed for full functionality

-- =====================================================
-- USERS & AUTH (Integrates with Supabase Auth)
-- =====================================================

-- Create user profiles that extend Supabase auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('client', 'admin', 'subcontractor', 'field_tech', 'viewer')),
    portal_access TEXT[] DEFAULT ARRAY[]::TEXT[], -- Which portals they can access
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User permissions for granular access control
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    resource TEXT NOT NULL, -- e.g., 'work_orders', 'invoices', 'rfps'
    action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
    conditions JSONB DEFAULT '{}'::JSONB, -- Additional conditions
    granted_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, resource, action)
);

-- =====================================================
-- CLIENTS & ORGANIZATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT DEFAULT 'USA',
    logo_url TEXT,
    contract_status TEXT DEFAULT 'active' CHECK (contract_status IN ('active', 'inactive', 'pending')),
    contract_start_date DATE,
    contract_end_date DATE,
    billing_address TEXT,
    payment_terms TEXT DEFAULT 'Net 30',
    credit_limit DECIMAL(10,2),
    current_balance DECIMAL(10,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link users to clients (many-to-many)
CREATE TABLE IF NOT EXISTS client_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, user_id)
);

-- =====================================================
-- ENHANCED WORK ORDERS
-- =====================================================

DROP TABLE IF EXISTS work_orders CASCADE;

CREATE TABLE work_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    location_id UUID REFERENCES locations(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    service_type TEXT,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'standard', 'urgent', 'emergency')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    
    -- Assignment
    assigned_to UUID REFERENCES user_profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    assignment_notes TEXT,
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_time TEXT,
    estimated_duration INTEGER, -- in minutes
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Work details
    checklist JSONB DEFAULT '[]'::JSONB,
    work_performed TEXT,
    materials_used JSONB DEFAULT '[]'::JSONB,
    
    -- Completion
    completed_by UUID REFERENCES user_profiles(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    signature_url TEXT,
    
    -- Billing
    billable BOOLEAN DEFAULT true,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    invoice_id UUID,
    
    -- Attachments
    photos TEXT[],
    documents TEXT[],
    
    -- Metadata
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work order status history
CREATE TABLE IF NOT EXISTS work_order_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    changed_by UUID REFERENCES user_profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'work_order', 'invoice', 'rfp', 'message', 'system'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::JSONB, -- Additional data like work_order_id, invoice_id, etc.
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    action_url TEXT, -- Where to go when clicked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
    enabled BOOLEAN DEFAULT true,
    categories JSONB DEFAULT '{
        "work_orders": true,
        "invoices": true,
        "rfps": true,
        "messages": true,
        "system": true
    }'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel)
);

-- =====================================================
-- MESSAGING SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'work_order', 'rfp')),
    related_id UUID, -- work_order_id or rfp_id if applicable
    participants UUID[], -- Array of user_ids
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES user_profiles(id),
    message TEXT NOT NULL,
    attachments TEXT[],
    read_by UUID[], -- Array of user_ids who have read the message
    edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- RFP & BIDDING SYSTEM
-- =====================================================

-- Enhanced RFPs table
DROP TABLE IF EXISTS rfps CASCADE;

CREATE TABLE rfps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rfp_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    title TEXT NOT NULL,
    description TEXT,
    location_id UUID REFERENCES locations(id),
    location_name TEXT,
    scope_of_work TEXT,
    requirements JSONB DEFAULT '[]'::JSONB,
    
    -- Budget
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    budget_visibility TEXT DEFAULT 'hidden' CHECK (budget_visibility IN ('hidden', 'range', 'exact')),
    
    -- Timeline
    issued_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    project_start_date DATE,
    project_end_date DATE,
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'evaluating', 'awarded', 'cancelled', 'closed')),
    
    -- Selection
    evaluation_criteria JSONB DEFAULT '{}'::JSONB,
    selected_bid_id UUID,
    selection_notes TEXT,
    
    -- Attachments
    documents TEXT[],
    
    -- Metadata
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bids/Proposals
CREATE TABLE IF NOT EXISTS bids (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rfp_id UUID REFERENCES rfps(id) ON DELETE CASCADE,
    bidder_id UUID REFERENCES user_profiles(id),
    company_name TEXT,
    bid_number TEXT UNIQUE NOT NULL,
    
    -- Pricing
    total_amount DECIMAL(10,2) NOT NULL,
    cost_breakdown JSONB DEFAULT '{}'::JSONB,
    
    -- Proposal details
    executive_summary TEXT,
    technical_approach TEXT,
    timeline JSONB DEFAULT '[]'::JSONB,
    team_members JSONB DEFAULT '[]'::JSONB,
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    
    -- Evaluation
    score DECIMAL(3,2),
    evaluation_notes TEXT,
    
    -- Attachments
    documents TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PAYMENTS & INVOICING
-- =====================================================

-- Enhanced invoices table
DROP TABLE IF EXISTS invoices CASCADE;

CREATE TABLE invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    work_order_id UUID REFERENCES work_orders(id),
    quote_id UUID REFERENCES quotes(id),
    
    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Payment details
    due_date DATE,
    payment_terms TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled')),
    
    -- Line items
    line_items JSONB NOT NULL DEFAULT '[]'::JSONB,
    
    -- Payment tracking
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    
    -- Metadata
    notes TEXT,
    internal_notes TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment records
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('credit_card', 'debit_card', 'ach', 'check', 'cash', 'other')),
    payment_date DATE DEFAULT CURRENT_DATE,
    reference_number TEXT,
    processor TEXT, -- 'stripe', 'manual', etc.
    processor_fee DECIMAL(10,2),
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AUDIT LOGGING
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FILE UPLOADS
-- =====================================================

CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    storage_path TEXT NOT NULL,
    url TEXT,
    thumbnail_url TEXT,
    uploaded_by UUID REFERENCES user_profiles(id),
    entity_type TEXT, -- 'work_order', 'invoice', 'rfp', etc.
    entity_id UUID,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_work_orders_client ON work_orders(client_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_assigned ON work_orders(assigned_to);
CREATE INDEX idx_work_orders_scheduled ON work_orders(scheduled_date);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfps ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (to be refined based on requirements)
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view work orders they're assigned to" ON work_orders 
    FOR SELECT USING (auth.uid() = assigned_to OR auth.uid() = created_by);

CREATE POLICY "Admins can do everything" ON work_orders 
    FOR ALL USING (EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfps_updated_at BEFORE UPDATE ON rfps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate work order numbers
CREATE OR REPLACE FUNCTION generate_work_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    year_month TEXT;
    seq_num INTEGER;
BEGIN
    year_month := TO_CHAR(NOW(), 'YYYY-MM');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'WO-\d{4}-\d{2}-(\d+)') AS INTEGER)), 0) + 1
    INTO seq_num
    FROM work_orders
    WHERE order_number LIKE 'WO-' || year_month || '-%';
    
    new_number := 'WO-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to log work order status changes
CREATE OR REPLACE FUNCTION log_work_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO work_order_history (work_order_id, status, changed_by)
        VALUES (NEW.id, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_work_order_status AFTER UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION log_work_order_status_change();

-- Function to handle new user creation from auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'client')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();