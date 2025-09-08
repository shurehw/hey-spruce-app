// Main UI Module - Export all components
export { UIConfig, Utils } from './config.js';
export { BadgeManager } from './badges.js';
export { NotificationManager, notifications } from './notifications.js';
export { ModalManager, modals } from './modals.js';
export { TableManager } from './tables.js';
export { FormManager, WorkOrderForm } from './forms.js';
export { ChartManager, SpruceCharts } from './charts.js';

// Initialize global UI components
export function initializeUI() {
  // Set up global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for command palette (if implemented)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      // Open command palette
      console.log('Command palette shortcut triggered');
    }
    
    // Escape to close any open dropdowns/menus
    if (e.key === 'Escape') {
      document.querySelectorAll('.dropdown.is-open').forEach(dropdown => {
        dropdown.classList.remove('is-open');
      });
    }
  });

  // Set up global click handlers
  document.addEventListener('click', (e) => {
    // Close dropdowns when clicking outside
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown.is-open').forEach(dropdown => {
        dropdown.classList.remove('is-open');
      });
    }
  });

  // Initialize tooltips
  initializeTooltips();
  
  // Initialize dropdowns
  initializeDropdowns();
  
  // Initialize tabs
  initializeTabs();
  
  // Set portal theme
  setPortalTheme();
  
  console.log('Spruce App UI initialized');
}

// Tooltip system
function initializeTooltips() {
  const tooltips = document.querySelectorAll('[data-tooltip]');
  
  tooltips.forEach(element => {
    element.addEventListener('mouseenter', showTooltip);
    element.addEventListener('mouseleave', hideTooltip);
  });
}

function showTooltip(e) {
  const text = e.target.dataset.tooltip;
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = text;
  tooltip.style.cssText = `
    position: absolute;
    background: #1a2522;
    color: var(--spruce-text);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.85rem;
    z-index: 1000;
    pointer-events: none;
    box-shadow: var(--shadow);
    border: 1px solid #25312e;
  `;
  
  document.body.appendChild(tooltip);
  
  const rect = e.target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  tooltip.style.left = rect.left + (rect.width / 2) - (tooltipRect.width / 2) + 'px';
  tooltip.style.top = rect.top - tooltipRect.height - 8 + 'px';
  
  e.target._tooltip = tooltip;
}

function hideTooltip(e) {
  if (e.target._tooltip) {
    e.target._tooltip.remove();
    delete e.target._tooltip;
  }
}

// Dropdown system
function initializeDropdowns() {
  const dropdowns = document.querySelectorAll('.dropdown');
  
  dropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.dropdown__trigger');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('is-open');
      });
    }
  });
}

// Tab system
function initializeTabs() {
  const tabContainers = document.querySelectorAll('[data-tabs]');
  
  tabContainers.forEach(container => {
    const tabs = container.querySelectorAll('.tabs button');
    const panels = container.querySelectorAll('[data-tab-panel]');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetPanel = tab.dataset.tab;
        
        // Update tab states
        tabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        
        // Update panel states
        panels.forEach(panel => {
          if (panel.dataset.tabPanel === targetPanel) {
            panel.style.display = 'block';
          } else {
            panel.style.display = 'none';
          }
        });
      });
    });
  });
}

// Set portal-specific theme
function setPortalTheme() {
  const portalType = Utils.getPortalType();
  document.body.classList.add(`portal-${portalType}`);
}

// Utility functions for common UI patterns
export const UI = {
  // Show loading state
  showLoading(element, text = 'Loading...') {
    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.innerHTML = `
      <div class="loading-content">
        <div class="loading"></div>
        <span>${text}</span>
      </div>
    `;
    loading.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(11, 18, 16, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      backdrop-filter: blur(2px);
    `;
    
    element.style.position = 'relative';
    element.appendChild(loading);
    return loading;
  },

  // Hide loading state
  hideLoading(element) {
    const loading = element.querySelector('.loading-overlay');
    if (loading) {
      loading.remove();
    }
  },

  // Format numbers with commas
  formatNumber(num) {
    return num.toLocaleString();
  },

  // Truncate text with ellipsis
  truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  },

  // Copy text to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      notifications.success('Copied to clipboard');
      return true;
    } catch (err) {
      notifications.error('Failed to copy to clipboard');
      return false;
    }
  },

  // Smooth scroll to element
  scrollTo(element, offset = 0) {
    const rect = element.getBoundingClientRect();
    const targetY = window.pageYOffset + rect.top - offset;
    
    window.scrollTo({
      top: targetY,
      behavior: 'smooth'
    });
  },

  // Animate element entrance
  animateIn(element, animation = 'fadeIn') {
    element.style.animation = `${animation} ${UIConfig.animations.duration}ms ${UIConfig.animations.easing}`;
  },

  // Create confirm dialog
  confirm: (title, message) => modals.confirm(title, message),
  
  // Create alert dialog
  alert: (title, message) => modals.alert(title, message),
  
  // Show notification
  notify: (message, type, options) => notifications.show(message, type, options)
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  initializeUI();
}