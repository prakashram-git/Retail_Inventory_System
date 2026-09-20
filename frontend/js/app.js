// SwiftStock Main Application
class SwiftStock {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.currentPage = 'dashboard';
        this.theme = localStorage.getItem('theme') || 'dark';
        this.apiBase = '/api';
        this.init();
    }

    async init() {
        this.setupTheme();
        this.setupEventListeners();

        if (!this.token) {
            this.showLoginModal();
        } else {
            await this.loadSettings();
            this.showPage('dashboard');
        }
    }

    setupTheme() {
        if (this.theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const icon = document.getElementById('themeToggle').querySelector('i');
        if (this.theme === 'light') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('#logoutBtn')) {
                    this.logout();
                    return;
                }
                const page = item.getAttribute('data-page');
                if (page) {
                    this.showPage(page);
                }
            });
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Auth forms
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('switchToRegister').addEventListener('click', () => this.switchToRegister());
        document.getElementById('switchToLogin').addEventListener('click', () => this.switchToLogin());
    }

    showPage(page) {
        this.currentPage = page;

        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === page) {
                item.classList.add('active');
            }
        });

        // Load page content
        this.loadPageContent(page);
    }

    loadPageContent(page) {
        const content = document.getElementById('pageContent');

        switch(page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'inventory':
                this.loadInventory();
                break;
            case 'pos':
                this.loadPOS();
                break;
            case 'procurement':
                this.loadProcurement();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'setup':
                this.loadSetup();
                break;
            case 'about':
                this.loadAbout();
                break;
        }
    }

    async loadDashboard() {
        document.getElementById('pageTitle').textContent = 'Dashboard';
        document.getElementById('pageSubtitle').textContent = 'Inventory Overview';

        const content = document.getElementById('pageContent');
        content.innerHTML = '<div class="flex justify-center items-center h-64"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';

        try {
            const response = await this.apiFetch(`${this.apiBase}/reports/inventory-summary`);
            const summary = response;

            content.innerHTML = `
                <div class="grid grid-cols-4 gap-4 mb-8">
                    <div class="card p-6 rounded-lg">
                        <p class="text-gray-400 text-sm font-semibold">Total Products</p>
                        <p class="text-3xl font-bold mt-2">${summary.total_products}</p>
                    </div>
                    <div class="card p-6 rounded-lg">
                        <p class="text-gray-400 text-sm font-semibold">Total Items</p>
                        <p class="text-3xl font-bold mt-2">${summary.total_items}</p>
                    </div>
                    <div class="card p-6 rounded-lg">
                        <p class="text-gray-400 text-sm font-semibold">Inventory Value</p>
                        <p class="text-3xl font-bold mt-2">$${summary.total_inventory_value.toFixed(2)}</p>
                    </div>
                    <div class="card p-6 rounded-lg">
                        <p class="text-gray-400 text-sm font-semibold">Alert Items</p>
                        <p class="text-3xl font-bold mt-2 text-orange-500">${summary.low_stock_count + summary.out_of_stock_count}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="card p-6 rounded-lg">
                        <h3 class="text-lg font-semibold mb-4">Stock Status</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span>In Stock</span>
                                <span class="font-bold text-green-500">${summary.total_products - summary.low_stock_count - summary.out_of_stock_count}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Low Stock</span>
                                <span class="font-bold text-orange-500">${summary.low_stock_count}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Out of Stock</span>
                                <span class="font-bold text-red-500">${summary.out_of_stock_count}</span>
                            </div>
                        </div>
                    </div>

                    <div class="card p-6 rounded-lg">
                        <h3 class="text-lg font-semibold mb-4">Quick Actions</h3>
                        <button onclick="app.showPage('inventory')" class="btn-primary w-full p-2 rounded-lg mb-2 font-semibold">Manage Inventory</button>
                        <button onclick="app.showPage('pos')" class="btn-primary w-full p-2 rounded-lg font-semibold">Add Stock</button>
                    </div>
                </div>
            `;
        } catch(error) {
            content.innerHTML = `<div class="text-red-500">Error loading dashboard: ${error.message}</div>`;
        }
    }

    async loadInventory() {
        document.getElementById('pageTitle').textContent = 'Inventory Management';
        document.getElementById('pageSubtitle').textContent = 'Manage product stock';

        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="mb-6 flex justify-between items-center">
                <div class="flex gap-2">
                    <input type="text" id="searchInput" class="input-field p-2 rounded-lg" placeholder="Search products...">
                    <select id="categoryFilter" class="input-field p-2 rounded-lg">
                        <option value="">All Categories</option>
                    </select>
                </div>
                <button id="addProductBtn" class="btn-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                    <i class="fas fa-plus"></i> Add Product
                </button>
            </div>
            <div id="productsTable"></div>
        `;

        await this.loadProductsList();

        document.getElementById('addProductBtn').addEventListener('click', () => this.showAddProductModal());
        document.getElementById('searchInput').addEventListener('input', () => this.loadProductsList());
        document.getElementById('categoryFilter').addEventListener('change', () => this.loadProductsList());
    }

    async loadProductsList() {
        try {
            const products = await this.apiFetch(`${this.apiBase}/inventory/products`);
            const categories = await this.apiFetch(`${this.apiBase}/inventory/categories`);

            // Update category filter
            const categoryFilter = document.getElementById('categoryFilter');
            const currentValue = categoryFilter.value;
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            categories.forEach(cat => {
                categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
            });
            categoryFilter.value = currentValue;

            // Filter products
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const selectedCategory = document.getElementById('categoryFilter').value;

            let filtered = products.filter(p =>
                (p.name.toLowerCase().includes(searchTerm) || p.sku.toLowerCase().includes(searchTerm)) &&
                (!selectedCategory || p.category === selectedCategory)
            );

            const tableHtml = `
                <div class="card rounded-lg overflow-hidden">
                    <table class="w-full">
                        <thead class="table-head">
                            <tr>
                                <th class="p-4 text-left">SKU</th>
                                <th class="p-4 text-left">Product Name</th>
                                <th class="p-4 text-left">Category</th>
                                <th class="p-4 text-center">In Stock</th>
                                <th class="p-4 text-center">Unit Price</th>
                                <th class="p-4 text-center">Status</th>
                                <th class="p-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.length > 0 ? filtered.map(product => `
                                <tr>
                                    <td class="p-4">${product.sku}</td>
                                    <td class="p-4">${product.name}</td>
                                    <td class="p-4">${product.category}</td>
                                    <td class="p-4 text-center font-semibold">${product.quantity_in_stock}</td>
                                    <td class="p-4 text-center">$${product.unit_price.toFixed(2)}</td>
                                    <td class="p-4 text-center">
                                        <span class="status-badge status-${product.status.replace('_', '-')}">${product.status.replace('_', ' ').toUpperCase()}</span>
                                    </td>
                                    <td class="p-4 text-center">
                                        <button onclick="app.showAdjustStockModal(${product.id}, '${product.name}')" class="text-blue-500 hover:underline">
                                            <i class="fas fa-plus-circle"></i> Add Stock
                                        </button>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="7" class="p-4 text-center text-gray-400">No products found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;

            document.getElementById('productsTable').innerHTML = tableHtml;
        } catch(error) {
            document.getElementById('productsTable').innerHTML = `<div class="text-red-500">Error: ${error.message}</div>`;
        }
    }

    showAddProductModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="card p-8 rounded-lg w-96 shadow-xl">
                <h2 class="text-2xl font-bold mb-4">Add New Product</h2>
                <form id="addProductForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold mb-2">SKU *</label>
                        <input type="text" id="formSKU" class="input-field w-full p-2 rounded-lg" required>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-2">Product Name *</label>
                        <input type="text" id="formName" class="input-field w-full p-2 rounded-lg" required>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-2">Category *</label>
                        <input type="text" id="formCategory" class="input-field w-full p-2 rounded-lg" required>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-2">Cost Price *</label>
                        <input type="number" id="formCostPrice" class="input-field w-full p-2 rounded-lg" step="0.01" required>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-2">Unit Price *</label>
                        <input type="number" id="formUnitPrice" class="input-field w-full p-2 rounded-lg" step="0.01" required>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-2">Initial Quantity</label>
                        <input type="number" id="formQuantity" class="input-field w-full p-2 rounded-lg" value="0" step="1">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-2">Reorder Level</label>
                        <input type="number" id="formReorderLevel" class="input-field w-full p-2 rounded-lg" value="10" step="1">
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="btn-primary flex-1 p-2 rounded-lg font-semibold">Save Product</button>
                        <button type="button" class="btn-secondary flex-1 p-2 rounded-lg font-semibold bg-gray-700 text-white" onclick="this.closest('div').parentElement.remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('addProductForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await this.apiFetch(`${this.apiBase}/inventory/products`, 'POST', {
                    sku: document.getElementById('formSKU').value,
                    name: document.getElementById('formName').value,
                    category: document.getElementById('formCategory').value,
                    cost_price: parseFloat(document.getElementById('formCostPrice').value),
                    unit_price: parseFloat(document.getElementById('formUnitPrice').value),
                    quantity_in_stock: parseInt(document.getElementById('formQuantity').value),
                    reorder_level: parseInt(document.getElementById('formReorderLevel').value)
                });
                this.showToast('Product added successfully');
                modal.remove();
                this.loadProductsList();
            } catch(error) {
                alert('Error: ' + error.message);
            }
        });
    }

    showAdjustStockModal(productId, productName) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="card p-8 rounded-lg w-96 shadow-xl">
                <h2 class="text-2xl font-bold mb-2">Add Stock</h2>
                <p class="text-gray-400 mb-4">${productName}</p>
                <form id="adjustStockForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold mb-2">Quantity to Add *</label>
                        <input type="number" id="formAddQuantity" class="input-field w-full p-2 rounded-lg" value="1" step="1" required>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-2">Notes</label>
                        <textarea id="formNotes" class="input-field w-full p-2 rounded-lg" rows="3" placeholder="Optional notes..."></textarea>
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="btn-primary flex-1 p-2 rounded-lg font-semibold">Add Stock</button>
                        <button type="button" class="btn-secondary flex-1 p-2 rounded-lg font-semibold bg-gray-700 text-white" onclick="this.closest('div').parentElement.remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('adjustStockForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await this.apiFetch(`${this.apiBase}/inventory/products/${productId}/add-stock`, 'POST', {
                    quantity: parseInt(document.getElementById('formAddQuantity').value),
                    notes: document.getElementById('formNotes').value
                });
                this.showToast('Stock updated successfully');
                modal.remove();
                this.loadProductsList();
            } catch(error) {
                alert('Error: ' + error.message);
            }
        });
    }

    async loadPOS() {
        document.getElementById('pageTitle').textContent = 'POS Register';
        document.getElementById('pageSubtitle').textContent = 'Stock intake and product management';

        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="grid grid-cols-2 gap-6">
                <div class="card p-6 rounded-lg">
                    <h3 class="text-xl font-bold mb-4">Add Stock to Existing Product</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-semibold mb-2">Select Product</label>
                            <select id="productSelect" class="input-field w-full p-2 rounded-lg">
                                <option value="">-- Choose a product --</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Quantity</label>
                            <input type="number" id="posQuantity" class="input-field w-full p-2 rounded-lg" value="1" step="1" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Notes</label>
                            <textarea id="posNotes" class="input-field w-full p-2 rounded-lg" rows="3" placeholder="Optional notes..."></textarea>
                        </div>
                        <button id="addStockBtn" class="btn-primary w-full p-2 rounded-lg font-semibold">Add Stock</button>
                    </div>
                </div>

                <div class="card p-6 rounded-lg">
                    <h3 class="text-xl font-bold mb-4">Create New Product</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-semibold mb-2">SKU *</label>
                            <input type="text" id="newSKU" class="input-field w-full p-2 rounded-lg" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Product Name *</label>
                            <input type="text" id="newName" class="input-field w-full p-2 rounded-lg" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Category *</label>
                            <input type="text" id="newCategory" class="input-field w-full p-2 rounded-lg" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Cost Price *</label>
                            <input type="number" id="newCostPrice" class="input-field w-full p-2 rounded-lg" step="0.01" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Selling Price *</label>
                            <input type="number" id="newSellingPrice" class="input-field w-full p-2 rounded-lg" step="0.01" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Initial Quantity *</label>
                            <input type="number" id="newQuantity" class="input-field w-full p-2 rounded-lg" value="1" step="1" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-2">Reorder Level</label>
                            <input type="number" id="newReorderLevel" class="input-field w-full p-2 rounded-lg" value="10" step="1">
                        </div>
                        <button id="createProductBtn" class="btn-primary w-full p-2 rounded-lg font-semibold">Create Product</button>
                    </div>
                </div>
            </div>
        `;

        // Load products
        try {
            const products = await this.apiFetch(`${this.apiBase}/pos/available-products`);
            const select = document.getElementById('productSelect');
            products.forEach(product => {
                select.innerHTML += `<option value="${product.id}">${product.name} (${product.sku})</option>`;
            });
        } catch(error) {
            console.error('Error loading products:', error);
        }

        // Add stock button
        document.getElementById('addStockBtn').addEventListener('click', async () => {
            const productId = document.getElementById('productSelect').value;
            if (!productId) {
                alert('Please select a product');
                return;
            }
            try {
                await this.apiFetch(`${this.apiBase}/pos/add-to-product/${productId}`, 'POST', {
                    quantity: parseInt(document.getElementById('posQuantity').value),
                    notes: document.getElementById('posNotes').value
                });
                this.showToast('Stock added successfully');
                document.getElementById('posQuantity').value = '1';
                document.getElementById('posNotes').value = '';
                document.getElementById('productSelect').value = '';
            } catch(error) {
                alert('Error: ' + error.message);
            }
        });

        // Create product button
        document.getElementById('createProductBtn').addEventListener('click', async () => {
            try {
                await this.apiFetch(`${this.apiBase}/pos/create-product`, 'POST', {
                    sku: document.getElementById('newSKU').value,
                    name: document.getElementById('newName').value,
                    category: document.getElementById('newCategory').value,
                    cost_price: parseFloat(document.getElementById('newCostPrice').value),
                    unit_price: parseFloat(document.getElementById('newSellingPrice').value),
                    quantity_in_stock: parseInt(document.getElementById('newQuantity').value),
                    reorder_level: parseInt(document.getElementById('newReorderLevel').value)
                });
                this.showToast('Product created successfully');
                // Clear form
                document.getElementById('newSKU').value = '';
                document.getElementById('newName').value = '';
                document.getElementById('newCategory').value = '';
                document.getElementById('newCostPrice').value = '';
                document.getElementById('newSellingPrice').value = '';
                document.getElementById('newQuantity').value = '1';
                document.getElementById('newReorderLevel').value = '10';
                // Reload products dropdown
                this.loadPOS();
            } catch(error) {
                alert('Error: ' + error.message);
            }
        });
    }

    async loadProcurement() {
        document.getElementById('pageTitle').textContent = 'Procurement';
        document.getElementById('pageSubtitle').textContent = 'Purchase orders and supplier management';

        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="card p-6 rounded-lg">
                <h3 class="text-xl font-bold mb-4">Low Stock Items - Reorder Needed</h3>
                <div id="lowStockList"></div>
            </div>
        `;

        try {
            const items = await this.apiFetch(`${this.apiBase}/reports/low-stock-items`);
            const list = document.getElementById('lowStockList');

            if (items.length === 0) {
                list.innerHTML = '<p class="text-gray-400">All items are well stocked!</p>';
            } else {
                list.innerHTML = `
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="table-head">
                                <tr>
                                    <th class="p-4 text-left">SKU</th>
                                    <th class="p-4 text-left">Product Name</th>
                                    <th class="p-4 text-center">Current Stock</th>
                                    <th class="p-4 text-center">Reorder Level</th>
                                    <th class="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td class="p-4">${item.sku}</td>
                                        <td class="p-4">${item.name}</td>
                                        <td class="p-4 text-center font-bold">${item.quantity}</td>
                                        <td class="p-4 text-center">${item.reorder_level}</td>
                                        <td class="p-4 text-center">
                                            <span class="status-badge status-${item.status.replace('_', '-')}">${item.status.replace('_', ' ').toUpperCase()}</span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        } catch(error) {
            document.getElementById('lowStockList').innerHTML = `<div class="text-red-500">Error: ${error.message}</div>`;
        }
    }

    async loadReports() {
        document.getElementById('pageTitle').textContent = 'Reports';
        document.getElementById('pageSubtitle').textContent = 'Inventory analytics and insights';

        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="grid grid-cols-2 gap-6 mb-6">
                <div class="card p-6 rounded-lg">
                    <h3 class="text-lg font-semibold mb-4">Inventory Summary</h3>
                    <div id="summaryStats"></div>
                </div>
                <div class="card p-6 rounded-lg">
                    <h3 class="text-lg font-semibold mb-4">Stock by Category</h3>
                    <div id="categoryStats"></div>
                </div>
            </div>
            <div class="card p-6 rounded-lg">
                <h3 class="text-lg font-semibold mb-4">Product Availability Chart</h3>
                <canvas id="availabilityChart"></canvas>
            </div>
        `;

        try {
            const summary = await this.apiFetch(`${this.apiBase}/reports/inventory-summary`);
            const categoryStats = await this.apiFetch(`${this.apiBase}/reports/stock-by-category`);
            const products = await this.apiFetch(`${this.apiBase}/reports/product-availability`);

            // Summary stats
            document.getElementById('summaryStats').innerHTML = `
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between"><span>Total Products:</span><span class="font-bold">${summary.total_products}</span></div>
                    <div class="flex justify-between"><span>Total Items:</span><span class="font-bold">${summary.total_items}</span></div>
                    <div class="flex justify-between"><span>Inventory Value:</span><span class="font-bold">$${summary.total_inventory_value.toFixed(2)}</span></div>
                    <div class="flex justify-between"><span>Low Stock:</span><span class="font-bold text-orange-500">${summary.low_stock_count}</span></div>
                    <div class="flex justify-between"><span>Out of Stock:</span><span class="font-bold text-red-500">${summary.out_of_stock_count}</span></div>
                </div>
            `;

            // Category stats
            let categoryHtml = '<div class="space-y-3 text-sm">';
            for (const [category, stats] of Object.entries(categoryStats)) {
                categoryHtml += `
                    <div class="flex justify-between pb-2 border-b border-gray-700">
                        <span>${category}</span>
                        <span class="font-semibold">${stats.product_count} products (${stats.total_items} items)</span>
                    </div>
                `;
            }
            categoryHtml += '</div>';
            document.getElementById('categoryStats').innerHTML = categoryHtml;

            // Chart
            const ctx = document.getElementById('availabilityChart').getContext('2d');
            const chartData = {
                labels: products.map(p => p.name),
                datasets: [{
                    label: 'Quantity in Stock',
                    data: products.map(p => p.quantity),
                    backgroundColor: products.map(p => {
                        if (p.status === 'in_stock') return '#10b981';
                        if (p.status === 'low_stock') return '#f59e0b';
                        return '#ef4444';
                    })
                }]
            };

            new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#d1d5db' },
                            grid: { color: '#374151' }
                        },
                        x: {
                            ticks: { color: '#d1d5db' },
                            grid: { color: '#374151' }
                        }
                    }
                }
            });
        } catch(error) {
            content.innerHTML = `<div class="text-red-500">Error: ${error.message}</div>`;
        }
    }

    async loadSetup() {
        document.getElementById('pageTitle').textContent = 'Setup';
        document.getElementById('pageSubtitle').textContent = 'Configuration and settings';

        const content = document.getElementById('pageContent');
        content.innerHTML = '<div class="flex justify-center items-center h-64"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';

        try {
            const settings = await this.apiFetch(`${this.apiBase}/settings`);

            content.innerHTML = `
                <div class="grid grid-cols-2 gap-6">
                    <div class="card p-6 rounded-lg">
                        <h3 class="text-xl font-bold mb-4">Store Settings</h3>
                        <form id="settingsForm" class="space-y-4">
                            <div>
                                <label class="block text-sm font-semibold mb-2">Store Name</label>
                                <input type="text" id="storeName" class="input-field w-full p-2 rounded-lg" value="${settings.store_name}">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold mb-2">Currency Symbol</label>
                                <input type="text" id="currencySymbol" class="input-field w-full p-2 rounded-lg" value="${settings.currency_symbol}" maxlength="5">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold mb-2">Low Stock Threshold</label>
                                <input type="number" id="lowStockThreshold" class="input-field w-full p-2 rounded-lg" value="${settings.low_stock_threshold}" step="1">
                            </div>
                            <button type="submit" class="btn-primary w-full p-2 rounded-lg font-semibold">Save Settings</button>
                        </form>
                    </div>

                    <div class="card p-6 rounded-lg">
                        <h3 class="text-xl font-bold mb-4">Theme & Appearance</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-semibold mb-2">Current Theme</label>
                                <div class="flex gap-2">
                                    <span class="px-4 py-2 rounded-lg bg-gray-700">${this.theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
                                    <button id="themeChangeBtn" class="btn-primary px-4 py-2 rounded-lg font-semibold">Switch Theme</button>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold mb-2">Store Logo</label>
                                <input type="file" id="logoUpload" class="input-field w-full p-2 rounded-lg" accept="image/*">
                                <p class="text-xs text-gray-400 mt-2">Upload a logo for your store (PNG, JPG)</p>
                                <button type="button" id="uploadLogoBtn" class="btn-primary w-full p-2 rounded-lg font-semibold mt-2">Upload Logo</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('settingsForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    await this.apiFetch(`${this.apiBase}/settings`, 'PUT', {
                        store_name: document.getElementById('storeName').value,
                        currency_symbol: document.getElementById('currencySymbol').value,
                        low_stock_threshold: parseInt(document.getElementById('lowStockThreshold').value)
                    });
                    this.showToast('Settings saved successfully');
                } catch(error) {
                    alert('Error: ' + error.message);
                }
            });

            document.getElementById('themeChangeBtn').addEventListener('click', () => this.toggleTheme());

            document.getElementById('uploadLogoBtn').addEventListener('click', async () => {
                const file = document.getElementById('logoUpload').files[0];
                if (!file) {
                    alert('Please select a file');
                    return;
                }
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', `${this.apiBase}/settings/logo`, true);
                    xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            this.showToast('Logo uploaded successfully');
                            document.getElementById('logoUpload').value = '';
                        }
                    };
                    xhr.send(formData);
                } catch(error) {
                    alert('Error: ' + error.message);
                }
            });
        } catch(error) {
            content.innerHTML = `<div class="text-red-500">Error: ${error.message}</div>`;
        }
    }

    loadAbout() {
        document.getElementById('pageTitle').textContent = 'About';
        document.getElementById('pageSubtitle').textContent = 'Product information';

        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="max-w-2xl">
                <div class="card p-8 rounded-lg text-center mb-6">
                    <h1 class="text-4xl font-bold mb-2">SwiftStock</h1>
                    <p class="text-xl text-gray-400 mb-4">Retail Inventory Management System</p>
                    <p class="text-sm text-gray-500">Version 1.0.0</p>
                </div>

                <div class="card p-6 rounded-lg mb-6">
                    <h3 class="text-xl font-bold mb-4">Features</h3>
                    <ul class="space-y-2 text-sm text-gray-300">
                        <li>✓ Complete inventory management</li>
                        <li>✓ Stock tracking and alerts</li>
                        <li>✓ POS-based stock intake</li>
                        <li>✓ Comprehensive reporting with charts</li>
                        <li>✓ Dark/Light theme support</li>
                        <li>✓ Multi-user administration</li>
                        <li>✓ Store customization with logos</li>
                    </ul>
                </div>

                <div class="card p-6 rounded-lg">
                    <h3 class="text-xl font-bold mb-4">Technology Stack</h3>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p class="font-semibold text-blue-500">Backend</p>
                            <ul class="text-gray-300 space-y-1">
                                <li>• FastAPI</li>
                                <li>• SQLAlchemy</li>
                                <li>• SQLite</li>
                                <li>• Python 3.9+</li>
                            </ul>
                        </div>
                        <div>
                            <p class="font-semibold text-blue-500">Frontend</p>
                            <ul class="text-gray-300 space-y-1">
                                <li>• Vanilla JavaScript</li>
                                <li>• Tailwind CSS</li>
                                <li>• Chart.js</li>
                                <li>• FontAwesome Icons</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', this.theme);
        this.setupTheme();
    }

    async loadSettings() {
        try {
            const settings = await this.apiFetch(`${this.apiBase}/settings`);
            if (settings.theme && settings.theme !== this.theme) {
                this.theme = settings.theme;
                this.setupTheme();
            }
        } catch(error) {
            console.log('Could not load remote settings');
        }
    }

    showLoginModal() {
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('registerModal').classList.add('hidden');
    }

    switchToRegister() {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('registerModal').classList.remove('hidden');
    }

    switchToLogin() {
        document.getElementById('registerModal').classList.add('hidden');
        document.getElementById('loginModal').classList.remove('hidden');
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await this.apiFetch(`${this.apiBase}/auth/login`, 'POST', {
                username, password
            });

            this.token = response.access_token;
            this.user = response.user;
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(this.user));

            document.getElementById('loginModal').classList.add('hidden');
            document.getElementById('currentUser').textContent = this.user.username;

            await this.loadSettings();
            this.showPage('dashboard');
            this.showToast('Logged in successfully');
        } catch(error) {
            alert('Login failed: ' + error.message);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const email = document.getElementById('registerEmail').value;

        try {
            await this.apiFetch(`${this.apiBase}/auth/register`, 'POST', {
                username, password, email: email || null
            });

            this.showToast('Account created! Logging in...');

            // Auto-login after registration
            setTimeout(() => {
                document.getElementById('loginUsername').value = username;
                document.getElementById('loginPassword').value = password;
                document.getElementById('loginForm').dispatchEvent(new Event('submit'));
            }, 1000);
        } catch(error) {
            alert('Registration failed: ' + error.message);
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = {};
        this.showLoginModal();
    }

    async apiFetch(url, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        if (response.status === 401) {
            this.logout();
            throw new Error('Unauthorized - please login again');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'API Error');
        }

        return await response.json();
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// Initialize app
const app = new SwiftStock();
