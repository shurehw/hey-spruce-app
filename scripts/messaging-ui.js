// Messaging UI Component for Hey Spruce Portals
(function() {
    'use strict';

    class MessagingSystem {
        constructor(container, options = {}) {
            this.container = container;
            this.currentUser = options.currentUser || null;
            this.currentConversation = null;
            this.conversations = [];
            this.messages = [];
            this.socket = null;
            this.options = options;
            
            this.init();
        }

        init() {
            this.render();
            this.attachEventListeners();
            this.loadConversations();
            this.setupRealtime();
        }

        render() {
            this.container.innerHTML = `
                <div class="messaging-container">
                    <div class="conversations-sidebar">
                        <div class="conversations-header">
                            <h3>Messages</h3>
                            <button class="btn-new-chat" onclick="messagingSystem.showNewChatModal()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M12 5v14m-7-7h14"/>
                                </svg>
                            </button>
                        </div>
                        <div class="conversations-search">
                            <input type="text" placeholder="Search conversations..." id="searchConversations">
                        </div>
                        <div class="conversations-list" id="conversationsList">
                            <div class="loading">Loading conversations...</div>
                        </div>
                    </div>
                    
                    <div class="chat-area">
                        <div class="chat-header" id="chatHeader">
                            <div class="chat-header-info">
                                <h3 id="chatTitle">Select a conversation</h3>
                                <span id="chatSubtitle"></span>
                            </div>
                            <div class="chat-header-actions">
                                <button class="btn-icon" onclick="messagingSystem.toggleInfo()">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M12 16v-4m0-4h.01"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <div class="messages-container" id="messagesContainer">
                            <div class="no-conversation">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" opacity="0.3">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                                </svg>
                                <p>Select a conversation to start messaging</p>
                            </div>
                        </div>
                        
                        <div class="message-input-container" id="messageInputContainer" style="display: none;">
                            <div class="message-attachments" id="messageAttachments"></div>
                            <div class="message-input-wrapper">
                                <button class="btn-attach" onclick="messagingSystem.attachFile()">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                                    </svg>
                                </button>
                                <input type="text" 
                                       id="messageInput" 
                                       placeholder="Type a message..." 
                                       onkeypress="if(event.key === 'Enter' && !event.shiftKey) { messagingSystem.sendMessage(); event.preventDefault(); }">
                                <button class="btn-send" onclick="messagingSystem.sendMessage()">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <line x1="22" y1="2" x2="11" y2="13"/>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chat-info-sidebar" id="chatInfoSidebar" style="display: none;">
                        <div class="info-header">
                            <h3>Conversation Info</h3>
                            <button class="btn-close" onclick="messagingSystem.toggleInfo()">×</button>
                        </div>
                        <div class="info-content" id="infoContent"></div>
                    </div>
                </div>
                
                <!-- New Chat Modal -->
                <div class="modal" id="newChatModal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>New Conversation</h2>
                            <button class="btn-close" onclick="messagingSystem.hideNewChatModal()">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Select Recipients</label>
                                <div class="recipients-search">
                                    <input type="text" id="recipientSearch" placeholder="Search users...">
                                </div>
                                <div class="recipients-list" id="recipientsList"></div>
                            </div>
                            <div class="selected-recipients" id="selectedRecipients"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onclick="messagingSystem.hideNewChatModal()">Cancel</button>
                            <button class="btn btn-primary" onclick="messagingSystem.createConversation()">Start Chat</button>
                        </div>
                    </div>
                </div>
            `;

            this.injectStyles();
        }

        async loadConversations() {
            try {
                const response = await fetch('/api/messages/conversations', {
                    headers: {
                        'Authorization': `Bearer ${await this.getAuthToken()}`
                    }
                });

                const result = await response.json();
                if (result.success) {
                    this.conversations = result.data;
                    this.renderConversations();
                }
            } catch (error) {
                console.error('Error loading conversations:', error);
                this.showError('Failed to load conversations');
            }
        }

        renderConversations() {
            const listEl = document.getElementById('conversationsList');
            
            if (this.conversations.length === 0) {
                listEl.innerHTML = '<div class="no-conversations">No conversations yet</div>';
                return;
            }

            listEl.innerHTML = this.conversations.map(conv => {
                const otherParticipant = conv.participants?.find(p => p.user_id !== this.currentUser?.id);
                const displayName = conv.name || otherParticipant?.user_profiles?.display_name || 'Unknown';
                const lastMessage = conv.last_message;
                const unreadClass = conv.unread_count > 0 ? 'unread' : '';
                
                return `
                    <div class="conversation-item ${unreadClass}" onclick="messagingSystem.selectConversation('${conv.id}')">
                        <div class="conversation-avatar">
                            ${displayName.charAt(0).toUpperCase()}
                        </div>
                        <div class="conversation-details">
                            <div class="conversation-name">${displayName}</div>
                            <div class="conversation-last-message">
                                ${lastMessage ? lastMessage.content.substring(0, 50) : 'No messages yet'}
                            </div>
                        </div>
                        <div class="conversation-meta">
                            <div class="conversation-time">${this.formatTime(lastMessage?.created_at)}</div>
                            ${conv.unread_count > 0 ? `<div class="unread-badge">${conv.unread_count}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        async selectConversation(conversationId) {
            this.currentConversation = this.conversations.find(c => c.id === conversationId);
            
            if (!this.currentConversation) return;

            // Update UI
            document.querySelectorAll('.conversation-item').forEach(el => {
                el.classList.remove('active');
            });
            event.currentTarget.classList.add('active');

            // Update chat header
            const otherParticipant = this.currentConversation.participants?.find(
                p => p.user_id !== this.currentUser?.id
            );
            document.getElementById('chatTitle').textContent = 
                this.currentConversation.name || otherParticipant?.user_profiles?.display_name || 'Chat';
            document.getElementById('chatSubtitle').textContent = 
                otherParticipant?.user_profiles?.role || '';

            // Show message input
            document.getElementById('messageInputContainer').style.display = 'block';

            // Load messages
            await this.loadMessages(conversationId);

            // Mark as read
            await this.markAsRead(conversationId);
        }

        async loadMessages(conversationId) {
            const container = document.getElementById('messagesContainer');
            container.innerHTML = '<div class="loading">Loading messages...</div>';

            try {
                const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
                    headers: {
                        'Authorization': `Bearer ${await this.getAuthToken()}`
                    }
                });

                const result = await response.json();
                if (result.success) {
                    this.messages = result.data;
                    this.renderMessages();
                }
            } catch (error) {
                console.error('Error loading messages:', error);
                this.showError('Failed to load messages');
            }
        }

        renderMessages() {
            const container = document.getElementById('messagesContainer');
            
            if (this.messages.length === 0) {
                container.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
                return;
            }

            let lastDate = null;
            container.innerHTML = this.messages.map(msg => {
                const isOwn = msg.sender_id === this.currentUser?.id;
                const messageDate = new Date(msg.created_at).toDateString();
                let dateHeader = '';
                
                if (messageDate !== lastDate) {
                    lastDate = messageDate;
                    dateHeader = `<div class="date-divider">${this.formatDate(msg.created_at)}</div>`;
                }

                return `
                    ${dateHeader}
                    <div class="message ${isOwn ? 'own' : 'other'}">
                        ${!isOwn ? `<div class="message-avatar">${msg.sender?.display_name?.charAt(0) || '?'}</div>` : ''}
                        <div class="message-content">
                            ${!isOwn ? `<div class="message-sender">${msg.sender?.display_name || 'Unknown'}</div>` : ''}
                            <div class="message-bubble">
                                ${msg.content}
                                ${msg.attachments?.length > 0 ? this.renderAttachments(msg.attachments) : ''}
                            </div>
                            <div class="message-time">${this.formatTime(msg.created_at)}</div>
                        </div>
                    </div>
                `;
            }).join('');

            // Scroll to bottom
            container.scrollTop = container.scrollHeight;
        }

        async sendMessage() {
            const input = document.getElementById('messageInput');
            const content = input.value.trim();
            
            if (!content || !this.currentConversation) return;

            input.disabled = true;
            
            try {
                const response = await fetch(
                    `/api/messages/conversations/${this.currentConversation.id}/messages`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${await this.getAuthToken()}`
                        },
                        body: JSON.stringify({ content, type: 'text' })
                    }
                );

                const result = await response.json();
                if (result.success) {
                    input.value = '';
                    this.messages.push(result.data);
                    this.renderMessages();
                    
                    // Update conversation list
                    this.currentConversation.last_message = result.data;
                    this.renderConversations();
                }
            } catch (error) {
                console.error('Error sending message:', error);
                this.showError('Failed to send message');
            } finally {
                input.disabled = false;
                input.focus();
            }
        }

        async markAsRead(conversationId) {
            try {
                await fetch(`/api/messages/conversations/${conversationId}/read`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await this.getAuthToken()}`
                    },
                    body: JSON.stringify({
                        message_ids: this.messages.map(m => m.id)
                    })
                });

                // Update unread count
                const conv = this.conversations.find(c => c.id === conversationId);
                if (conv) {
                    conv.unread_count = 0;
                    this.renderConversations();
                }
            } catch (error) {
                console.error('Error marking as read:', error);
            }
        }

        setupRealtime() {
            if (!window.supabase) return;

            // Subscribe to new messages
            this.socket = window.supabase
                .channel('messages')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                }, (payload) => {
                    this.handleNewMessage(payload.new);
                })
                .subscribe();
        }

        handleNewMessage(message) {
            // If message is for current conversation, add it
            if (message.conversation_id === this.currentConversation?.id) {
                this.messages.push(message);
                this.renderMessages();
            }

            // Update conversation list
            this.loadConversations();

            // Show notification if not from current user
            if (message.sender_id !== this.currentUser?.id) {
                this.showNotification('New message received');
            }
        }

        showNewChatModal() {
            document.getElementById('newChatModal').style.display = 'flex';
            this.loadUsers();
        }

        hideNewChatModal() {
            document.getElementById('newChatModal').style.display = 'none';
        }

        async loadUsers() {
            // This would load users from your database
            // For now, using placeholder
            const users = [
                { id: '1', name: 'John Doe', role: 'client' },
                { id: '2', name: 'Jane Smith', role: 'contractor' },
                { id: '3', name: 'Bob Johnson', role: 'supplier' }
            ];

            const listEl = document.getElementById('recipientsList');
            listEl.innerHTML = users.map(user => `
                <div class="recipient-item" onclick="messagingSystem.selectRecipient('${user.id}', '${user.name}')">
                    <div class="recipient-avatar">${user.name.charAt(0)}</div>
                    <div class="recipient-info">
                        <div class="recipient-name">${user.name}</div>
                        <div class="recipient-role">${user.role}</div>
                    </div>
                </div>
            `).join('');
        }

        selectedRecipients = new Set();

        selectRecipient(userId, userName) {
            if (this.selectedRecipients.has(userId)) {
                this.selectedRecipients.delete(userId);
            } else {
                this.selectedRecipients.add(userId);
            }

            const selectedEl = document.getElementById('selectedRecipients');
            if (this.selectedRecipients.size > 0) {
                selectedEl.innerHTML = Array.from(this.selectedRecipients).map(id => `
                    <span class="recipient-chip">
                        ${userName}
                        <button onclick="messagingSystem.removeRecipient('${id}')">×</button>
                    </span>
                `).join('');
            } else {
                selectedEl.innerHTML = '';
            }
        }

        async createConversation() {
            if (this.selectedRecipients.size === 0) {
                alert('Please select at least one recipient');
                return;
            }

            try {
                const response = await fetch('/api/messages/conversations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await this.getAuthToken()}`
                    },
                    body: JSON.stringify({
                        participant_ids: Array.from(this.selectedRecipients),
                        type: this.selectedRecipients.size === 1 ? 'direct' : 'group'
                    })
                });

                const result = await response.json();
                if (result.success) {
                    this.hideNewChatModal();
                    await this.loadConversations();
                    this.selectConversation(result.data.id);
                }
            } catch (error) {
                console.error('Error creating conversation:', error);
                this.showError('Failed to create conversation');
            }
        }

        attachEventListeners() {
            // Search conversations
            document.getElementById('searchConversations')?.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                // Filter conversations
            });
        }

        async getAuthToken() {
            // Get auth token from Supabase or your auth system
            if (window.supabase) {
                const { data: { session } } = await window.supabase.auth.getSession();
                return session?.access_token;
            }
            return localStorage.getItem('auth_token');
        }

        formatTime(timestamp) {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
            if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
            
            return date.toLocaleDateString();
        }

        formatDate(timestamp) {
            const date = new Date(timestamp);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (date.toDateString() === today.toDateString()) return 'Today';
            if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
            
            return date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
        }

        renderAttachments(attachments) {
            return attachments.map(att => `
                <div class="message-attachment">
                    <a href="${att.url}" target="_blank">${att.name}</a>
                </div>
            `).join('');
        }

        toggleInfo() {
            const sidebar = document.getElementById('chatInfoSidebar');
            sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
        }

        showError(message) {
            // Show error toast
            if (window.SpruceUI?.toast) {
                window.SpruceUI.toast.error(message);
            } else {
                alert(message);
            }
        }

        showNotification(message) {
            // Show notification
            if (window.SpruceUI?.toast) {
                window.SpruceUI.toast.info(message);
            }
        }

        injectStyles() {
            if (document.getElementById('messaging-styles')) return;
            
            const styles = `
                .messaging-container {
                    display: flex;
                    height: 600px;
                    border: 1px solid var(--gray-200);
                    border-radius: 8px;
                    overflow: hidden;
                    background: white;
                }
                
                .conversations-sidebar {
                    width: 300px;
                    border-right: 1px solid var(--gray-200);
                    display: flex;
                    flex-direction: column;
                }
                
                .conversations-header {
                    padding: 1rem;
                    border-bottom: 1px solid var(--gray-200);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .conversations-header h3 {
                    margin: 0;
                    font-size: 1.125rem;
                    font-weight: 600;
                }
                
                .btn-new-chat {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: none;
                    background: var(--primary);
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .conversations-search {
                    padding: 0.75rem;
                    border-bottom: 1px solid var(--gray-100);
                }
                
                .conversations-search input {
                    width: 100%;
                    padding: 0.5rem;
                    border: 1px solid var(--gray-300);
                    border-radius: 6px;
                    font-size: 0.875rem;
                }
                
                .conversations-list {
                    flex: 1;
                    overflow-y: auto;
                }
                
                .conversation-item {
                    display: flex;
                    padding: 0.75rem;
                    cursor: pointer;
                    border-bottom: 1px solid var(--gray-100);
                    transition: background 0.2s;
                }
                
                .conversation-item:hover {
                    background: var(--gray-50);
                }
                
                .conversation-item.active {
                    background: var(--primary-light);
                }
                
                .conversation-item.unread {
                    font-weight: 600;
                }
                
                .conversation-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: var(--primary);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 0.75rem;
                    flex-shrink: 0;
                }
                
                .conversation-details {
                    flex: 1;
                    min-width: 0;
                }
                
                .conversation-name {
                    font-size: 0.875rem;
                    margin-bottom: 0.25rem;
                }
                
                .conversation-last-message {
                    font-size: 0.75rem;
                    color: var(--gray-600);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .conversation-meta {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 0.25rem;
                }
                
                .conversation-time {
                    font-size: 0.75rem;
                    color: var(--gray-500);
                }
                
                .unread-badge {
                    background: var(--primary);
                    color: white;
                    border-radius: 10px;
                    padding: 2px 6px;
                    font-size: 0.75rem;
                    min-width: 20px;
                    text-align: center;
                }
                
                .chat-area {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                .chat-header {
                    padding: 1rem;
                    border-bottom: 1px solid var(--gray-200);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .chat-header-info h3 {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 600;
                }
                
                .chat-header-info span {
                    font-size: 0.75rem;
                    color: var(--gray-600);
                }
                
                .messages-container {
                    flex: 1;
                    padding: 1rem;
                    overflow-y: auto;
                    background: var(--gray-50);
                }
                
                .no-conversation,
                .no-messages {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: var(--gray-500);
                    text-align: center;
                }
                
                .date-divider {
                    text-align: center;
                    margin: 1rem 0;
                    font-size: 0.75rem;
                    color: var(--gray-500);
                    position: relative;
                }
                
                .date-divider::before,
                .date-divider::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    width: calc(50% - 60px);
                    height: 1px;
                    background: var(--gray-300);
                }
                
                .date-divider::before {
                    left: 0;
                }
                
                .date-divider::after {
                    right: 0;
                }
                
                .message {
                    display: flex;
                    margin-bottom: 1rem;
                    gap: 0.5rem;
                }
                
                .message.own {
                    justify-content: flex-end;
                }
                
                .message-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--gray-400);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.875rem;
                    flex-shrink: 0;
                }
                
                .message-content {
                    max-width: 70%;
                }
                
                .message-sender {
                    font-size: 0.75rem;
                    color: var(--gray-600);
                    margin-bottom: 0.25rem;
                }
                
                .message-bubble {
                    padding: 0.75rem;
                    border-radius: 12px;
                    background: white;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                }
                
                .message.own .message-bubble {
                    background: var(--primary);
                    color: white;
                }
                
                .message-time {
                    font-size: 0.625rem;
                    color: var(--gray-500);
                    margin-top: 0.25rem;
                    text-align: right;
                }
                
                .message-input-container {
                    padding: 1rem;
                    border-top: 1px solid var(--gray-200);
                    background: white;
                }
                
                .message-input-wrapper {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }
                
                .message-input-wrapper input {
                    flex: 1;
                    padding: 0.75rem;
                    border: 1px solid var(--gray-300);
                    border-radius: 24px;
                    font-size: 0.875rem;
                    outline: none;
                }
                
                .message-input-wrapper input:focus {
                    border-color: var(--primary);
                }
                
                .btn-attach,
                .btn-send {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: none;
                    background: transparent;
                    color: var(--gray-600);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                
                .btn-send {
                    background: var(--primary);
                    color: white;
                }
                
                .btn-send:hover {
                    background: var(--primary-dark);
                }
                
                .chat-info-sidebar {
                    width: 280px;
                    border-left: 1px solid var(--gray-200);
                    background: white;
                }
                
                .info-header {
                    padding: 1rem;
                    border-bottom: 1px solid var(--gray-200);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .btn-close {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: none;
                    background: transparent;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--gray-600);
                }
                
                @media (max-width: 768px) {
                    .messaging-container {
                        flex-direction: column;
                    }
                    
                    .conversations-sidebar {
                        width: 100%;
                        height: 200px;
                        border-right: none;
                        border-bottom: 1px solid var(--gray-200);
                    }
                    
                    .chat-info-sidebar {
                        position: absolute;
                        right: 0;
                        top: 0;
                        height: 100%;
                        z-index: 10;
                    }
                }
            `;
            
            const styleSheet = document.createElement('style');
            styleSheet.id = 'messaging-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
    }

    // Make it globally available
    window.MessagingSystem = MessagingSystem;
})();