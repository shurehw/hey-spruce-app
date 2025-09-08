// Badge/Chip Components
import { UIConfig } from './config.js';

export class BadgeManager {
  static create(text, type = 'default', options = {}) {
    const badge = document.createElement('span');
    badge.className = `chip chip--${type}`;
    badge.textContent = text;

    // Add icon if specified
    if (options.icon) {
      const icon = document.createElement('span');
      icon.innerHTML = options.icon;
      badge.prepend(icon);
    }

    // Add click handler if specified
    if (options.onClick) {
      badge.style.cursor = 'pointer';
      badge.addEventListener('click', options.onClick);
    }

    return badge;
  }

  // Priority badges
  static priority(level) {
    const priorities = {
      low: { text: 'Low Priority', type: 'low' },
      standard: { text: 'Standard', type: 'standard' },
      urgent: { text: 'Urgent', type: 'urgent' },
      emergency: { text: 'Emergency', type: 'emergency' }
    };

    const config = priorities[level] || priorities.standard;
    return this.create(config.text, config.type);
  }

  // Status badges
  static status(status) {
    const statuses = {
      pending: { text: 'Pending', type: 'pending' },
      assigned: { text: 'Assigned', type: 'assigned' },
      'in-progress': { text: 'In Progress', type: 'in-progress' },
      completed: { text: 'Completed', type: 'completed' },
      cancelled: { text: 'Cancelled', type: 'pending' }
    };

    const config = statuses[status] || statuses.pending;
    return this.create(config.text, config.type);
  }

  // Work order status with icons
  static workOrderStatus(status) {
    const icons = {
      pending: '⏳',
      assigned: '👤',
      'in-progress': '🔧',
      completed: '✅',
      cancelled: '❌'
    };

    return this.status(status, {
      icon: icons[status]
    });
  }

  // Payment status
  static paymentStatus(status) {
    const statuses = {
      paid: { text: 'Paid', type: 'ok' },
      pending: { text: 'Pending', type: 'std' },
      overdue: { text: 'Overdue', type: 'urg' },
      failed: { text: 'Failed', type: 'emg' }
    };

    const config = statuses[status] || statuses.pending;
    return this.create(config.text, config.type);
  }

  // SLA status
  static slaStatus(hoursRemaining) {
    if (hoursRemaining > 24) {
      return this.create('On Track', 'ok');
    } else if (hoursRemaining > 4) {
      return this.create('At Risk', 'risk');
    } else if (hoursRemaining > 0) {
      return this.create('Critical', 'urg');
    } else {
      return this.create('Breach', 'breach');
    }
  }

  // Customer tier
  static customerTier(tier) {
    const tiers = {
      premium: { text: 'Premium', type: 'ok' },
      standard: { text: 'Standard', type: 'std' },
      basic: { text: 'Basic', type: 'low' }
    };

    const config = tiers[tier] || tiers.standard;
    return this.create(config.text, config.type);
  }

  // Contract status
  static contractStatus(daysUntilExpiry) {
    if (daysUntilExpiry > 90) {
      return this.create('Active', 'ok');
    } else if (daysUntilExpiry > 30) {
      return this.create(`${daysUntilExpiry} days left`, 'risk');
    } else if (daysUntilExpiry > 0) {
      return this.create(`${daysUntilExpiry} days left`, 'urg');
    } else {
      return this.create('Expired', 'breach');
    }
  }

  // Notification priority
  static notificationPriority(priority) {
    const priorities = {
      1: { text: 'Critical', type: 'emg' },
      2: { text: 'High', type: 'urg' },
      3: { text: 'Medium', type: 'std' },
      4: { text: 'Low', type: 'low' }
    };

    const config = priorities[priority] || priorities[3];
    return this.create(config.text, config.type);
  }
}