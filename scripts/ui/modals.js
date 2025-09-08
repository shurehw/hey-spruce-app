// Modal/Dialog System
import { UIConfig } from './config.js';

export class ModalManager {
  constructor() {
    this.activeModals = new Set();
    this.setupKeyboardHandlers();
  }

  setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModals.size > 0) {
        const topModal = Array.from(this.activeModals).pop();
        this.close(topModal);
      }
    });
  }

  create(options = {}) {
    const modal = document.createElement('div');
    modal.className = 'dialog';
    modal.style.display = 'none';

    const card = document.createElement('div');
    card.className = 'dialog__card';

    // Header
    if (options.title) {
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #17221f;
      `;

      const title = document.createElement('h2');
      title.style.cssText = 'margin: 0; font-size: 1.25rem; font-weight: 600;';
      title.textContent = options.title;

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '×';
      closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: inherit;
        opacity: 0.6;
        padding: 0;
        line-height: 1;
      `;
      closeBtn.onclick = () => this.close(modal);

      header.appendChild(title);
      header.appendChild(closeBtn);
      card.appendChild(header);
    }

    // Content
    if (options.content) {
      const content = document.createElement('div');
      if (typeof options.content === 'string') {
        content.innerHTML = options.content;
      } else {
        content.appendChild(options.content);
      }
      card.appendChild(content);
    }

    // Actions
    if (options.actions) {
      const actions = document.createElement('div');
      actions.className = 'dialog__actions';

      options.actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = `btn ${action.primary ? 'btn--primary' : ''}`;
        btn.textContent = action.text;
        btn.onclick = () => {
          if (action.handler) {
            const result = action.handler();
            if (result !== false) {
              this.close(modal);
            }
          } else {
            this.close(modal);
          }
        };
        actions.appendChild(btn);
      });

      card.appendChild(actions);
    }

    modal.appendChild(card);

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal && !options.persistent) {
        this.close(modal);
      }
    });

    return modal;
  }

  show(modal) {
    document.body.appendChild(modal);
    this.activeModals.add(modal);
    
    // Add body class to prevent scrolling
    if (this.activeModals.size === 1) {
      document.body.style.overflow = 'hidden';
    }

    modal.style.display = 'flex';
    
    // Animate in
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      const card = modal.querySelector('.dialog__card');
      card.style.transform = 'scale(1)';
    });

    return modal;
  }

  close(modal) {
    if (!this.activeModals.has(modal)) return;

    modal.style.opacity = '0';
    const card = modal.querySelector('.dialog__card');
    card.style.transform = 'scale(0.95)';

    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
      this.activeModals.delete(modal);

      // Remove body class if no modals remain
      if (this.activeModals.size === 0) {
        document.body.style.overflow = '';
      }
    }, UIConfig.animations.duration);
  }

  // Convenience methods
  alert(title, message, buttonText = 'OK') {
    const modal = this.create({
      title,
      content: `<p>${message}</p>`,
      actions: [
        { text: buttonText, primary: true }
      ]
    });
    return this.show(modal);
  }

  confirm(title, message, options = {}) {
    return new Promise((resolve) => {
      const modal = this.create({
        title,
        content: `<p>${message}</p>`,
        actions: [
          { 
            text: options.cancelText || 'Cancel',
            handler: () => resolve(false)
          },
          { 
            text: options.confirmText || 'Confirm',
            primary: true,
            handler: () => resolve(true)
          }
        ],
        persistent: true
      });
      this.show(modal);
    });
  }

  prompt(title, message, defaultValue = '') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = defaultValue;
      input.className = 'form-control';
      input.style.cssText = 'width: 100%; padding: 8px 12px; margin-top: 8px;';

      const content = document.createElement('div');
      content.innerHTML = `<p>${message}</p>`;
      content.appendChild(input);

      const modal = this.create({
        title,
        content,
        actions: [
          { 
            text: 'Cancel',
            handler: () => resolve(null)
          },
          { 
            text: 'OK',
            primary: true,
            handler: () => resolve(input.value)
          }
        ],
        persistent: true
      });

      this.show(modal);

      // Focus input
      setTimeout(() => {
        input.focus();
        input.select();
      }, 100);

      // Enter to confirm
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          resolve(input.value);
          this.close(modal);
        }
      });
    });
  }

  // Spruce App specific modals
  workOrderDetails(workOrder) {
    const content = `
      <div class="grid cols-2" style="gap: 12px; margin-bottom: 16px;">
        <div><strong>Work Order #:</strong> ${workOrder.id}</div>
        <div><strong>Status:</strong> <span class="chip chip--${workOrder.status}">${workOrder.status}</span></div>
        <div><strong>Customer:</strong> ${workOrder.customer}</div>
        <div><strong>Property:</strong> ${workOrder.property}</div>
        <div><strong>Service:</strong> ${workOrder.service}</div>
        <div><strong>Priority:</strong> <span class="chip chip--${workOrder.priority}">${workOrder.priority}</span></div>
      </div>
      <div style="margin-bottom: 16px;">
        <strong>Description:</strong>
        <p style="margin-top: 4px;">${workOrder.description}</p>
      </div>
      ${workOrder.notes ? `
        <div>
          <strong>Notes:</strong>
          <p style="margin-top: 4px;">${workOrder.notes}</p>
        </div>
      ` : ''}
    `;

    const actions = [
      { text: 'Close' }
    ];

    if (workOrder.canEdit) {
      actions.unshift({ text: 'Edit', primary: true, handler: () => {
        window.location.href = `/work-orders/edit/${workOrder.id}`;
      }});
    }

    const modal = this.create({
      title: `Work Order Details`,
      content,
      actions
    });

    return this.show(modal);
  }

  assignTechnician(workOrderId, technicians) {
    const select = document.createElement('select');
    select.className = 'form-control';
    select.style.cssText = 'width: 100%; margin-top: 8px;';

    technicians.forEach(tech => {
      const option = document.createElement('option');
      option.value = tech.id;
      option.textContent = `${tech.name} - ${tech.rating}/5 ⭐`;
      select.appendChild(option);
    });

    const content = document.createElement('div');
    content.innerHTML = '<p>Select a technician to assign this work order:</p>';
    content.appendChild(select);

    return new Promise((resolve) => {
      const modal = this.create({
        title: 'Assign Technician',
        content,
        actions: [
          { text: 'Cancel', handler: () => resolve(null) },
          { 
            text: 'Assign',
            primary: true,
            handler: () => resolve(select.value)
          }
        ]
      });
      this.show(modal);
    });
  }
}

// Global instance
export const modals = new ModalManager();