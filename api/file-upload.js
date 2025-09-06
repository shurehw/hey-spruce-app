const { createClient } = require('@supabase/supabase-js');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

// Generate unique filename
function generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${name}-${timestamp}-${random}${ext}`;
}

// Determine storage bucket based on entity type
function getStorageBucket(entityType) {
    const bucketMap = {
        'work_order': 'work-orders',
        'invoice': 'invoices',
        'rfp': 'rfps',
        'bid': 'bids',
        'profile': 'profiles',
        'asset': 'assets',
        'document': 'documents'
    };
    return bucketMap[entityType] || 'general';
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verify authentication
    const { user, error: authError } = await verifyToken(req.headers.authorization);
    
    if (authError) {
        return res.status(401).json({ error: authError });
    }

    try {
        switch (req.method) {
            case 'POST':
                return handleFileUpload(req, res, user);
            
            case 'GET':
                return handleGetFiles(req, res, user);
            
            case 'DELETE':
                return handleDeleteFile(req, res, user);
            
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('File upload API error:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
};

// Handle file upload
async function handleFileUpload(req, res, user) {
    return new Promise((resolve, reject) => {
        const form = new formidable.IncomingForm({
            maxFileSize: 10 * 1024 * 1024, // 10MB max file size
            keepExtensions: true,
            multiples: true
        });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                res.status(400).json({ error: 'File upload failed', details: err.message });
                return resolve();
            }

            try {
                const uploadedFiles = [];
                const fileArray = Array.isArray(files.file) ? files.file : [files.file];
                
                for (const file of fileArray) {
                    if (!file) continue;

                    // Read file content
                    const fileBuffer = fs.readFileSync(file.filepath);
                    
                    // Generate unique filename
                    const uniqueFilename = generateUniqueFilename(file.originalFilename || file.name);
                    
                    // Determine storage path
                    const entityType = fields.entity_type || 'general';
                    const entityId = fields.entity_id;
                    const bucket = getStorageBucket(entityType);
                    
                    // Create storage path
                    const storagePath = entityId 
                        ? `${entityType}/${entityId}/${uniqueFilename}`
                        : `${entityType}/${user.id}/${uniqueFilename}`;

                    // Upload to Supabase Storage
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from(bucket)
                        .upload(storagePath, fileBuffer, {
                            contentType: file.mimetype || 'application/octet-stream',
                            upsert: false
                        });

                    if (uploadError) {
                        console.error('Supabase upload error:', uploadError);
                        throw new Error(`Failed to upload ${file.originalFilename}: ${uploadError.message}`);
                    }

                    // Get public URL
                    const { data: urlData } = supabase.storage
                        .from(bucket)
                        .getPublicUrl(storagePath);

                    // Save file metadata to database
                    const fileRecord = {
                        filename: uniqueFilename,
                        original_name: file.originalFilename || file.name,
                        mime_type: file.mimetype,
                        size_bytes: file.size,
                        storage_path: storagePath,
                        url: urlData.publicUrl,
                        uploaded_by: user.id,
                        entity_type: entityType,
                        entity_id: entityId,
                        is_public: fields.is_public === 'true'
                    };

                    // Generate thumbnail for images
                    if (file.mimetype && file.mimetype.startsWith('image/')) {
                        // For now, we'll use the same URL as thumbnail
                        // In production, you'd want to generate actual thumbnails
                        fileRecord.thumbnail_url = urlData.publicUrl;
                    }

                    const { data: savedFile, error: dbError } = await supabase
                        .from('file_uploads')
                        .insert(fileRecord)
                        .select()
                        .single();

                    if (dbError) {
                        console.error('Database save error:', dbError);
                        // Try to delete the uploaded file
                        await supabase.storage.from(bucket).remove([storagePath]);
                        throw new Error(`Failed to save file metadata: ${dbError.message}`);
                    }

                    uploadedFiles.push(savedFile);

                    // Update related entity with file reference
                    if (entityType && entityId) {
                        await updateEntityWithFile(entityType, entityId, savedFile.id, savedFile.url);
                    }

                    // Clean up temp file
                    fs.unlinkSync(file.filepath);
                }

                res.json({
                    success: true,
                    files: uploadedFiles,
                    message: `${uploadedFiles.length} file(s) uploaded successfully`
                });
                resolve();
            } catch (error) {
                console.error('Upload processing error:', error);
                res.status(500).json({ 
                    error: 'Failed to process upload', 
                    details: error.message 
                });
                resolve();
            }
        });
    });
}

// Update entity with file reference
async function updateEntityWithFile(entityType, entityId, fileId, fileUrl) {
    try {
        switch (entityType) {
            case 'work_order':
                // Add to photos or documents array
                const { data: workOrder } = await supabase
                    .from('work_orders')
                    .select('photos, documents')
                    .eq('id', entityId)
                    .single();

                if (workOrder) {
                    const isImage = fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    const field = isImage ? 'photos' : 'documents';
                    const currentArray = workOrder[field] || [];
                    
                    await supabase
                        .from('work_orders')
                        .update({ [field]: [...currentArray, fileUrl] })
                        .eq('id', entityId);
                }
                break;

            case 'invoice':
                // Add to attachments
                const { data: invoice } = await supabase
                    .from('invoices')
                    .select('attachments')
                    .eq('id', entityId)
                    .single();

                if (invoice) {
                    const attachments = invoice.attachments || [];
                    await supabase
                        .from('invoices')
                        .update({ attachments: [...attachments, fileUrl] })
                        .eq('id', entityId);
                }
                break;

            case 'rfp':
                // Add to documents array
                const { data: rfp } = await supabase
                    .from('rfps')
                    .select('documents')
                    .eq('id', entityId)
                    .single();

                if (rfp) {
                    const documents = rfp.documents || [];
                    await supabase
                        .from('rfps')
                        .update({ documents: [...documents, fileUrl] })
                        .eq('id', entityId);
                }
                break;

            case 'bid':
                // Add to documents array
                const { data: bid } = await supabase
                    .from('bids')
                    .select('documents')
                    .eq('id', entityId)
                    .single();

                if (bid) {
                    const documents = bid.documents || [];
                    await supabase
                        .from('bids')
                        .update({ documents: [...documents, fileUrl] })
                        .eq('id', entityId);
                }
                break;

            case 'profile':
                // Update avatar URL
                await supabase
                    .from('user_profiles')
                    .update({ avatar_url: fileUrl })
                    .eq('id', entityId);
                break;
        }
    } catch (error) {
        console.error('Failed to update entity with file:', error);
        // Non-critical error, don't throw
    }
}

// Get files
async function handleGetFiles(req, res, user) {
    try {
        let query = supabase
            .from('file_uploads')
            .select('*')
            .order('created_at', { ascending: false });

        // Filter by entity if provided
        if (req.query.entity_type) {
            query = query.eq('entity_type', req.query.entity_type);
        }
        if (req.query.entity_id) {
            query = query.eq('entity_id', req.query.entity_id);
        }

        // Non-admins can only see their own files or public files
        if (user.profile?.role !== 'admin') {
            query = query.or(`uploaded_by.eq.${user.id},is_public.eq.true`);
        }

        // Limit results
        const limit = parseInt(req.query.limit) || 50;
        query = query.limit(limit);

        const { data: files, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            files: files,
            count: files.length
        });
    } catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
}

// Delete file
async function handleDeleteFile(req, res, user) {
    const fileId = req.query.id;

    if (!fileId) {
        return res.status(400).json({ error: 'File ID is required' });
    }

    try {
        // Get file details
        const { data: file, error: fetchError } = await supabase
            .from('file_uploads')
            .select('*')
            .eq('id', fileId)
            .single();

        if (fetchError || !file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check permissions
        if (user.profile?.role !== 'admin' && file.uploaded_by !== user.id) {
            return res.status(403).json({ error: 'You do not have permission to delete this file' });
        }

        // Delete from Supabase Storage
        const bucket = getStorageBucket(file.entity_type);
        const { error: deleteStorageError } = await supabase.storage
            .from(bucket)
            .remove([file.storage_path]);

        if (deleteStorageError) {
            console.error('Storage deletion error:', deleteStorageError);
        }

        // Delete from database
        const { error: deleteDbError } = await supabase
            .from('file_uploads')
            .delete()
            .eq('id', fileId);

        if (deleteDbError) throw deleteDbError;

        // Remove file reference from entity
        if (file.entity_type && file.entity_id) {
            await removeFileFromEntity(file.entity_type, file.entity_id, file.url);
        }

        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
}

// Remove file reference from entity
async function removeFileFromEntity(entityType, entityId, fileUrl) {
    try {
        switch (entityType) {
            case 'work_order':
                const { data: workOrder } = await supabase
                    .from('work_orders')
                    .select('photos, documents')
                    .eq('id', entityId)
                    .single();

                if (workOrder) {
                    const photos = (workOrder.photos || []).filter(url => url !== fileUrl);
                    const documents = (workOrder.documents || []).filter(url => url !== fileUrl);
                    
                    await supabase
                        .from('work_orders')
                        .update({ photos, documents })
                        .eq('id', entityId);
                }
                break;

            case 'invoice':
                const { data: invoice } = await supabase
                    .from('invoices')
                    .select('attachments')
                    .eq('id', entityId)
                    .single();

                if (invoice) {
                    const attachments = (invoice.attachments || []).filter(url => url !== fileUrl);
                    await supabase
                        .from('invoices')
                        .update({ attachments })
                        .eq('id', entityId);
                }
                break;

            case 'rfp':
                const { data: rfp } = await supabase
                    .from('rfps')
                    .select('documents')
                    .eq('id', entityId)
                    .single();

                if (rfp) {
                    const documents = (rfp.documents || []).filter(url => url !== fileUrl);
                    await supabase
                        .from('rfps')
                        .update({ documents })
                        .eq('id', entityId);
                }
                break;

            case 'bid':
                const { data: bid } = await supabase
                    .from('bids')
                    .select('documents')
                    .eq('id', entityId)
                    .single();

                if (bid) {
                    const documents = (bid.documents || []).filter(url => url !== fileUrl);
                    await supabase
                        .from('bids')
                        .update({ documents })
                        .eq('id', entityId);
                }
                break;
        }
    } catch (error) {
        console.error('Failed to remove file from entity:', error);
        // Non-critical error, don't throw
    }
}