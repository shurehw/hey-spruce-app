// UI Configuration and Core Components
export const UIConfig = {
  // Brand colors - matching CSS variables
  colors: {
    primary: '#2fbf71',
    secondary: '#4fd3a1',
    surface: '#121a18',
    text: '#ecf2f0',
    muted: '#b7c4c0',
    success: '#2fbf71',
    warning: '#ffb020',
    danger: '#ff5a5f',
    client: '#667eea',
    admin: '#6366f1',
    sub: '#10b981'
  },

  // Animation settings
  animations: {
    duration: 200,
    easing: 'ease',
    slideDistance: '20px'
  },

  // Breakpoints for responsive design
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  },

  // Toast notification settings
  toast: {
    duration: 4000,
    position: 'top-right'
  }
};

// Utility functions
export const Utils = {
  // Debounce function for search/input
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  },

  // Format date
  formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  },

  // Format relative time
  formatRelativeTime(date) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24);
    
    if (Math.abs(diff) < 1) {
      return 'Today';
    } else if (Math.abs(diff) < 7) {
      return rtf.format(Math.round(diff), 'day');
    } else {
      return this.formatDate(date);
    }
  },

  // Generate unique ID
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  },

  // Check if device is mobile
  isMobile() {
    return window.innerWidth < UIConfig.breakpoints.mobile;
  },

  // Get portal type from body class
  getPortalType() {
    if (document.body.classList.contains('portal-client')) return 'client';
    if (document.body.classList.contains('portal-admin')) return 'admin';
    if (document.body.classList.contains('portal-sub')) return 'sub';
    return 'default';
  }
};