// Lightweight UI Components for Spruce App
// Integrates with existing portals without breaking functionality

// Toast Notifications
class ToastManager {
    constructor() {
        this.container = this.createContainer();
    }

    createContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const colors = {
            success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
        };

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.style.cssText = `
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            margin-bottom: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            border-left: 4px solid;
            border-image: ${colors[type]} 1;
        `;

        toast.innerHTML = `
            <span style="font-size: 20px;">${icons[type]}</span>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: #1f2937;">${message}</div>
            </div>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                font-size: 20px;
                color: #6b7280;
                cursor: pointer;
                padding: 0;
            ">×</button>
        `;

        this.container.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => {
                toast.style.transform = 'translateX(400px)';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    }

    success(message) { return this.show(message, 'success'); }
    error(message) { return this.show(message, 'error'); }
    warning(message) { return this.show(message, 'warning'); }
    info(message) { return this.show(message, 'info'); }
}

// Enhanced Table Functions
class TableEnhancer {
    constructor(table) {
        this.table = table;
        this.tbody = table.querySelector('tbody');
        this.headers = Array.from(table.querySelectorAll('th'));
        this.originalData = [];
        this.filteredData = [];
        this.sortColumn = -1;
        this.sortDirection = 'asc';
        
        this.init();
    }

    init() {
        // Store original data
        this.storeData();
        
        // Add search box
        this.addSearchBox();
        
        // Make headers clickable for sorting
        this.headers.forEach((header, index) => {
            if (!header.classList.contains('no-sort')) {
                header.style.cursor = 'pointer';
                header.style.userSelect = 'none';
                
                header.addEventListener('click', () => this.sort(index));
                
                // Add sort indicator
                const indicator = document.createElement('span');
                indicator.className = 'sort-indicator';
                indicator.style.cssText = 'margin-left: 5px; opacity: 0.5;';
                indicator.textContent = '↕';
                header.appendChild(indicator);
            }
        });
    }

    storeData() {
        const rows = Array.from(this.tbody.querySelectorAll('tr'));
        this.originalData = rows.map(row => ({
            element: row,
            cells: Array.from(row.querySelectorAll('td')).map(td => ({
                text: td.textContent.trim(),
                html: td.innerHTML
            }))
        }));
        this.filteredData = [...this.originalData];
    }

    addSearchBox() {
        const searchContainer = document.createElement('div');
        searchContainer.style.cssText = 'margin-bottom: 15px;';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '🔍 Search table...';
        searchInput.style.cssText = `
            padding: 10px 15px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            width: 300px;
            font-size: 14px;
        `;
        
        searchInput.addEventListener('input', (e) => this.filter(e.target.value));
        
        searchContainer.appendChild(searchInput);
        this.table.parentNode.insertBefore(searchContainer, this.table);
    }

    filter(searchTerm) {
        const term = searchTerm.toLowerCase();
        
        if (!term) {
            this.filteredData = [...this.originalData];
        } else {
            this.filteredData = this.originalData.filter(row => 
                row.cells.some(cell => cell.text.toLowerCase().includes(term))
            );
        }
        
        this.render();
    }

    sort(columnIndex) {
        if (this.sortColumn === columnIndex) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnIndex;
            this.sortDirection = 'asc';
        }

        // Update sort indicators
        this.headers.forEach((header, index) => {
            const indicator = header.querySelector('.sort-indicator');
            if (indicator) {
                if (index === columnIndex) {
                    indicator.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
                    indicator.style.opacity = '1';
                } else {
                    indicator.textContent = '↕';
                    indicator.style.opacity = '0.5';
                }
            }
        });

        this.filteredData.sort((a, b) => {
            const aVal = a.cells[columnIndex].text;
            const bVal = b.cells[columnIndex].text;
            
            // Try to parse as number
            const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
            const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));
            
            let comparison = 0;
            if (!isNaN(aNum) && !isNaN(bNum)) {
                comparison = aNum - bNum;
            } else {
                comparison = aVal.localeCompare(bVal);
            }
            
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });

        this.render();
    }

    render() {
        this.tbody.innerHTML = '';
        this.filteredData.forEach(row => {
            this.tbody.appendChild(row.element.cloneNode(true));
        });
    }
}

// Form Validation
class FormValidator {
    constructor(form) {
        this.form = form;
        this.validators = {};
        this.init();
    }

    init() {
        // Add validation on submit
        this.form.addEventListener('submit', (e) => {
            if (!this.validateAll()) {
                e.preventDefault();
                toast.error('Please fix the errors in the form');
            }
        });

        // Add real-time validation
        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearError(input));
        });
    }

    addValidator(fieldName, validator, message) {
        if (!this.validators[fieldName]) {
            this.validators[fieldName] = [];
        }
        this.validators[fieldName].push({ validator, message });
    }

    validateField(input) {
        const fieldName = input.name || input.id;
        
        // Clear previous error
        this.clearError(input);
        
        // HTML5 validation
        if (!input.checkValidity()) {
            this.showError(input, input.validationMessage);
            return false;
        }
        
        // Custom validators
        if (this.validators[fieldName]) {
            for (const { validator, message } of this.validators[fieldName]) {
                if (!validator(input.value, input)) {
                    this.showError(input, message);
                    return false;
                }
            }
        }
        
        return true;
    }

    validateAll() {
        const inputs = this.form.querySelectorAll('input, select, textarea');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    showError(input, message) {
        input.style.borderColor = '#ef4444';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.cssText = `
            color: #ef4444;
            font-size: 12px;
            margin-top: 4px;
        `;
        errorDiv.textContent = message;
        
        input.parentNode.appendChild(errorDiv);
    }

    clearError(input) {
        input.style.borderColor = '';
        const error = input.parentNode.querySelector('.field-error');
        if (error) error.remove();
    }
}

// Simple Chart Builder (connects to real data)
class ChartBuilder {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupCanvas();
    }

    setupCanvas() {
        // Make canvas responsive
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    async drawFromSupabase(query, type = 'bar') {
        try {
            // Execute Supabase query
            const { data, error } = await query;
            if (error) throw error;
            
            // Draw chart based on type
            if (type === 'bar') {
                this.drawBarChart(data);
            } else if (type === 'pie') {
                this.drawPieChart(data);
            } else if (type === 'line') {
                this.drawLineChart(data);
            }
        } catch (error) {
            console.error('Chart error:', error);
            this.showError();
        }
    }

    drawBarChart(data) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = 40;
        const barWidth = (width - padding * 2) / data.length;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);
        
        // Find max value
        const maxValue = Math.max(...data.map(d => d.value || 0));
        
        // Draw bars
        data.forEach((item, index) => {
            const barHeight = ((item.value || 0) / maxValue) * (height - padding * 2);
            const x = padding + index * barWidth + barWidth * 0.1;
            const y = height - padding - barHeight;
            
            // Draw bar
            this.ctx.fillStyle = '#10b981';
            this.ctx.fillRect(x, y, barWidth * 0.8, barHeight);
            
            // Draw label
            this.ctx.fillStyle = '#1f2937';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(item.label || '', x + barWidth * 0.4, height - 10);
            
            // Draw value
            this.ctx.fillText(item.value || 0, x + barWidth * 0.4, y - 5);
        });
    }

    drawPieChart(data) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        
        const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
        let currentAngle = -Math.PI / 2;
        
        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
        
        data.forEach((item, index) => {
            const sliceAngle = ((item.value || 0) / total) * Math.PI * 2;
            
            // Draw slice
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            this.ctx.closePath();
            this.ctx.fillStyle = colors[index % colors.length];
            this.ctx.fill();
            
            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${Math.round((item.value / total) * 100)}%`, labelX, labelY);
            
            currentAngle += sliceAngle;
        });
    }

    showError() {
        this.ctx.fillStyle = '#ef4444';
        this.ctx.font = '14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Unable to load chart data', this.canvas.width / 2, this.canvas.height / 2);
    }
}

// Initialize globally
const toast = new ToastManager();

// Auto-enhance existing tables
document.addEventListener('DOMContentLoaded', () => {
    // Enhance all tables with class 'data-table'
    document.querySelectorAll('table.data-table').forEach(table => {
        new TableEnhancer(table);
    });
    
    // Add validation to all forms with class 'validated-form'
    document.querySelectorAll('form.validated-form').forEach(form => {
        new FormValidator(form);
    });
});

// Export for use in other scripts
window.SpruceUI = {
    toast,
    TableEnhancer,
    FormValidator,
    ChartBuilder
};