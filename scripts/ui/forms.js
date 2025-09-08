// Enhanced Form Components
import { notifications } from './notifications.js';
import { Utils } from './config.js';

export class FormManager {
  constructor(form, options = {}) {
    this.form = typeof form === 'string' ? document.querySelector(form) : form;
    this.options = {
      autoValidate: true,
      showErrors: true,
      submitButton: null,
      ...options
    };
    this.validators = {};
    this.errors = {};
    
    this.init();
  }

  init() {
    if (!this.form) return;
    
    this.setupValidation();
    this.setupSubmitHandler();
    this.enhanceInputs();
  }

  setupValidation() {
    const inputs = this.form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      if (this.options.autoValidate) {
        input.addEventListener('blur', () => this.validateField(input));
        input.addEventListener('input', () => this.clearFieldError(input));
      }
    });
  }

  setupSubmitHandler() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      if (this.validate()) {
        this.onSubmit(this.getData());
      }
    });
  }

  enhanceInputs() {
    // Add loading states and other enhancements
    const submitBtn = this.form.querySelector('button[type="submit"]') || this.options.submitButton;
    if (submitBtn) {
      this.submitButton = submitBtn;
    }

    // Auto-format inputs
    this.form.querySelectorAll('input[data-format]').forEach(input => {
      this.setupFormatter(input);
    });

    // File upload enhancements
    this.form.querySelectorAll('input[type="file"]').forEach(input => {
      this.enhanceFileInput(input);
    });
  }

  setupFormatter(input) {
    const format = input.dataset.format;
    
    input.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      
      switch (format) {
        case 'phone':
          value = this.formatPhone(value);
          break;
        case 'currency':
          value = this.formatCurrency(value);
          break;
        case 'ssn':
          value = this.formatSSN(value);
          break;
      }
      
      e.target.value = value;
    });
  }

  formatPhone(value) {
    if (value.length <= 3) return value;
    if (value.length <= 6) return `(${value.slice(0, 3)}) ${value.slice(3)}`;
    return `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
  }

  formatCurrency(value) {
    if (!value) return '';
    const number = parseFloat(value) / 100;
    return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  formatSSN(value) {
    if (value.length <= 3) return value;
    if (value.length <= 5) return `${value.slice(0, 3)}-${value.slice(3)}`;
    return `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 9)}`;
  }

  enhanceFileInput(input) {
    const wrapper = document.createElement('div');
    wrapper.className = 'file-input-wrapper';
    wrapper.style.cssText = `
      position: relative;
      display: inline-block;
      width: 100%;
    `;

    const label = document.createElement('label');
    label.className = 'btn btn--ghost';
    label.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      width: 100%;
      justify-content: center;
      border: 2px dashed var(--spruce-brand);
      background: rgba(47, 191, 113, 0.05);
    `;
    label.innerHTML = '📎 Choose File(s)';

    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    fileInfo.style.cssText = `
      margin-top: 8px;
      font-size: 0.9rem;
      color: var(--spruce-muted);
    `;

    input.style.display = 'none';
    
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    wrapper.appendChild(label);
    wrapper.appendChild(fileInfo);

    input.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        fileInfo.innerHTML = files.map(f => 
          `<div>📄 ${f.name} (${this.formatFileSize(f.size)})</div>`
        ).join('');
      } else {
        fileInfo.innerHTML = '';
      }
    });
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  addValidator(fieldName, validator) {
    if (!this.validators[fieldName]) {
      this.validators[fieldName] = [];
    }
    this.validators[fieldName].push(validator);
    return this;
  }

  validateField(input) {
    const fieldName = input.name || input.id;
    const value = input.value;
    
    this.clearFieldError(input);
    
    // Built-in HTML5 validation
    if (!input.checkValidity()) {
      this.setFieldError(input, input.validationMessage);
      return false;
    }
    
    // Custom validators
    if (this.validators[fieldName]) {
      for (const validator of this.validators[fieldName]) {
        const result = validator(value, this.getData());
        if (result !== true) {
          this.setFieldError(input, result);
          return false;
        }
      }
    }
    
    return true;
  }

  validate() {
    const inputs = this.form.querySelectorAll('input, select, textarea');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });
    
    return isValid;
  }

  setFieldError(input, message) {
    this.errors[input.name || input.id] = message;
    
    if (this.options.showErrors) {
      input.style.borderColor = 'var(--danger)';
      
      let errorEl = input.parentNode.querySelector('.field-error');
      if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'field-error';
        errorEl.style.cssText = `
          color: var(--danger);
          font-size: 0.85rem;
          margin-top: 4px;
        `;
        input.parentNode.appendChild(errorEl);
      }
      
      errorEl.textContent = message;
    }
  }

  clearFieldError(input) {
    delete this.errors[input.name || input.id];
    
    input.style.borderColor = '';
    const errorEl = input.parentNode.querySelector('.field-error');
    if (errorEl) {
      errorEl.remove();
    }
  }

  getData() {
    const formData = new FormData(this.form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      if (data[key]) {
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    }
    
    return data;
  }

  setData(data) {
    Object.entries(data).forEach(([key, value]) => {
      const input = this.form.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = Boolean(value);
        } else if (input.type === 'radio') {
          const radio = this.form.querySelector(`[name="${key}"][value="${value}"]`);
          if (radio) radio.checked = true;
        } else {
          input.value = value;
        }
      }
    });
  }

  reset() {
    this.form.reset();
    this.errors = {};
    
    // Clear all error displays
    this.form.querySelectorAll('.field-error').forEach(el => el.remove());
    this.form.querySelectorAll('input, select, textarea').forEach(input => {
      input.style.borderColor = '';
    });
  }

  setLoading(loading = true) {
    if (this.submitButton) {
      if (loading) {
        this.submitButton.disabled = true;
        this.submitButton.innerHTML = `
          <div class="loading" style="margin-right: 8px;"></div>
          Processing...
        `;
      } else {
        this.submitButton.disabled = false;
        this.submitButton.innerHTML = this.submitButton.dataset.originalText || 'Submit';
      }
    }
  }

  onSubmit(data) {
    // Override this method
    console.log('Form submitted with data:', data);
  }

  // Common validators
  static validators = {
    required: (value) => value ? true : 'This field is required',
    
    email: (value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) || 'Please enter a valid email address';
    },
    
    phone: (value) => {
      if (!value) return true;
      const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
      return phoneRegex.test(value) || 'Please enter a valid phone number';
    },
    
    minLength: (min) => (value) => {
      return value.length >= min || `Must be at least ${min} characters`;
    },
    
    maxLength: (max) => (value) => {
      return value.length <= max || `Must be no more than ${max} characters`;
    },
    
    match: (fieldName) => (value, data) => {
      return value === data[fieldName] || 'Fields must match';
    },
    
    currency: (value) => {
      if (!value) return true;
      const amount = parseFloat(value.replace(/[$,]/g, ''));
      return !isNaN(amount) && amount >= 0 || 'Please enter a valid amount';
    }
  };
}

// Work Order Form
export class WorkOrderForm extends FormManager {
  constructor(form) {
    super(form);
    
    // Add work order specific validators
    this.addValidator('priority', FormManager.validators.required)
        .addValidator('service_type', FormManager.validators.required)
        .addValidator('description', FormManager.validators.required)
        .addValidator('description', FormManager.validators.minLength(10));
  }

  onSubmit(data) {
    this.setLoading(true);
    
    // Submit work order
    fetch('/api/work-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        notifications.success('Work order created successfully');
        this.reset();
      } else {
        notifications.error('Failed to create work order: ' + result.message);
      }
    })
    .catch(error => {
      notifications.error('An error occurred: ' + error.message);
    })
    .finally(() => {
      this.setLoading(false);
    });
  }
}