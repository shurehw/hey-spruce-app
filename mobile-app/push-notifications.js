/**
 * Push Notifications and Real-time Sync Service
 * Hey Spruce Mobile Apps
 */

class NotificationService {
    constructor() {
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.isSubscribed = false;
        this.swRegistration = null;
        
        // Notification types and their configs
        this.notificationTypes = {
            // Client App Notifications
            'work-order-assigned': {
                title: 'Work Order Assigned',
                icon: '/icons/work-order.png',
                badge: '/icons/badge.png',
                tag: 'work-order',
                requireInteraction: false,
                priority: 'normal'
            },
            'work-order-completed': {
                title: 'Work Order Completed',
                icon: '/icons/completed.png',
                badge: '/icons/badge.png',
                tag: 'work-order',
                requireInteraction: true,
                priority: 'high'
            },
            'quote-received': {
                title: 'Quote Received',
                icon: '/icons/quote.png',
                badge: '/icons/badge.png',
                tag: 'quote',
                requireInteraction: false,
                priority: 'normal'
            },
            'emergency-response': {
                title: 'Emergency Response Update',
                icon: '/icons/emergency.png',
                badge: '/icons/badge.png',
                tag: 'emergency',
                requireInteraction: true,
                priority: 'urgent'
            },
            
            // Subcontractor App Notifications
            'job-assigned': {
                title: 'New Job Assigned',
                icon: '/icons/job.png',
                badge: '/icons/badge.png',
                tag: 'job',
                requireInteraction: true,
                priority: 'high',
                vibrate: [200, 100, 200]
            },
            'urgent-job': {
                title: 'URGENT Job Assignment',
                icon: '/icons/urgent.png',
                badge: '/icons/badge.png',
                tag: 'urgent-job',
                requireInteraction: true,
                priority: 'urgent',
                vibrate: [300, 100, 300, 100, 300]
            },
            'job-cancelled': {
                title: 'Job Cancelled',
                icon: '/icons/cancelled.png',
                badge: '/icons/badge.png',
                tag: 'job',
                requireInteraction: false,
                priority: 'normal'
            },
            'payment-received': {
                title: 'Payment Received',
                icon: '/icons/payment.png',
                badge: '/icons/badge.png',
                tag: 'payment',
                requireInteraction: false,
                priority: 'normal'
            }
        };
    }

    /**
     * Initialize push notifications
     */
    async init() {
        if (!this.isSupported) {
            console.warn('Push notifications not supported');
            return false;
        }

        try {
            // Register service worker
            this.swRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', this.swRegistration);

            // Check if already subscribed
            const subscription = await this.swRegistration.pushManager.getSubscription();
            this.isSubscribed = !(subscription === null);

            if (this.isSubscribed) {
                console.log('User is already subscribed to push notifications');
            }

            // Listen for service worker messages
            navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

            return true;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            return false;
        }
    }

    /**
     * Request permission and subscribe to push notifications
     */
    async subscribe(userType = 'client') {
        if (!this.swRegistration) {
            await this.init();
        }

        try {
            const permission = await Notification.requestPermission();
            
            if (permission !== 'granted') {
                throw new Error('Permission denied');
            }

            // Subscribe to push notifications
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlB64ToUint8Array(this.getVapidPublicKey())
            });

            console.log('Push subscription:', subscription);

            // Send subscription to server
            await this.sendSubscriptionToServer(subscription, userType);

            this.isSubscribed = true;
            return subscription;

        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            throw error;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe() {
        if (!this.swRegistration) {
            return false;
        }

        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            
            if (subscription) {
                await subscription.unsubscribe();
                await this.removeSubscriptionFromServer(subscription);
                this.isSubscribed = false;
                console.log('Successfully unsubscribed from push notifications');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Failed to unsubscribe:', error);
            return false;
        }
    }

    /**
     * Send local notification (for testing or offline scenarios)
     */
    async showLocalNotification(type, data) {
        if (!('Notification' in window)) {
            console.warn('Notifications not supported');
            return;
        }

        if (Notification.permission !== 'granted') {
            console.warn('Notification permission not granted');
            return;
        }

        const config = this.notificationTypes[type];
        if (!config) {
            console.error('Unknown notification type:', type);
            return;
        }

        const notification = new Notification(config.title, {
            body: data.message,
            icon: config.icon,
            badge: config.badge,
            tag: config.tag,
            requireInteraction: config.requireInteraction,
            vibrate: config.vibrate || [200, 100, 200],
            data: {
                type: type,
                ...data
            }
        });

        notification.onclick = (event) => {
            event.preventDefault();
            this.handleNotificationClick(type, data);
            notification.close();
        };

        // Auto-close non-urgent notifications
        if (config.priority !== 'urgent' && config.priority !== 'high') {
            setTimeout(() => {
                notification.close();
            }, 5000);
        }
    }

    /**
     * Handle notification clicks
     */
    handleNotificationClick(type, data) {
        // Open the app or navigate to relevant section
        const url = this.getNotificationUrl(type, data);
        
        if (window.focus) {
            window.focus();
        }

        // Navigate to relevant section based on notification type
        switch (type) {
            case 'work-order-assigned':
            case 'work-order-completed':
                if (typeof showView === 'function') {
                    showView('work-orders');
                }
                break;
            case 'job-assigned':
            case 'urgent-job':
                if (typeof showView === 'function') {
                    showView('jobs');
                }
                break;
            case 'quote-received':
                if (typeof showView === 'function') {
                    showView('quotes');
                }
                break;
            default:
                if (typeof showView === 'function') {
                    showView('dashboard');
                }
        }

        // Update badge count
        this.updateBadgeCount();
    }

    /**
     * Get URL for notification based on type and data
     */
    getNotificationUrl(type, data) {
        const baseUrl = window.location.origin;
        
        switch (type) {
            case 'work-order-assigned':
            case 'work-order-completed':
                return `${baseUrl}#work-orders`;
            case 'job-assigned':
            case 'urgent-job':
                return `${baseUrl}#jobs`;
            case 'quote-received':
                return `${baseUrl}#quotes`;
            default:
                return `${baseUrl}#dashboard`;
        }
    }

    /**
     * Update badge count on app icon
     */
    updateBadgeCount() {
        // This would typically get the count from your app state
        const count = this.getUnreadNotificationCount();
        
        if ('setAppBadge' in navigator) {
            navigator.setAppBadge(count);
        }
    }

    /**
     * Get unread notification count (mock implementation)
     */
    getUnreadNotificationCount() {
        // In a real app, this would come from your state management
        const workOrders = parseInt(document.querySelector('[data-badge="work-orders"]')?.textContent || '0');
        const messages = parseInt(document.querySelector('[data-badge="messages"]')?.textContent || '0');
        const jobs = parseInt(document.querySelector('[data-badge="jobs"]')?.textContent || '0');
        
        return workOrders + messages + jobs;
    }

    /**
     * Handle service worker messages
     */
    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'notification-clicked':
                this.handleNotificationClick(data.notificationType, data);
                break;
            case 'background-sync':
                this.handleBackgroundSync(data);
                break;
        }
    }

    /**
     * Handle background sync events
     */
    handleBackgroundSync(data) {
        console.log('Background sync triggered:', data);
        
        // Refresh data based on sync type
        switch (data.syncType) {
            case 'work-orders':
                if (typeof refreshWorkOrders === 'function') {
                    refreshWorkOrders();
                }
                break;
            case 'jobs':
                if (typeof refreshJobs === 'function') {
                    refreshJobs();
                }
                break;
            case 'messages':
                if (typeof refreshMessages === 'function') {
                    refreshMessages();
                }
                break;
        }
    }

    /**
     * Send subscription to server
     */
    async sendSubscriptionToServer(subscription, userType) {
        const endpoint = '/api/push-subscriptions';
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription: subscription,
                    userType: userType,
                    timestamp: Date.now()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save subscription to server');
            }

            console.log('Subscription saved to server');
        } catch (error) {
            console.error('Error sending subscription to server:', error);
            throw error;
        }
    }

    /**
     * Remove subscription from server
     */
    async removeSubscriptionFromServer(subscription) {
        const endpoint = '/api/push-subscriptions';
        
        try {
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription: subscription
                })
            });

            if (!response.ok) {
                throw new Error('Failed to remove subscription from server');
            }

            console.log('Subscription removed from server');
        } catch (error) {
            console.error('Error removing subscription from server:', error);
        }
    }

    /**
     * Get VAPID public key (in production, this would come from your server)
     */
    getVapidPublicKey() {
        // This is a placeholder - replace with your actual VAPID public key
        return 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NqILWjj4zQEPEF7Ef1g6xjJiRE0IhV4PnQX8Nj_oL4lJZU4K6cTfmk';
    }

    /**
     * Convert VAPID key from base64 to Uint8Array
     */
    urlB64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}

/**
 * Real-time Sync Service
 */
class RealTimeSyncService {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnected = false;
        this.userId = null;
        this.userType = null;
        
        // Message handlers
        this.messageHandlers = {
            'work-order-update': this.handleWorkOrderUpdate.bind(this),
            'job-assignment': this.handleJobAssignment.bind(this),
            'message-received': this.handleMessageReceived.bind(this),
            'status-change': this.handleStatusChange.bind(this),
            'emergency-alert': this.handleEmergencyAlert.bind(this)
        };
    }

    /**
     * Initialize WebSocket connection
     */
    connect(userId, userType) {
        this.userId = userId;
        this.userType = userType;
        
        const wsUrl = `wss://${window.location.host}/ws?userId=${userId}&userType=${userType}`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = this.handleOpen.bind(this);
            this.ws.onmessage = this.handleMessage.bind(this);
            this.ws.onclose = this.handleClose.bind(this);
            this.ws.onerror = this.handleError.bind(this);
            
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Handle WebSocket connection opened
     */
    handleOpen(event) {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send authentication
        this.send({
            type: 'authenticate',
            userId: this.userId,
            userType: this.userType,
            timestamp: Date.now()
        });
        
        // Update connection status in UI
        this.updateConnectionStatus(true);
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log('WebSocket message received:', message);
            
            const handler = this.messageHandlers[message.type];
            if (handler) {
                handler(message.data);
            } else {
                console.warn('Unknown message type:', message.type);
            }
            
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }

    /**
     * Handle WebSocket connection closed
     */
    handleClose(event) {
        console.log('WebSocket connection closed:', event);
        this.isConnected = false;
        this.updateConnectionStatus(false);
        
        if (!event.wasClean) {
            this.scheduleReconnect();
        }
    }

    /**
     * Handle WebSocket errors
     */
    handleError(event) {
        console.error('WebSocket error:', event);
        this.isConnected = false;
        this.updateConnectionStatus(false);
    }

    /**
     * Send message through WebSocket
     */
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected, message not sent:', message);
        }
    }

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
            
            setTimeout(() => {
                this.connect(this.userId, this.userType);
            }, delay);
        } else {
            console.error('Max reconnect attempts reached');
            this.showOfflineMode();
        }
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(connected) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('#statusText');
        
        if (statusDot) {
            statusDot.style.background = connected ? 'var(--field-active)' : 'var(--field-danger)';
        }
        
        if (statusText && !statusText.textContent.includes('Duty')) {
            statusText.textContent = connected ? 'Online' : 'Offline';
        }
    }

    /**
     * Show offline mode notification
     */
    showOfflineMode() {
        if (typeof showToast === 'function') {
            showToast('Working offline - some features may be limited', 'warning');
        }
    }

    // Message Handlers

    handleWorkOrderUpdate(data) {
        console.log('Work order update:', data);
        
        // Update UI if on work orders view
        if (typeof refreshWorkOrders === 'function') {
            refreshWorkOrders();
        }
        
        // Show notification if app is in background
        if (document.hidden && notificationService) {
            notificationService.showLocalNotification('work-order-assigned', data);
        }
        
        // Update badge counts
        this.updateBadgeCount('work-orders');
    }

    handleJobAssignment(data) {
        console.log('Job assignment:', data);
        
        // Update jobs list
        if (typeof refreshJobs === 'function') {
            refreshJobs();
        }
        
        // Show notification
        if (notificationService) {
            const notificationType = data.priority === 'urgent' ? 'urgent-job' : 'job-assigned';
            notificationService.showLocalNotification(notificationType, data);
        }
        
        // Update badge count
        this.updateBadgeCount('jobs');
        
        // Play sound for urgent jobs
        if (data.priority === 'urgent') {
            this.playUrgentSound();
        }
    }

    handleMessageReceived(data) {
        console.log('Message received:', data);
        
        // Update messages UI
        if (typeof refreshMessages === 'function') {
            refreshMessages();
        }
        
        // Update badge count
        this.updateBadgeCount('messages');
        
        // Show toast if not on messages view
        const currentView = document.querySelector('.mobile-view:not(.hidden)')?.id;
        if (currentView !== 'messagesView' && typeof showToast === 'function') {
            showToast(`New message from ${data.sender}`, 'info');
        }
    }

    handleStatusChange(data) {
        console.log('Status change:', data);
        
        // Update relevant UI elements based on status change
        this.refreshCurrentView();
    }

    handleEmergencyAlert(data) {
        console.log('Emergency alert:', data);
        
        // Show emergency notification
        if (notificationService) {
            notificationService.showLocalNotification('emergency-response', data);
        }
        
        // Play urgent sound
        this.playUrgentSound();
        
        // Show modal if critical
        if (data.critical) {
            this.showEmergencyModal(data);
        }
    }

    /**
     * Update badge count for a specific section
     */
    updateBadgeCount(section) {
        const badge = document.querySelector(`[data-badge="${section}"]`);
        if (badge) {
            let count = parseInt(badge.textContent || '0');
            badge.textContent = count + 1;
            badge.style.display = 'block';
        }
    }

    /**
     * Play urgent notification sound
     */
    playUrgentSound() {
        // Create audio element and play urgent sound
        const audio = new Audio('/sounds/urgent-notification.mp3');
        audio.play().catch(error => {
            console.log('Could not play notification sound:', error);
        });
    }

    /**
     * Refresh current view
     */
    refreshCurrentView() {
        const currentView = document.querySelector('.mobile-view:not(.hidden)')?.id;
        
        switch (currentView) {
            case 'dashboardView':
                if (typeof refreshDashboard === 'function') {
                    refreshDashboard();
                }
                break;
            case 'workOrdersView':
            case 'jobsView':
                if (typeof refreshWorkOrders === 'function') {
                    refreshWorkOrders();
                }
                if (typeof refreshJobs === 'function') {
                    refreshJobs();
                }
                break;
            case 'messagesView':
                if (typeof refreshMessages === 'function') {
                    refreshMessages();
                }
                break;
        }
    }

    /**
     * Show emergency modal
     */
    showEmergencyModal(data) {
        const modal = document.createElement('div');
        modal.className = 'mobile-modal center';
        modal.innerHTML = `
            <div class="modal-content" style="border: 3px solid var(--field-danger);">
                <div class="modal-header" style="background: var(--field-danger); color: white;">
                    <h3>🚨 EMERGENCY ALERT</h3>
                </div>
                <div style="padding: 1.5rem; text-align: center;">
                    <div style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">${data.title}</div>
                    <div style="margin-bottom: 1.5rem;">${data.message}</div>
                    <button class="btn-field emergency" onclick="this.closest('.mobile-modal').remove()" style="width: 100%;">
                        Acknowledged
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'User disconnect');
        }
    }
}

// Global instances
let notificationService = null;
let syncService = null;

// Initialize services when page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize notification service
    notificationService = new NotificationService();
    await notificationService.init();
    
    // Initialize sync service
    syncService = new RealTimeSyncService();
    
    // Auto-subscribe to notifications (you might want to ask user first)
    // await notificationService.subscribe(userType);
    
    // Connect to real-time sync (you'd get userId and userType from your auth system)
    // syncService.connect(userId, userType);
});

// Export for use in other files
window.NotificationService = NotificationService;
window.RealTimeSyncService = RealTimeSyncService;
window.notificationService = notificationService;
window.syncService = syncService;