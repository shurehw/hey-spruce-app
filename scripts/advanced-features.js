// Advanced Features for Hey Spruce Portals
(function() {
    'use strict';

    // Global Search Component
    class GlobalSearch {
        constructor(container) {
            this.container = container;
            this.searchData = [];
            this.init();
        }

        init() {
            this.render();
            this.attachEventListeners();
            this.loadSearchData();
        }

        render() {
            const searchHTML = `
                <div class="global-search-container">
                    <div class="global-search-input-wrapper">
                        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input type="text" 
                               id="globalSearchInput" 
                               class="global-search-input" 
                               placeholder="Search everything... (Ctrl+K)">
                        <kbd class="search-shortcut">Ctrl+K</kbd>
                    </div>
                    <div id="globalSearchResults" class="global-search-results" style="display: none;"></div>
                </div>
            `;
            this.container.innerHTML = searchHTML;
        }

        attachEventListeners() {
            const input = document.getElementById('globalSearchInput');
            const results = document.getElementById('globalSearchResults');

            // Input event
            input.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });

            // Keyboard shortcut
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    input.focus();
                }
            });

            // Click outside to close
            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target)) {
                    results.style.display = 'none';
                }
            });

            // ESC to close
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    input.value = '';
                    results.style.display = 'none';
                    input.blur();
                }
            });
        }

        async loadSearchData() {
            // Load data based on portal type
            const portalType = this.detectPortalType();
            
            try {
                if (window.supabase && window.currentUser) {
                    await this.loadSupabaseData(portalType);
                }
            } catch (error) {
                console.error('Error loading search data:', error);
            }
        }

        detectPortalType() {
            const path = window.location.pathname;
            if (path.includes('client')) return 'client';
            if (path.includes('supplier')) return 'supplier';
            if (path.includes('subcontractor')) return 'subcontractor';
            return 'unknown';
        }

        async loadSupabaseData(portalType) {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) return;

            switch(portalType) {
                case 'client':
                    await this.loadClientData(user.id);
                    break;
                case 'supplier':
                    await this.loadSupplierData(user.id);
                    break;
                case 'subcontractor':
                    await this.loadSubcontractorData(user.id);
                    break;
            }
        }

        async loadClientData(userId) {
            // Load work orders
            const { data: workOrders } = await window.supabase
                .from('work_orders')
                .select('*')
                .eq('client_id', userId);
            
            if (workOrders) {
                workOrders.forEach(order => {
                    this.searchData.push({
                        type: 'Work Order',
                        title: `WO #${order.id.substring(0, 8)}`,
                        description: order.description || order.service_type,
                        url: `#work-orders`,
                        icon: '🔧'
                    });
                });
            }

            // Load properties
            const { data: properties } = await window.supabase
                .from('properties')
                .select('*')
                .eq('owner_id', userId);
            
            if (properties) {
                properties.forEach(property => {
                    this.searchData.push({
                        type: 'Property',
                        title: property.name || property.address,
                        description: property.address,
                        url: `#properties`,
                        icon: '🏠'
                    });
                });
            }
        }

        async loadSupplierData(userId) {
            // Load products
            const { data: products } = await window.supabase
                .from('products')
                .select('*')
                .eq('supplier_id', userId);
            
            if (products) {
                products.forEach(product => {
                    this.searchData.push({
                        type: 'Product',
                        title: product.name,
                        description: `$${product.price} - ${product.category}`,
                        url: `#products`,
                        icon: '📦'
                    });
                });
            }

            // Load orders
            const { data: orders } = await window.supabase
                .from('orders')
                .select('*')
                .eq('supplier_id', userId);
            
            if (orders) {
                orders.forEach(order => {
                    this.searchData.push({
                        type: 'Order',
                        title: `Order #${order.id.substring(0, 8)}`,
                        description: `$${order.total} - ${order.status}`,
                        url: `#orders`,
                        icon: '📋'
                    });
                });
            }
        }

        async loadSubcontractorData(userId) {
            // Load assigned jobs
            const { data: jobs } = await window.supabase
                .from('work_orders')
                .select('*')
                .eq('assigned_to', userId);
            
            if (jobs) {
                jobs.forEach(job => {
                    this.searchData.push({
                        type: 'Job',
                        title: `Job #${job.id.substring(0, 8)}`,
                        description: job.service_type,
                        url: `#jobs`,
                        icon: '👷'
                    });
                });
            }
        }

        handleSearch(query) {
            const results = document.getElementById('globalSearchResults');
            
            if (!query || query.length < 2) {
                results.style.display = 'none';
                return;
            }

            const filteredData = this.searchData.filter(item => {
                const searchStr = `${item.title} ${item.description} ${item.type}`.toLowerCase();
                return searchStr.includes(query.toLowerCase());
            });

            this.displayResults(filteredData.slice(0, 10));
        }

        displayResults(results) {
            const resultsContainer = document.getElementById('globalSearchResults');
            
            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
            } else {
                resultsContainer.innerHTML = results.map(item => `
                    <div class="search-result-item" onclick="navigateToSection('${item.url}')">
                        <span class="result-icon">${item.icon}</span>
                        <div class="result-content">
                            <div class="result-title">${item.title}</div>
                            <div class="result-meta">
                                <span class="result-type">${item.type}</span>
                                <span class="result-description">${item.description}</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
            
            resultsContainer.style.display = 'block';
        }
    }

    // Breadcrumb Component
    class Breadcrumb {
        constructor(container) {
            this.container = container;
            this.init();
        }

        init() {
            this.render();
            this.updateBreadcrumb();
            this.observeNavigation();
        }

        render() {
            const breadcrumbHTML = `
                <nav class="breadcrumb-nav" aria-label="Breadcrumb">
                    <ol id="breadcrumbList" class="breadcrumb-list">
                        <li class="breadcrumb-item">
                            <a href="#dashboard" class="breadcrumb-link">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                    <polyline points="9 22 9 12 15 12 15 22"/>
                                </svg>
                                <span>Home</span>
                            </a>
                        </li>
                    </ol>
                </nav>
            `;
            this.container.innerHTML = breadcrumbHTML;
        }

        updateBreadcrumb() {
            const hash = window.location.hash.substring(1) || 'dashboard';
            const section = this.getSectionName(hash);
            const list = document.getElementById('breadcrumbList');
            
            // Clear existing breadcrumbs except home
            while (list.children.length > 1) {
                list.removeChild(list.lastChild);
            }
            
            if (section !== 'Dashboard') {
                const separator = document.createElement('li');
                separator.className = 'breadcrumb-separator';
                separator.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"/></svg>';
                list.appendChild(separator);
                
                const item = document.createElement('li');
                item.className = 'breadcrumb-item active';
                item.innerHTML = `<span class="breadcrumb-current">${section}</span>`;
                list.appendChild(item);
            }
        }

        getSectionName(hash) {
            const sections = {
                'dashboard': 'Dashboard',
                'work-orders': 'Work Orders',
                'properties': 'Properties',
                'invoices': 'Invoices',
                'products': 'Products',
                'orders': 'Orders',
                'inventory': 'Inventory',
                'jobs': 'Jobs',
                'schedule': 'Schedule',
                'timesheets': 'Timesheets',
                'reports': 'Reports',
                'settings': 'Settings'
            };
            return sections[hash] || hash.charAt(0).toUpperCase() + hash.slice(1).replace(/-/g, ' ');
        }

        observeNavigation() {
            // Listen for hash changes
            window.addEventListener('hashchange', () => {
                this.updateBreadcrumb();
            });

            // Listen for navigation clicks
            document.addEventListener('click', (e) => {
                if (e.target.closest('.nav-link')) {
                    setTimeout(() => this.updateBreadcrumb(), 100);
                }
            });
        }
    }

    // Helper function for navigation
    window.navigateToSection = function(url) {
        if (url.startsWith('#')) {
            window.location.hash = url.substring(1);
            const section = url.substring(1);
            
            // Hide search results
            const searchResults = document.getElementById('globalSearchResults');
            if (searchResults) searchResults.style.display = 'none';
            
            // Clear search input
            const searchInput = document.getElementById('globalSearchInput');
            if (searchInput) searchInput.value = '';
            
            // Show the section
            document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
            const targetSection = document.getElementById(section);
            if (targetSection) targetSection.style.display = 'block';
            
            // Update navigation active state
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === url) {
                    link.classList.add('active');
                }
            });
        }
    };

    // Initialize advanced features
    window.AdvancedFeatures = {
        GlobalSearch,
        Breadcrumb,
        
        init: function() {
            // Add CSS styles
            this.injectStyles();
            
            // Initialize components when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initComponents());
            } else {
                this.initComponents();
            }
        },
        
        initComponents: function() {
            // Initialize global search
            const searchContainer = document.getElementById('globalSearchContainer');
            if (searchContainer) {
                new GlobalSearch(searchContainer);
            }
            
            // Initialize breadcrumb
            const breadcrumbContainer = document.getElementById('breadcrumbContainer');
            if (breadcrumbContainer) {
                new Breadcrumb(breadcrumbContainer);
            }
        },
        
        injectStyles: function() {
            if (document.getElementById('advanced-features-styles')) return;
            
            const styles = `
                /* Global Search Styles */
                .global-search-container {
                    position: relative;
                    max-width: 600px;
                    margin: 0 auto;
                }
                
                .global-search-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                
                .search-icon {
                    position: absolute;
                    left: 12px;
                    color: var(--gray-400);
                    pointer-events: none;
                }
                
                .global-search-input {
                    width: 100%;
                    padding: 10px 100px 10px 40px;
                    border: 1px solid var(--gray-300);
                    border-radius: 8px;
                    font-size: 14px;
                    background: white;
                    transition: all 0.2s;
                }
                
                .global-search-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }
                
                .search-shortcut {
                    position: absolute;
                    right: 12px;
                    padding: 4px 8px;
                    background: var(--gray-100);
                    border: 1px solid var(--gray-300);
                    border-radius: 4px;
                    font-size: 12px;
                    color: var(--gray-600);
                }
                
                .global-search-results {
                    position: absolute;
                    top: calc(100% + 8px);
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid var(--gray-200);
                    border-radius: 8px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                    max-height: 400px;
                    overflow-y: auto;
                    z-index: 1000;
                }
                
                .search-result-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    cursor: pointer;
                    transition: background 0.2s;
                    border-bottom: 1px solid var(--gray-100);
                }
                
                .search-result-item:last-child {
                    border-bottom: none;
                }
                
                .search-result-item:hover {
                    background: var(--gray-50);
                }
                
                .result-icon {
                    font-size: 20px;
                    flex-shrink: 0;
                }
                
                .result-content {
                    flex: 1;
                    min-width: 0;
                }
                
                .result-title {
                    font-weight: 600;
                    color: var(--gray-900);
                    margin-bottom: 2px;
                }
                
                .result-meta {
                    display: flex;
                    gap: 8px;
                    font-size: 12px;
                    color: var(--gray-500);
                }
                
                .result-type {
                    padding: 2px 6px;
                    background: var(--gray-100);
                    border-radius: 3px;
                }
                
                .no-results {
                    padding: 20px;
                    text-align: center;
                    color: var(--gray-500);
                }
                
                /* Breadcrumb Styles */
                .breadcrumb-nav {
                    padding: 12px 0;
                    border-bottom: 1px solid var(--gray-200);
                    margin-bottom: 20px;
                }
                
                .breadcrumb-list {
                    display: flex;
                    align-items: center;
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    font-size: 14px;
                }
                
                .breadcrumb-item {
                    display: flex;
                    align-items: center;
                }
                
                .breadcrumb-link {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: var(--gray-600);
                    text-decoration: none;
                    transition: color 0.2s;
                }
                
                .breadcrumb-link:hover {
                    color: var(--primary);
                }
                
                .breadcrumb-separator {
                    margin: 0 8px;
                    color: var(--gray-400);
                }
                
                .breadcrumb-current {
                    color: var(--gray-900);
                    font-weight: 500;
                }
            `;
            
            const styleSheet = document.createElement('style');
            styleSheet.id = 'advanced-features-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
    };
    
    // Auto-initialize
    window.AdvancedFeatures.init();
})();