const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Allowed file types
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
}).single('document');

// Helper function to verify auth token
async function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { user: null, error: 'No valid auth token provided' };
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) throw error;
        
        // Get user profile with role
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        return { user: { ...user, profile }, error: null };
    } catch (error) {
        return { user: null, error: error.message };
    }
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verify authentication
    const { user, error: authError } = await verifyToken(req.headers.authorization);
    
    if (authError) {
        return res.status(401).json({ error: authError });
    }

    const userId = user.id;
    const userRole = user.profile?.role;

    try {
        switch (req.method) {
            case 'GET':
                return await getDocuments(req, res, userId, userRole);
            
            case 'POST':
                if (req.url.includes('/upload')) {
                    return await uploadDocument(req, res, userId);
                } else if (req.url.includes('/folder')) {
                    return await createFolder(req, res, userId);
                }
                break;
            
            case 'PUT':
                if (req.url.includes('/rename')) {
                    return await renameDocument(req, res, userId);
                } else if (req.url.includes('/move')) {
                    return await moveDocument(req, res, userId);
                } else if (req.url.includes('/share')) {
                    return await shareDocument(req, res, userId);
                }
                break;
            
            case 'DELETE':
                return await deleteDocument(req, res, userId);
        }

        return res.status(404).json({ error: 'Endpoint not found' });
        
    } catch (error) {
        console.error('Documents API Error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
};

// Get documents for user
async function getDocuments(req, res, userId, userRole) {
    const { folder_id, type, shared_with_me } = req.query;

    let query = supabase
        .from('documents')
        .select(`
            *,
            owner:user_profiles!documents_owner_id_fkey(
                display_name,
                company_name
            ),
            shared_users:document_shares(
                user_id,
                permission,
                user:user_profiles(
                    display_name
                )
            )
        `)
        .order('created_at', { ascending: false });

    // Filter by folder
    if (folder_id) {
        query = query.eq('folder_id', folder_id);
    } else {
        query = query.is('folder_id', null);
    }

    // Filter by type
    if (type) {
        query = query.eq('type', type);
    }

    // Show documents shared with user
    if (shared_with_me === 'true') {
        const { data: sharedDocs } = await supabase
            .from('document_shares')
            .select('document_id')
            .eq('user_id', userId);

        const docIds = sharedDocs?.map(s => s.document_id) || [];
        query = query.in('id', docIds);
    } else {
        // Show user's own documents
        query = query.eq('owner_id', userId);
    }

    const { data: documents, error } = await query;

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    // Get folder structure
    const { data: folders } = await supabase
        .from('document_folders')
        .select('*')
        .eq('owner_id', userId)
        .order('name');

    return res.json({ 
        success: true, 
        data: {
            documents,
            folders: folders || []
        }
    });
}

// Upload document
async function uploadDocument(req, res, userId) {
    return new Promise((resolve) => {
        upload(req, res, async (err) => {
            if (err) {
                return resolve(res.status(400).json({ error: err.message }));
            }

            if (!req.file) {
                return resolve(res.status(400).json({ error: 'No file provided' }));
            }

            const file = req.file;
            const fileName = `${Date.now()}-${file.originalname}`;
            const filePath = `documents/${userId}/${fileName}`;

            try {
                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('uploads')
                    .upload(filePath, file.buffer, {
                        contentType: file.mimetype,
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: { publicUrl } } = supabase
                    .storage
                    .from('uploads')
                    .getPublicUrl(filePath);

                // Save document metadata
                const { data: document, error: dbError } = await supabase
                    .from('documents')
                    .insert({
                        name: file.originalname,
                        type: req.body.type || 'general',
                        category: req.body.category || 'document',
                        file_url: publicUrl,
                        file_path: filePath,
                        file_size: file.size,
                        mime_type: file.mimetype,
                        folder_id: req.body.folder_id || null,
                        owner_id: userId,
                        metadata: {
                            original_name: file.originalname,
                            uploaded_at: new Date().toISOString()
                        }
                    })
                    .select()
                    .single();

                if (dbError) throw dbError;

                // Create notification
                await supabase.from('notifications').insert({
                    user_id: userId,
                    type: 'document_uploaded',
                    title: 'Document Uploaded',
                    message: `${file.originalname} has been uploaded successfully`,
                    priority: 'low'
                });

                resolve(res.json({ success: true, data: document }));
            } catch (error) {
                console.error('Upload error:', error);
                resolve(res.status(500).json({ error: error.message }));
            }
        });
    });
}

// Create folder
async function createFolder(req, res, userId) {
    const { name, parent_id } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Folder name required' });
    }

    const { data: folder, error } = await supabase
        .from('document_folders')
        .insert({
            name,
            parent_id: parent_id || null,
            owner_id: userId
        })
        .select()
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, data: folder });
}

// Rename document
async function renameDocument(req, res, userId) {
    const { document_id, new_name } = req.body;

    if (!document_id || !new_name) {
        return res.status(400).json({ error: 'Document ID and new name required' });
    }

    // Verify ownership
    const { data: doc } = await supabase
        .from('documents')
        .select('owner_id')
        .eq('id', document_id)
        .single();

    if (!doc || doc.owner_id !== userId) {
        return res.status(403).json({ error: 'Permission denied' });
    }

    const { data: document, error } = await supabase
        .from('documents')
        .update({ 
            name: new_name,
            updated_at: new Date().toISOString()
        })
        .eq('id', document_id)
        .select()
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, data: document });
}

// Move document
async function moveDocument(req, res, userId) {
    const { document_id, folder_id } = req.body;

    if (!document_id) {
        return res.status(400).json({ error: 'Document ID required' });
    }

    // Verify ownership
    const { data: doc } = await supabase
        .from('documents')
        .select('owner_id')
        .eq('id', document_id)
        .single();

    if (!doc || doc.owner_id !== userId) {
        return res.status(403).json({ error: 'Permission denied' });
    }

    const { data: document, error } = await supabase
        .from('documents')
        .update({ 
            folder_id: folder_id || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', document_id)
        .select()
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, data: document });
}

// Share document
async function shareDocument(req, res, userId) {
    const { document_id, user_ids, permission = 'view' } = req.body;

    if (!document_id || !user_ids || !Array.isArray(user_ids)) {
        return res.status(400).json({ error: 'Document ID and user IDs required' });
    }

    // Verify ownership
    const { data: doc } = await supabase
        .from('documents')
        .select('owner_id, name')
        .eq('id', document_id)
        .single();

    if (!doc || doc.owner_id !== userId) {
        return res.status(403).json({ error: 'Permission denied' });
    }

    // Create shares
    const shares = user_ids.map(uid => ({
        document_id,
        user_id: uid,
        permission,
        shared_by: userId
    }));

    const { error } = await supabase
        .from('document_shares')
        .upsert(shares, { onConflict: 'document_id,user_id' });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    // Send notifications
    const notifications = user_ids.map(uid => ({
        user_id: uid,
        type: 'document_shared',
        title: 'Document Shared',
        message: `${doc.name} has been shared with you`,
        priority: 'normal',
        data: { document_id }
    }));

    await supabase.from('notifications').insert(notifications);

    return res.json({ success: true });
}

// Delete document
async function deleteDocument(req, res, userId) {
    const { document_id } = req.query;

    if (!document_id) {
        return res.status(400).json({ error: 'Document ID required' });
    }

    // Verify ownership
    const { data: doc } = await supabase
        .from('documents')
        .select('owner_id, file_path')
        .eq('id', document_id)
        .single();

    if (!doc || doc.owner_id !== userId) {
        return res.status(403).json({ error: 'Permission denied' });
    }

    // Delete from storage
    if (doc.file_path) {
        await supabase
            .storage
            .from('uploads')
            .remove([doc.file_path]);
    }

    // Delete from database
    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', document_id);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
}