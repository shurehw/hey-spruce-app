const { createClient } = require('@supabase/supabase-js');

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
    const path = req.url.split('?')[0];
    const segments = path.split('/').filter(Boolean);

    try {
        // Route handling
        if (segments[2] === 'conversations') {
            if (req.method === 'GET' && !segments[3]) {
                // Get all conversations for user
                return await getConversations(res, userId);
            } else if (req.method === 'POST' && !segments[3]) {
                // Create new conversation
                return await createConversation(req, res, userId);
            } else if (segments[3] && segments[4] === 'messages') {
                if (req.method === 'GET') {
                    // Get messages for conversation
                    return await getMessages(res, segments[3], userId, req.query);
                } else if (req.method === 'POST') {
                    // Send message
                    return await sendMessage(req, res, segments[3], userId);
                }
            } else if (segments[3] && segments[4] === 'read' && req.method === 'POST') {
                // Mark messages as read
                return await markAsRead(req, res, segments[3], userId);
            }
        } else if (segments[2] === 'work-order-chat') {
            // Get or create conversation for work order
            if (req.method === 'GET') {
                return await getWorkOrderChat(res, req.query.work_order_id, userId);
            } else if (req.method === 'POST') {
                return await createWorkOrderChat(req, res, userId);
            }
        }

        return res.status(404).json({ error: 'Endpoint not found' });
        
    } catch (error) {
        console.error('Messages API Error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
};

// Get user's conversations
async function getConversations(res, userId) {
    const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
            *,
            conversation_participants!inner(
                user_id,
                last_read_at,
                is_muted
            ),
            messages(
                id,
                content,
                sender_id,
                created_at,
                type
            )
        `)
        .eq('conversation_participants.user_id', userId)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    // Get participant details and unread counts
    for (let conv of conversations) {
        // Get other participants
        const { data: participants } = await supabase
            .from('conversation_participants')
            .select(`
                user_id,
                user_profiles(
                    display_name,
                    role,
                    company_name
                )
            `)
            .eq('conversation_id', conv.id);

        conv.participants = participants;

        // Get unread count
        const lastRead = conv.conversation_participants.find(p => p.user_id === userId)?.last_read_at;
        if (lastRead) {
            const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .gt('created_at', lastRead);
            conv.unread_count = count || 0;
        } else {
            conv.unread_count = conv.messages?.length || 0;
        }

        // Get last message
        conv.last_message = conv.messages?.[0] || null;
        delete conv.messages; // Remove all messages from response
    }

    return res.json({ success: true, data: conversations });
}

// Create new conversation
async function createConversation(req, res, userId) {
    const { participant_ids, name, type = 'direct', work_order_id } = req.body;

    if (!participant_ids || !Array.isArray(participant_ids)) {
        return res.status(400).json({ error: 'participant_ids array required' });
    }

    // Check for existing direct conversation
    if (type === 'direct' && participant_ids.length === 1) {
        const { data: existing } = await supabase
            .from('conversations')
            .select(`
                *,
                conversation_participants!inner(user_id)
            `)
            .eq('type', 'direct')
            .eq('conversation_participants.user_id', userId);

        for (let conv of existing || []) {
            const { data: otherParticipants } = await supabase
                .from('conversation_participants')
                .select('user_id')
                .eq('conversation_id', conv.id);

            if (otherParticipants?.length === 2 && 
                otherParticipants.some(p => p.user_id === participant_ids[0])) {
                return res.json({ success: true, data: conv, existing: true });
            }
        }
    }

    // Create new conversation
    const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
            name,
            type,
            work_order_id,
            created_by: userId
        })
        .select()
        .single();

    if (convError) {
        return res.status(500).json({ error: convError.message });
    }

    // Add participants
    const participantsToAdd = participant_ids.map(pid => ({
        conversation_id: conversation.id,
        user_id: pid,
        is_admin: false
    }));

    const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participantsToAdd);

    if (partError) {
        return res.status(500).json({ error: partError.message });
    }

    return res.json({ success: true, data: conversation });
}

// Get messages for conversation
async function getMessages(res, conversationId, userId, query) {
    // Verify user is participant
    const { data: participant } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

    if (!participant) {
        return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    const limit = parseInt(query.limit) || 50;
    const offset = parseInt(query.offset) || 0;

    const { data: messages, error } = await supabase
        .from('messages')
        .select(`
            *,
            sender:user_profiles!messages_sender_id_fkey(
                id,
                display_name,
                role,
                company_name
            ),
            message_read_receipts(
                user_id,
                read_at
            ),
            message_reactions(
                user_id,
                reaction
            )
        `)
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ 
        success: true, 
        data: messages.reverse(), // Return in chronological order
        has_more: messages.length === limit 
    });
}

// Send message
async function sendMessage(req, res, conversationId, userId) {
    const { content, type = 'text', attachments = [] } = req.body;

    if (!content && attachments.length === 0) {
        return res.status(400).json({ error: 'Content or attachments required' });
    }

    // Verify user is participant
    const { data: participant } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

    if (!participant) {
        return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    // Insert message
    const { data: message, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: userId,
            content,
            type,
            attachments
        })
        .select(`
            *,
            sender:user_profiles!messages_sender_id_fkey(
                id,
                display_name,
                role,
                company_name
            )
        `)
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    // Send notifications to other participants
    const { data: otherParticipants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', userId)
        .eq('is_muted', false);

    if (otherParticipants && otherParticipants.length > 0) {
        const notifications = otherParticipants.map(p => ({
            user_id: p.user_id,
            type: 'new_message',
            title: `New message from ${message.sender.display_name}`,
            message: content?.substring(0, 100) || 'Sent an attachment',
            priority: 'normal',
            data: {
                conversation_id: conversationId,
                message_id: message.id,
                sender_name: message.sender.display_name
            }
        }));

        await supabase.from('notifications').insert(notifications);
    }

    return res.json({ success: true, data: message });
}

// Mark messages as read
async function markAsRead(req, res, conversationId, userId) {
    const { message_ids } = req.body;

    // Update last read timestamp for conversation
    const { error: updateError } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

    if (updateError) {
        return res.status(500).json({ error: updateError.message });
    }

    // Insert read receipts if message_ids provided
    if (message_ids && message_ids.length > 0) {
        const receipts = message_ids.map(mid => ({
            message_id: mid,
            user_id: userId
        }));

        await supabase
            .from('message_read_receipts')
            .upsert(receipts, { onConflict: 'message_id,user_id' });
    }

    return res.json({ success: true });
}

// Get or create work order chat
async function getWorkOrderChat(res, workOrderId, userId) {
    if (!workOrderId) {
        return res.status(400).json({ error: 'work_order_id required' });
    }

    // Check if conversation exists
    const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('work_order_id', workOrderId)
        .single();

    if (existing) {
        return res.json({ success: true, data: existing });
    }

    return res.json({ success: true, data: null });
}

// Create work order chat
async function createWorkOrderChat(req, res, userId) {
    const { work_order_id, participant_ids } = req.body;

    if (!work_order_id) {
        return res.status(400).json({ error: 'work_order_id required' });
    }

    // Get work order details
    const { data: workOrder } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', work_order_id)
        .single();

    if (!workOrder) {
        return res.status(404).json({ error: 'Work order not found' });
    }

    // Create conversation
    const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
            name: `Work Order #${workOrder.id.substring(0, 8)}`,
            type: 'work_order',
            work_order_id,
            created_by: userId
        })
        .select()
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    // Add participants (client, assigned tech, admin)
    const participants = new Set([userId]);
    if (workOrder.client_id) participants.add(workOrder.client_id);
    if (workOrder.assigned_to) participants.add(workOrder.assigned_to);
    if (participant_ids) participant_ids.forEach(id => participants.add(id));

    const participantsToAdd = Array.from(participants).map(pid => ({
        conversation_id: conversation.id,
        user_id: pid,
        is_admin: pid === userId
    }));

    await supabase
        .from('conversation_participants')
        .insert(participantsToAdd);

    return res.json({ success: true, data: conversation });
}