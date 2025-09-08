// Notification/Toast System
import { UIConfig, Utils } from './config.js';

export class NotificationManager {
  constructor() {
    this.container = this.createContainer();
    this.notifications = new Set();
  }

  createContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        max-width: 400px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    return container;
  }

  show(message, type = 'info', options = {}) {
    const notification = this.createNotification(message, type, options);
    this.container.appendChild(notification);
    this.notifications.add(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });

    // Auto dismiss
    const duration = options.duration || UIConfig.toast.duration;
    if (duration > 0) {
      setTimeout(() => this.dismiss(notification), duration);
    }

    return notification;
  }

  createNotification(message, type, options) {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.style.cssText = `
      transform: translateX(100%);
      opacity: 0;
      transition: all ${UIConfig.animations.duration}ms ${UIConfig.animations.easing};
      margin-bottom: 12px;
      pointer-events: auto;
      cursor: pointer;
    `;

    // Icon mapping
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const content = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">${icons[type] || icons.info}</span>
        <div>
          <div style="font-weight: 500;">${message}</div>
          ${options.subtitle ? `<div style="font-size: 0.85em; opacity: 0.8; margin-top: 2px;">${options.subtitle}</div>` : ''}
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          color: inherit;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.6;
          margin-left: auto;
        ">×</button>
      </div>
    `;

    notification.innerHTML = content;

    // Click to dismiss
    notification.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        this.dismiss(notification);
      }
    });

    // Action button
    if (options.action) {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'btn btn--sm btn--primary';
      actionBtn.textContent = options.action.text;
      actionBtn.style.marginTop = '8px';
      actionBtn.onclick = (e) => {
        e.stopPropagation();
        options.action.handler();
        this.dismiss(notification);
      };
      notification.appendChild(actionBtn);
    }

    return notification;
  }

  dismiss(notification) {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(notification);
    }, UIConfig.animations.duration);
  }

  // Convenience methods
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', options);
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  // Special notification types for Spruce App
  appointmentReminder(appointment) {
    return this.info(
      `Appointment reminder: ${appointment.service}`,
      {
        subtitle: `${Utils.formatDate(appointment.date)} at ${appointment.time}`,
        action: {
          text: 'View Details',
          handler: () => window.location.href = `/appointment/${appointment.id}`
        }
      }
    );
  }

  techRunningLate(tech, eta) {
    return this.warning(
      `${tech.name} is running late`,
      {
        subtitle: `New ETA: ${eta}`,
        action: {
          text: 'Notify Customer',
          handler: () => this.notifyCustomer(tech.customerId, eta)
        }
      }
    );
  }

  paymentFailed(invoice) {
    return this.error(
      'Payment failed',
      {
        subtitle: `Invoice #${invoice.number} - ${Utils.formatCurrency(invoice.amount)}`,
        action: {
          text: 'Retry Payment',
          handler: () => window.location.href = `/payments/retry/${invoice.id}`
        }
      }
    );
  }

  contractExpiring(contract, daysLeft) {
    return this.warning(
      'Contract expiring soon',
      {
        subtitle: `${contract.customer} - ${daysLeft} days remaining`,
        action: {
          text: 'Renew Now',
          handler: () => window.location.href = `/contracts/renew/${contract.id}`
        }
      }
    );
  }

  negativeReview(review) {
    return this.error(
      'Negative review received',
      {
        subtitle: `${review.rating}/5 stars - Immediate attention needed`,
        action: {
          text: 'Service Recovery',
          handler: () => window.location.href = `/reviews/recovery/${review.id}`
        }
      }
    );
  }

  clearAll() {
    this.notifications.forEach(notification => {
      this.dismiss(notification);
    });
  }
}

// Global instance
export const notifications = new NotificationManager();