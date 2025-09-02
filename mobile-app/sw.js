/**
 * Service Worker for Hey Spruce Mobile Apps
 * Handles push notifications, background sync, and offline caching
 */

const CACHE_NAME = 'hey-spruce-v1';
const urlsToCache = [
    '/',
    '/client-app.html',
    '/subcontractor-app.html',
    '/push-notifications.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/sounds/urgent-notification.mp3'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
    console.log('Service Worker installing');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
    console.log('Service Worker activating');
    
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                
                // Clone the request because it's a stream
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest).then(function(response) {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response because it's a stream
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(function(cache) {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            }).catch(function() {
                // Return offline fallback for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/offline.html');
                }
            })
    );
});

// Push event - handle incoming push notifications
self.addEventListener('push', function(event) {
    console.log('Push message received:', event);
    
    let notificationData = {
        title: 'Hey Spruce',
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'default',
        requireInteraction: false,
        data: {}
    };
    
    // Parse push data
    if (event.data) {
        try {
            const data = event.data.json();
            notificationData = { ...notificationData, ...data };
        } catch (error) {
            console.error('Error parsing push data:', error);
        }
    }
    
    // Determine notification config based on type
    const config = getNotificationConfig(notificationData.type);
    if (config) {
        notificationData = { ...notificationData, ...config };
    }
    
    const options = {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: notificationData.tag,
        requireInteraction: notificationData.requireInteraction,
        vibrate: notificationData.vibrate || [200, 100, 200],
        data: {
            url: notificationData.url || '/',
            type: notificationData.type,
            ...notificationData.data
        },
        actions: getNotificationActions(notificationData.type)
    };
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', function(event) {
    console.log('Notification clicked:', event);
    
    const notification = event.notification;
    const data = notification.data;
    
    notification.close();
    
    // Handle action buttons
    if (event.action) {
        handleNotificationAction(event.action, data);
        return;
    }
    
    // Default click behavior - open the app
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function(clientList) {
            const url = data.url || '/';
            
            // Check if app is already open
            for (let client of clientList) {
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // Open new window/tab
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
    
    // Notify the main thread about the click
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'notification-clicked',
                data: {
                    notificationType: data.type,
                    ...data
                }
            });
        });
    });
});

// Background sync event
self.addEventListener('sync', function(event) {
    console.log('Background sync triggered:', event.tag);
    
    switch (event.tag) {
        case 'work-order-sync':
            event.waitUntil(syncWorkOrders());
            break;
        case 'job-sync':
            event.waitUntil(syncJobs());
            break;
        case 'message-sync':
            event.waitUntil(syncMessages());
            break;
        case 'photo-upload':
            event.waitUntil(uploadPendingPhotos());
            break;
        case 'time-tracking':
            event.waitUntil(syncTimeTracking());
            break;
        default:
            console.log('Unknown sync tag:', event.tag);
    }
});

// Background fetch event (for large downloads)
self.addEventListener('backgroundfetch', function(event) {
    if (event.tag === 'download-docs') {
        event.waitUntil(handleDocumentDownload(event));
    }
});

/**
 * Get notification configuration based on type
 */
function getNotificationConfig(type) {
    const configs = {
        // Client App Notifications
        'work-order-assigned': {
            icon: '/icons/work-order.png',
            requireInteraction: false,
            vibrate: [200, 100, 200]
        },
        'work-order-completed': {
            icon: '/icons/completed.png',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200]
        },
        'quote-received': {
            icon: '/icons/quote.png',
            requireInteraction: false,
            vibrate: [200, 100, 200]
        },
        'emergency-response': {
            icon: '/icons/emergency.png',
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
            tag: 'emergency'
        },
        
        // Subcontractor App Notifications
        'job-assigned': {
            icon: '/icons/job.png',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200]
        },
        'urgent-job': {
            icon: '/icons/urgent.png',
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300, 100, 300],
            tag: 'urgent-job'
        },
        'job-cancelled': {
            icon: '/icons/cancelled.png',
            requireInteraction: false,
            vibrate: [100, 50, 100]
        },
        'payment-received': {
            icon: '/icons/payment.png',
            requireInteraction: false,
            vibrate: [200, 100, 200]
        }
    };
    
    return configs[type] || {};
}

/**
 * Get notification action buttons based on type
 */
function getNotificationActions(type) {
    const actions = {
        'work-order-assigned': [
            { action: 'view', title: '👁️ View Details', icon: '/icons/view.png' },
            { action: 'dismiss', title: '✕ Dismiss', icon: '/icons/dismiss.png' }
        ],
        'work-order-completed': [
            { action: 'review', title: '⭐ Review Work', icon: '/icons/review.png' },
            { action: 'view', title: '👁️ View Details', icon: '/icons/view.png' }
        ],
        'job-assigned': [
            { action: 'accept', title: '✅ Accept Job', icon: '/icons/accept.png' },
            { action: 'view', title: '👁️ View Details', icon: '/icons/view.png' }
        ],
        'urgent-job': [
            { action: 'accept', title: '🚨 Accept Urgent', icon: '/icons/urgent-accept.png' },
            { action: 'call', title: '📞 Call Dispatch', icon: '/icons/call.png' }
        ],
        'emergency-response': [
            { action: 'acknowledge', title: '✅ Acknowledge', icon: '/icons/ack.png' },
            { action: 'call', title: '📞 Emergency Call', icon: '/icons/emergency-call.png' }
        ]
    };
    
    return actions[type] || [
        { action: 'view', title: '👁️ View', icon: '/icons/view.png' },
        { action: 'dismiss', title: '✕ Dismiss', icon: '/icons/dismiss.png' }
    ];
}

/**
 * Handle notification action button clicks
 */
function handleNotificationAction(action, data) {
    console.log('Notification action:', action, data);
    
    switch (action) {
        case 'accept':
            handleJobAcceptance(data);
            break;
        case 'review':
            openReviewModal(data);
            break;
        case 'call':
            initiateCall(data);
            break;
        case 'acknowledge':
            acknowledgeEmergency(data);
            break;
        case 'view':
            openDetailsView(data);
            break;
        case 'dismiss':
            // Just dismiss - no action needed
            break;
        default:
            console.log('Unknown action:', action);
    }
    
    // Notify main thread
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'notification-action',
                action: action,
                data: data
            });
        });
    });
}

/**
 * Handle job acceptance from notification
 */
function handleJobAcceptance(data) {
    // Send job acceptance to server
    fetch('/api/jobs/accept', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jobId: data.jobId,
            timestamp: Date.now()
        })
    }).catch(error => {
        console.error('Error accepting job:', error);
        // Queue for retry
        registerBackgroundSync('job-acceptance');
    });
}

/**
 * Open review modal
 */
function openReviewModal(data) {
    clients.openWindow(`/?action=review&workOrderId=${data.workOrderId}`);
}

/**
 * Initiate emergency call
 */
function initiateCall(data) {
    const phoneNumber = data.emergencyNumber || '1-800-HEY-SPRUCE';
    clients.openWindow(`tel:${phoneNumber}`);
}

/**
 * Acknowledge emergency
 */
function acknowledgeEmergency(data) {
    fetch('/api/emergency/acknowledge', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            emergencyId: data.emergencyId,
            timestamp: Date.now()
        })
    }).catch(error => {
        console.error('Error acknowledging emergency:', error);
    });
}

/**
 * Open details view
 */
function openDetailsView(data) {
    const url = data.detailsUrl || `/?id=${data.id}`;
    clients.openWindow(url);
}

/**
 * Background sync functions
 */

async function syncWorkOrders() {
    try {
        console.log('Syncing work orders...');
        
        // Get pending work order updates from IndexedDB
        const pendingUpdates = await getPendingUpdates('work-orders');
        
        for (const update of pendingUpdates) {
            try {
                const response = await fetch('/api/work-orders/sync', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(update)
                });
                
                if (response.ok) {
                    await removePendingUpdate('work-orders', update.id);
                }
            } catch (error) {
                console.error('Error syncing work order:', error);
            }
        }
        
        // Notify main thread
        notifyMainThread('background-sync', { syncType: 'work-orders' });
        
    } catch (error) {
        console.error('Background sync failed for work orders:', error);
    }
}

async function syncJobs() {
    try {
        console.log('Syncing jobs...');
        
        const pendingUpdates = await getPendingUpdates('jobs');
        
        for (const update of pendingUpdates) {
            try {
                const response = await fetch('/api/jobs/sync', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(update)
                });
                
                if (response.ok) {
                    await removePendingUpdate('jobs', update.id);
                }
            } catch (error) {
                console.error('Error syncing job:', error);
            }
        }
        
        notifyMainThread('background-sync', { syncType: 'jobs' });
        
    } catch (error) {
        console.error('Background sync failed for jobs:', error);
    }
}

async function syncMessages() {
    try {
        console.log('Syncing messages...');
        
        const pendingMessages = await getPendingUpdates('messages');
        
        for (const message of pendingMessages) {
            try {
                const response = await fetch('/api/messages/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(message)
                });
                
                if (response.ok) {
                    await removePendingUpdate('messages', message.id);
                }
            } catch (error) {
                console.error('Error syncing message:', error);
            }
        }
        
        notifyMainThread('background-sync', { syncType: 'messages' });
        
    } catch (error) {
        console.error('Background sync failed for messages:', error);
    }
}

async function uploadPendingPhotos() {
    try {
        console.log('Uploading pending photos...');
        
        const pendingPhotos = await getPendingUpdates('photos');
        
        for (const photo of pendingPhotos) {
            try {
                const formData = new FormData();
                formData.append('photo', photo.blob);
                formData.append('jobId', photo.jobId);
                formData.append('type', photo.type);
                
                const response = await fetch('/api/photos/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    await removePendingUpdate('photos', photo.id);
                }
            } catch (error) {
                console.error('Error uploading photo:', error);
            }
        }
        
        notifyMainThread('background-sync', { syncType: 'photos' });
        
    } catch (error) {
        console.error('Background sync failed for photos:', error);
    }
}

async function syncTimeTracking() {
    try {
        console.log('Syncing time tracking...');
        
        const pendingTimeEntries = await getPendingUpdates('time-tracking');
        
        for (const entry of pendingTimeEntries) {
            try {
                const response = await fetch('/api/time-tracking/sync', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(entry)
                });
                
                if (response.ok) {
                    await removePendingUpdate('time-tracking', entry.id);
                }
            } catch (error) {
                console.error('Error syncing time entry:', error);
            }
        }
        
        notifyMainThread('background-sync', { syncType: 'time-tracking' });
        
    } catch (error) {
        console.error('Background sync failed for time tracking:', error);
    }
}

/**
 * IndexedDB operations for offline storage
 */

async function getPendingUpdates(type) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('hey-spruce-offline', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([type], 'readonly');
            const store = transaction.objectStore(type);
            const getRequest = store.getAll();
            
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object stores for different types
            const types = ['work-orders', 'jobs', 'messages', 'photos', 'time-tracking'];
            types.forEach(type => {
                if (!db.objectStoreNames.contains(type)) {
                    const store = db.createObjectStore(type, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            });
        };
    });
}

async function removePendingUpdate(type, id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('hey-spruce-offline', 1);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([type], 'readwrite');
            const store = transaction.objectStore(type);
            const deleteRequest = store.delete(id);
            
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

/**
 * Register background sync
 */
function registerBackgroundSync(tag) {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(function(swRegistration) {
            return swRegistration.sync.register(tag);
        }).catch(function(error) {
            console.error('Background sync registration failed:', error);
        });
    }
}

/**
 * Notify main thread of sync completion
 */
function notifyMainThread(type, data) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: type,
                data: data
            });
        });
    });
}