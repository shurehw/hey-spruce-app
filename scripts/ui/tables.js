// Enhanced Table Components
import { BadgeManager } from './badges.js';
import { Utils } from './config.js';

export class TableManager {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      sortable: true,
      filterable: true,
      pagination: true,
      pageSize: 10,
      ...options
    };
    this.data = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.sortColumn = null;
    this.sortDirection = 'asc';
    
    this.init();
  }

  init() {
    this.element.classList.add('enhanced-table-container');
    this.setupTable();
    
    if (this.options.filterable) {
      this.setupFilters();
    }
    
    if (this.options.pagination) {
      this.setupPagination();
    }
  }

  setupTable() {
    const table = this.element.querySelector('table') || document.createElement('table');
    table.classList.add('table', 'enhanced-table');
    
    if (!this.element.querySelector('table')) {
      this.element.appendChild(table);
    }
    
    this.table = table;
  }

  setupFilters() {
    const filterContainer = document.createElement('div');
    filterContainer.className = 'table-filters';
    filterContainer.style.cssText = `
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
    `;

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search...';
    searchInput.className = 'form-control';
    searchInput.style.cssText = 'max-width: 250px;';
    
    const debouncedSearch = Utils.debounce((value) => {
      this.filter(value);
    }, 300);
    
    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });

    filterContainer.appendChild(searchInput);
    this.element.insertBefore(filterContainer, this.table);
    
    this.searchInput = searchInput;
    this.filterContainer = filterContainer;
  }

  setupPagination() {
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'table-pagination';
    paginationContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      gap: 12px;
    `;

    this.element.appendChild(paginationContainer);
    this.paginationContainer = paginationContainer;
  }

  setData(data, columns) {
    this.data = data;
    this.columns = columns;
    this.filteredData = [...data];
    this.render();
  }

  render() {
    this.renderTable();
    
    if (this.options.pagination) {
      this.renderPagination();
    }
  }

  renderTable() {
    if (!this.columns || !this.filteredData) return;

    // Calculate paginated data
    const startIndex = (this.currentPage - 1) * this.options.pageSize;
    const endIndex = startIndex + this.options.pageSize;
    const pageData = this.options.pagination 
      ? this.filteredData.slice(startIndex, endIndex)
      : this.filteredData;

    // Build table HTML
    let html = '<thead><tr>';
    
    this.columns.forEach(column => {
      const sortIcon = this.sortColumn === column.key 
        ? (this.sortDirection === 'asc' ? ' ↑' : ' ↓')
        : '';
      
      html += `<th style="cursor: ${this.options.sortable ? 'pointer' : 'default'}" 
                   data-sort="${column.key}">${column.label}${sortIcon}</th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    pageData.forEach(row => {
      html += '<tr>';
      this.columns.forEach(column => {
        let value = this.getCellValue(row, column);
        html += `<td>${value}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody>';
    
    this.table.innerHTML = html;
    
    // Setup sort handlers
    if (this.options.sortable) {
      this.table.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          this.sort(th.dataset.sort);
        });
      });
    }
  }

  getCellValue(row, column) {
    let value = column.key.split('.').reduce((obj, key) => obj?.[key], row);
    
    if (column.render) {
      return column.render(value, row);
    }
    
    // Handle common data types
    if (column.type === 'currency') {
      return Utils.formatCurrency(value);
    } else if (column.type === 'date') {
      return Utils.formatDate(value);
    } else if (column.type === 'badge') {
      if (column.badgeType === 'status') {
        const badge = BadgeManager.status(value);
        return badge.outerHTML;
      } else if (column.badgeType === 'priority') {
        const badge = BadgeManager.priority(value);
        return badge.outerHTML;
      }
    }
    
    return value || '';
  }

  sort(columnKey) {
    if (this.sortColumn === columnKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = columnKey;
      this.sortDirection = 'asc';
    }
    
    this.filteredData.sort((a, b) => {
      let aVal = columnKey.split('.').reduce((obj, key) => obj?.[key], a);
      let bVal = columnKey.split('.').reduce((obj, key) => obj?.[key], b);
      
      // Handle different data types
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;
      
      return this.sortDirection === 'desc' ? -comparison : comparison;
    });
    
    this.currentPage = 1;
    this.render();
  }

  filter(searchTerm) {
    if (!searchTerm) {
      this.filteredData = [...this.data];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredData = this.data.filter(row => {
        return this.columns.some(column => {
          const value = column.key.split('.').reduce((obj, key) => obj?.[key], row);
          return value && value.toString().toLowerCase().includes(term);
        });
      });
    }
    
    this.currentPage = 1;
    this.render();
  }

  renderPagination() {
    if (!this.paginationContainer) return;
    
    const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
    const startItem = (this.currentPage - 1) * this.options.pageSize + 1;
    const endItem = Math.min(this.currentPage * this.options.pageSize, this.filteredData.length);
    
    // Info text
    const info = document.createElement('div');
    info.textContent = `Showing ${startItem}-${endItem} of ${this.filteredData.length} items`;
    info.style.cssText = 'color: var(--spruce-muted); font-size: 0.9rem;';
    
    // Navigation buttons
    const nav = document.createElement('div');
    nav.style.cssText = 'display: flex; gap: 8px; align-items: center;';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn--sm';
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = this.currentPage === 1;
    prevBtn.onclick = () => this.goToPage(this.currentPage - 1);
    
    // Page numbers
    const pageNumbers = document.createElement('div');
    pageNumbers.style.cssText = 'display: flex; gap: 4px;';
    
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `btn btn--sm ${i === this.currentPage ? 'btn--primary' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => this.goToPage(i);
        pageNumbers.appendChild(pageBtn);
      } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.style.cssText = 'padding: 0 4px; color: var(--spruce-muted);';
        pageNumbers.appendChild(dots);
      }
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn--sm';
    nextBtn.textContent = 'Next';
    nextBtn.disabled = this.currentPage === totalPages;
    nextBtn.onclick = () => this.goToPage(this.currentPage + 1);
    
    nav.appendChild(prevBtn);
    nav.appendChild(pageNumbers);
    nav.appendChild(nextBtn);
    
    this.paginationContainer.innerHTML = '';
    this.paginationContainer.appendChild(info);
    this.paginationContainer.appendChild(nav);
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      this.render();
    }
  }

  refresh(newData) {
    if (newData) {
      this.setData(newData, this.columns);
    } else {
      this.render();
    }
  }

  addColumn(column) {
    this.columns.push(column);
    this.render();
  }

  removeColumn(columnKey) {
    this.columns = this.columns.filter(col => col.key !== columnKey);
    this.render();
  }
}