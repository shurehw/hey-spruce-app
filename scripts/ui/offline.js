// Offline and Mobile Support
import { notifications } from './notifications.js';
import { UIConfig } from './config.js';

export class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.setupEventListeners();
    this.initServiceWorker();
    this.setupStorage();
  }

  setupEventListeners() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Listen for beforeinstallprompt event (PWA install)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPromptEvent = e;
      this.showInstallPrompt();
    });
  }

  async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('ServiceWorker registered:', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              notifications.info('App update available', {
                action: {
                  text: 'Reload',
                  handler: () => window.location.reload()
                }
              });
            }
          });
        });
      } catch (error) {
        console.warn('ServiceWorker registration failed:', error);
      }
    }
  }

  setupStorage() {
    this.storage = {
      // Local storage wrapper with fallback
      set: (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
          console.warn('Storage quota exceeded');
          this.cleanupStorage();
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch (e2) {
            console.error('Unable to store data:', e2);
          }
        }
      },
      
      get: (key) => {
        try {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        } catch (e) {
          console.warn('Error reading from storage:', e);
          return null;
        }
      },
      
      remove: (key) => {
        localStorage.removeItem(key);
      }
    };
  }

  handleOnline() {
    this.isOnline = true;
    notifications.success('Back online! Syncing data...');
    this.syncData();
  }

  handleOffline() {
    this.isOnline = false;
    notifications.warning('You\'re offline. Some features may be limited.');
  }

  // Queue operations for sync when back online
  queueForSync(operation) {
    operation.timestamp = Date.now();
    this.syncQueue.push(operation);
    this.storage.set('syncQueue', this.syncQueue);
    
    if (this.isOnline) {
      this.syncData();
    }
  }

  async syncData() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const operation of queue) {
      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error('Sync operation failed:', operation, error);
        // Re-queue failed operations
        this.syncQueue.push(operation);
      }
    }

    this.storage.set('syncQueue', this.syncQueue);
    
    if (queue.length > 0) {
      notifications.success(`Synced ${queue.length - this.syncQueue.length} operations`);
    }
  }

  async executeOperation(operation) {
    const { type, url, data, method = 'POST' } = operation;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Cache management
  cacheData(key, data, expiryHours = 24) {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (expiryHours * 60 * 60 * 1000)
    };
    this.storage.set(`cache_${key}`, cacheItem);
  }

  getCachedData(key) {
    const cacheItem = this.storage.get(`cache_${key}`);
    if (!cacheItem) return null;
    
    if (Date.now() > cacheItem.expiry) {
      this.storage.remove(`cache_${key}`);
      return null;
    }
    
    return cacheItem.data;
  }

  cleanupStorage() {
    // Remove expired cache items
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        const item = this.storage.get(key);
        if (item && Date.now() > item.expiry) {
          this.storage.remove(key);
        }
      }
    });
    
    // Keep only last 50 sync operations
    if (this.syncQueue.length > 50) {
      this.syncQueue = this.syncQueue.slice(-50);
      this.storage.set('syncQueue', this.syncQueue);
    }
  }

  showInstallPrompt() {
    if (!this.installPromptEvent) return;

    notifications.info('Install app for better offline experience', {
      duration: 8000,
      action: {
        text: 'Install',
        handler: () => this.installApp()
      }
    });
  }

  async installApp() {
    if (!this.installPromptEvent) return;

    const result = await this.installPromptEvent.prompt();
    console.log('Install prompt result:', result);
    
    this.installPromptEvent = null;
  }

  // Mobile-specific features
  setupMobileFeatures() {
    // Add touch gestures
    this.setupTouchGestures();
    
    // Handle device orientation
    this.setupOrientationHandling();
    
    // Optimize for mobile keyboards
    this.setupMobileKeyboard();
    
    // Add pull-to-refresh
    this.setupPullToRefresh();
  }

  setupTouchGestures() {
    let startY = 0;
    let startX = 0;

    document.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
    });

    document.addEventListener('touchmove', (e) => {
      // Prevent overscroll on iOS
      if (e.touches.length > 1) return;
      
      const currentY = e.touches[0].clientY;
      const diffY = startY - currentY;
      
      // Check if at top and pulling down
      if (window.scrollY === 0 && diffY < -100) {
        this.triggerRefresh();
      }
    });
  }

  setupOrientationHandling() {
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        window.scrollTo(0, 0);
        this.adjustLayoutForOrientation();
      }, 100);
    });
  }

  setupMobileKeyboard() {
    // Scroll input fields into view on mobile
    const inputs = document.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        if (UIConfig.breakpoints.mobile > window.innerWidth) {
          setTimeout(() => {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      });
    });
  }

  setupPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let pullDistance = 0;
    const maxPullDistance = 80;
    let refreshIndicator = null;

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (window.scrollY > 0) return;

      currentY = e.touches[0].clientY;
      pullDistance = Math.max(0, currentY - startY);

      if (pullDistance > 10) {
        e.preventDefault();
        
        if (!refreshIndicator) {
          refreshIndicator = this.createRefreshIndicator();
        }
        
        const progress = Math.min(pullDistance / maxPullDistance, 1);
        this.updateRefreshIndicator(refreshIndicator, progress);
      }
    });

    document.addEventListener('touchend', () => {
      if (pullDistance > maxPullDistance) {
        this.triggerRefresh();
      }
      
      if (refreshIndicator) {
        refreshIndicator.remove();
        refreshIndicator = null;
      }
      
      startY = 0;
      currentY = 0;
      pullDistance = 0;
    });
  }

  createRefreshIndicator() {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      background: var(--spruce-surface);
      border: 1px solid var(--spruce-brand);
      border-radius: 20px;
      padding: 8px 16px;
      z-index: 1000;
      transition: all 0.2s ease;
    `;
    indicator.textContent = 'Pull to refresh';
    document.body.appendChild(indicator);
    return indicator;
  }

  updateRefreshIndicator(indicator, progress) {
    const maxPull = 80;
    indicator.style.top = Math.min(progress * maxPull, maxPull) + 'px';
    
    if (progress >= 1) {
      indicator.textContent = 'Release to refresh';
      indicator.style.borderColor = 'var(--success)';
    } else {
      indicator.textContent = 'Pull to refresh';
      indicator.style.borderColor = 'var(--spruce-brand)';
    }
  }

  triggerRefresh() {
    notifications.info('Refreshing...');
    // Simulate refresh - implement actual refresh logic
    setTimeout(() => {
      notifications.success('Content refreshed');
    }, 1000);
  }

  adjustLayoutForOrientation() {
    const isLandscape = window.orientation === 90 || window.orientation === -90;
    document.body.classList.toggle('landscape', isLandscape);
    
    // Hide elements that take up too much space in landscape
    if (isLandscape) {
      document.querySelectorAll('.hide-landscape').forEach(el => {
        el.style.display = 'none';
      });
    } else {
      document.querySelectorAll('.hide-landscape').forEach(el => {
        el.style.display = '';
      });
    }
  }

  // Network status monitoring
  getNetworkInfo() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  adaptToNetworkConditions() {
    const networkInfo = this.getNetworkInfo();
    if (!networkInfo) return;

    // Reduce image quality on slow connections
    if (networkInfo.effectiveType === '2g' || networkInfo.effectiveType === 'slow-2g') {
      document.documentElement.classList.add('slow-network');
      notifications.warning('Slow network detected - reducing image quality');
    }

    // Enable data saver mode
    if (networkInfo.saveData) {
      document.documentElement.classList.add('save-data');
      notifications.info('Data saver mode enabled');
    }
  }
}

// Global offline manager instance
export const offlineManager = new OfflineManager();

// Mobile detection utilities
export const MobileUtils = {
  isMobile: () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
  isIOS: () => /iPhone|iPad|iPod/i.test(navigator.userAgent),
  isAndroid: () => /Android/i.test(navigator.userAgent),
  isStandalone: () => window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches,
  
  // Haptic feedback (if supported)
  vibrate: (pattern = 100) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },
  
  // Copy to clipboard with fallback
  copyToClipboard: async (text) => {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('Clipboard API failed:', err);
      }
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  },
  
  // Share API (if supported)
  share: async (data) => {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share API failed:', err);
        }
      }
    }
    return false;
  }
};