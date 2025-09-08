-- Document Management System Tables for Hey Spruce
-- Created: January 2025

-- 1. Document folders table
CREATE TABLE IF NOT EXISTS document_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'general', -- 'contract', 'insurance', 'license', 'invoice', 'report', 'general'
    category VARCHAR(50), -- 'legal', 'financial', 'compliance', 'operational'
    file_url TEXT,
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES auth.users(id),
    version INTEGER DEFAULT 1,
    is_template BOOLEAN DEFAULT false,
    requires_signature BOOLEAN DEFAULT false,
    signed_at TIMESTAMP WITH TIME ZONE,
    signed_by UUID REFERENCES auth.users(id),
    expires_at DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Document shares table
CREATE TABLE IF NOT EXISTS document_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permission VARCHAR(20) DEFAULT 'view', -- 'view', 'edit', 'admin'
    shared_by UUID REFERENCES auth.users(id),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(document_id, user_id)
);

-- 4. Document versions table (for tracking changes)
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    file_url TEXT,
    file_path TEXT,
    file_size BIGINT,
    change_summary TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Document signatures table
CREATE TABLE IF NOT EXISTS document_signatures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    signer_id UUID REFERENCES auth.users(id),
    signature_data TEXT, -- Base64 encoded signature image or digital signature
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    is_valid BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. Document templates table
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    category VARCHAR(50),
    content TEXT, -- HTML or markdown content with variables
    variables JSONB DEFAULT '[]'::jsonb, -- List of variables like {{client_name}}, {{date}}
    created_by UUID REFERENCES auth.users(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_documents_folder ON documents(folder_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_expires ON documents(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_document_shares_user ON document_shares(user_id);
CREATE INDEX idx_document_folders_owner ON document_folders(owner_id);
CREATE INDEX idx_document_folders_parent ON document_folders(parent_id);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Documents: Users can see their own documents
CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT USING (owner_id = auth.uid());

-- Documents: Users can see shared documents
CREATE POLICY "Users can view shared documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM document_shares
            WHERE document_shares.document_id = documents.id
            AND document_shares.user_id = auth.uid()
            AND (document_shares.expires_at IS NULL OR document_shares.expires_at > CURRENT_TIMESTAMP)
        )
    );

-- Documents: Users can create documents
CREATE POLICY "Users can create documents" ON documents
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Documents: Users can update their own documents
CREATE POLICY "Users can update own documents" ON documents
    FOR UPDATE USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Documents: Users can delete their own documents
CREATE POLICY "Users can delete own documents" ON documents
    FOR DELETE USING (owner_id = auth.uid());

-- Folders: Users can manage their own folders
CREATE POLICY "Users can manage own folders" ON document_folders
    FOR ALL USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Shares: Document owners can manage shares
CREATE POLICY "Owners can manage document shares" ON document_shares
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documents
            WHERE documents.id = document_shares.document_id
            AND documents.owner_id = auth.uid()
        )
    );

-- Shares: Users can view their shares
CREATE POLICY "Users can view their shares" ON document_shares
    FOR SELECT USING (user_id = auth.uid());

-- Versions: Users can view versions of accessible documents
CREATE POLICY "Users can view document versions" ON document_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents
            WHERE documents.id = document_versions.document_id
            AND (
                documents.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM document_shares
                    WHERE document_shares.document_id = documents.id
                    AND document_shares.user_id = auth.uid()
                )
            )
        )
    );

-- Signatures: Users can view signatures on accessible documents
CREATE POLICY "Users can view document signatures" ON document_signatures
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents
            WHERE documents.id = document_signatures.document_id
            AND (
                documents.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM document_shares
                    WHERE document_shares.document_id = documents.id
                    AND document_shares.user_id = auth.uid()
                )
            )
        )
    );

-- Templates: Users can view public templates or their own
CREATE POLICY "Users can view templates" ON document_templates
    FOR SELECT USING (
        is_public = true OR created_by = auth.uid()
    );

-- Function to auto-increment version on document update
CREATE OR REPLACE FUNCTION increment_document_version()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.file_url IS DISTINCT FROM NEW.file_url THEN
        -- Save current version to history
        INSERT INTO document_versions (
            document_id,
            version,
            file_url,
            file_path,
            file_size,
            created_by
        ) VALUES (
            NEW.id,
            OLD.version,
            OLD.file_url,
            OLD.file_path,
            OLD.file_size,
            NEW.owner_id
        );
        
        -- Increment version
        NEW.version = OLD.version + 1;
    END IF;
    
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_version_trigger
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION increment_document_version();

-- Function to check document expiration
CREATE OR REPLACE FUNCTION check_document_expiration()
RETURNS void AS $$
BEGIN
    -- Create notifications for documents expiring in 30 days
    INSERT INTO notifications (user_id, type, title, message, priority, data)
    SELECT 
        owner_id,
        'document_expiring',
        'Document Expiring Soon',
        'Document "' || name || '" expires in 30 days',
        'normal',
        jsonb_build_object('document_id', id, 'expires_at', expires_at)
    FROM documents
    WHERE expires_at = CURRENT_DATE + INTERVAL '30 days'
    AND NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE notifications.data->>'document_id' = documents.id::text
        AND notifications.type = 'document_expiring'
        AND notifications.created_at > CURRENT_TIMESTAMP - INTERVAL '1 day'
    );
    
    -- Create urgent notifications for documents expiring in 7 days
    INSERT INTO notifications (user_id, type, title, message, priority, data)
    SELECT 
        owner_id,
        'document_expiring',
        'Document Expiring in 7 Days!',
        'Document "' || name || '" expires in 7 days',
        'high',
        jsonb_build_object('document_id', id, 'expires_at', expires_at)
    FROM documents
    WHERE expires_at = CURRENT_DATE + INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule the expiration check (would need to be called by a cron job)
-- In production, use pg_cron or external scheduler to run daily:
-- SELECT check_document_expiration();