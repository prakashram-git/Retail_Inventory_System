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
            // Keep login modal visible, hide app
            document.getElementById('app').classList.add('hidden');
            this.showLoginModal();
        } else {
            // Show app, hide login modal
            document.getElementById('app').classList.remove('hidden');
            document.getElementById('loginModal').classList.add('hidden');
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
                <p class="text-xs text-gray-400 mb-4">SKU will be auto-generated</p>
                <form id="addProductForm" class="space-y-4">
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
                        <button type="button" class="btn-secondary flex-1 p-2 rounded-lg font-semibold bg-gray-700 text-white">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('addProductForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await this.apiFetch(`${this.apiBase}/inventory/products`, 'POST', {
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

        // Cancel button
        modal.querySelector('button:last-of-type').addEventListener('click', () => {
            modal.remove();
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
                        <button type="button" class="btn-secondary flex-1 p-2 rounded-lg font-semibold bg-gray-700 text-white">Cancel</button>
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

        // Cancel button
        modal.querySelector('button:last-of-type').addEventListener('click', () => {
            modal.remove();
        });
    }

    downloadCSVTemplate() {
        const headers = ['name', 'category', 'cost_price', 'unit_price', 'quantity_in_stock', 'reorder_level'];
        const sampleData = [
            ['Laptop', 'Electronics', '500', '800', '5', '2'],
            ['Mouse', 'Accessories', '10', '15', '50', '10'],
            ['Keyboard', 'Accessories', '25', '40', '30', '8']
        ];

        const csvContent = [
            headers.join(','),
            ...sampleData.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'products_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    showImportCSVModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="card p-8 rounded-lg w-full max-w-2xl shadow-xl max-h-96 overflow-y-auto">
                <h2 class="text-2xl font-bold mb-2">Import Products from CSV</h2>
                <p class="text-gray-400 mb-6">Bulk add multiple products at once</p>

                <div class="space-y-4">
                    <div>
                        <button id="downloadTemplateBtn" class="mb-4 bg-gray-700 text-white p-2 rounded-lg font-semibold hover:bg-gray-600 flex items-center gap-2">
                            <i class="fas fa-download"></i>
                            Download CSV Template
                        </button>
                        <label class="block text-sm font-semibold mb-2">Select CSV File *</label>
                        <input type="file" id="csvFile" class="input-field w-full p-2 rounded-lg" accept=".csv" required>
                        <p class="text-xs text-gray-400 mt-2">Required columns: name, category, cost_price, unit_price, quantity_in_stock, reorder_level</p>
                    </div>

                    <div id="csvPreview" class="hidden">
                        <label class="block text-sm font-semibold mb-2">Preview (first 5 rows):</label>
                        <div class="bg-gray-900 p-3 rounded-lg overflow-x-auto text-xs">
                            <table class="w-full">
                                <tbody id="previewTable"></tbody>
                            </table>
                        </div>
                    </div>

                    <div class="flex gap-2">
                        <button id="importBtn" class="btn-primary flex-1 p-2 rounded-lg font-semibold">Import Products</button>
                        <button type="button" class="btn-secondary flex-1 p-2 rounded-lg font-semibold bg-gray-700 text-white" onclick="this.closest('div').parentElement.remove()">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('downloadTemplateBtn').addEventListener('click', () => this.downloadCSVTemplate());

        document.getElementById('csvFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const csv = event.target.result;
                    const lines = csv.trim().split('\n');
                    const preview = document.getElementById('csvPreview');
                    const previewTable = document.getElementById('previewTable');

                    previewTable.innerHTML = '';
                    const rowLimit = Math.min(5, lines.length);

                    for (let i = 0; i < rowLimit; i++) {
                        const cols = lines[i].split(',');
                        const row = document.createElement('tr');
                        row.innerHTML = cols.map(col => `<td class="p-2 border-b border-gray-700">${col.trim()}</td>`).join('');
                        previewTable.appendChild(row);
                    }

                    preview.classList.remove('hidden');
                };
                reader.readAsText(file);
            }
        });

        document.getElementById('importBtn').addEventListener('click', async () => {
            const file = document.getElementById('csvFile').files[0];
            if (!file) {
                alert('Please select a CSV file');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const csv = event.target.result;
                    const lines = csv.trim().split('\n');
                    const headers = lines[0].split(',').map(h => h.trim());
                    const products = [];

                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.trim());
                        if (values.some(v => v)) {
                            const product = {};
                            headers.forEach((header, index) => {
                                if (header === 'cost_price' || header === 'unit_price' || header === 'reorder_level' || header === 'quantity_in_stock') {
                                    product[header] = parseFloat(values[index]) || 0;
                                } else {
                                    product[header] = values[index];
                                }
                            });
                            products.push(product);
                        }
                    }

                    if (products.length === 0) {
                        alert('No valid products found in CSV');
                        return;
                    }

                    const response = await this.apiFetch(`${this.apiBase}/pos/import-products`, 'POST', { products });
                    this.showToast(`Successfully imported ${response.imported_count} products`);
                    modal.remove();
                    this.loadPOS();
                } catch(error) {
                    alert('Error importing products: ' + error.message);
                }
            };
            reader.readAsText(file);
        });
    }

    async loadPOS() {
        document.getElementById('pageTitle').textContent = 'POS Register';
        document.getElementById('pageSubtitle').textContent = 'Stock intake and product management';

        const content = document.getElementById('pageContent');

        // Action buttons header
        const buttonsHTML = `
            <div class="flex gap-3 mb-6">
                <button id="importCSVBtn" class="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-semibold flex items-center gap-2 transition">
                    <i class="fas fa-plus"></i>
                    <i class="fas fa-file-csv"></i>
                    Import CSV
                </button>
                <button id="createQuickBtn" class="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold flex items-center gap-2 transition">
                    <i class="fas fa-plus"></i>
                    Add Single Product
                </button>
            </div>
        `;

        content.innerHTML = buttonsHTML + `
            <div class="grid grid-cols-2 gap-6">
                <div class="card p-6 rounded-lg">
                    <h3 class="text-xl font-bold mb-4"><i class="fas fa-boxes mr-2"></i>Add Stock to Existing Product</h3>
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

                <div class="card p-6 rounded-lg" id="createProductSection">
                    <h3 class="text-xl font-bold mb-4"><i class="fas fa-plus-circle mr-2"></i>Create New Product</h3>
                    <p class="text-xs text-gray-400 mb-4"><i class="fas fa-info-circle"></i> SKU will be auto-generated</p>
                    <div class="space-y-4">
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

        // Import CSV button
        document.getElementById('importCSVBtn').addEventListener('click', () => this.showImportCSVModal());

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
                    name: document.getElementById('newName').value,
                    category: document.getElementById('newCategory').value,
                    cost_price: parseFloat(document.getElementById('newCostPrice').value),
                    unit_price: parseFloat(document.getElementById('newSellingPrice').value),
                    quantity_in_stock: parseInt(document.getElementById('newQuantity').value),
                    reorder_level: parseInt(document.getElementById('newReorderLevel').value)
                });
                this.showToast('Product created successfully');
                // Clear form
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
        document.getElementById('pageSubtitle').textContent = 'Professional inventory analysis and reporting';

        const content = document.getElementById('pageContent');

        // Date range filter UI
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

        content.innerHTML = `
            <div class="mb-6 p-4 card rounded-lg flex gap-4 items-end">
                <div>
                    <label class="block text-sm font-semibold mb-2">From Date</label>
                    <input type="date" id="fromDate" class="input-field p-2 rounded-lg" value="${thirtyDaysAgo.toISOString().split('T')[0]}">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">To Date</label>
                    <input type="date" id="toDate" class="input-field p-2 rounded-lg" value="${today.toISOString().split('T')[0]}">
                </div>
                <button id="filterReportBtn" class="btn-primary px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                    <i class="fas fa-filter"></i> View Report
                </button>
            </div>
            <div id="reportContent"></div>
        `;

        const generateReport = async () => {
            try {
                document.getElementById('reportContent').innerHTML = '<div class="flex justify-center items-center h-64"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';

                const summary = await this.apiFetch(`${this.apiBase}/reports/inventory-summary`);
                const categoryStats = await this.apiFetch(`${this.apiBase}/reports/stock-by-category`);
                const products = await this.apiFetch(`${this.apiBase}/reports/product-availability`);
                const settings = await this.apiFetch(`${this.apiBase}/settings`);

                const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const reportTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                // Professional Report Layout
                const isDarkMode = this.theme === 'dark';
                const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
                const textPrimary = isDarkMode ? 'text-gray-100' : 'text-gray-900';
                const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-600';
                const borderColor = isDarkMode ? 'border-gray-600' : 'border-gray-300';
                const headerBg = isDarkMode ? 'bg-gray-900' : 'bg-gray-200';
                const tableBg = isDarkMode ? 'bg-gray-700' : 'bg-gray-100';

                document.getElementById('reportContent').innerHTML = `
                <div id="reportContainer" class="${bgColor} ${textPrimary} p-8 rounded-lg shadow-2xl">
                    <!-- Report Header -->
                    <div class="border-b-2 ${borderColor} pb-4 mb-6">
                        <div class="flex justify-between items-start">
                            <div>
                                <h1 class="text-3xl font-bold ${textPrimary}">INVENTORY REPORT</h1>
                                <p class="text-sm ${textSecondary} mt-1">${settings.store_name || 'SwiftStock Inventory System'}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-xs ${textSecondary}">Report Date: ${reportDate}</p>
                                <p class="text-xs ${textSecondary}">Report Time: ${reportTime}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Executive Summary - 4 Column Grid -->
                    <div class="grid grid-cols-4 gap-4 mb-8">
                        <div class="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-lg border-l-4 border-blue-400">
                            <p class="text-xs font-semibold text-blue-100 uppercase">Total Products</p>
                            <p class="text-2xl font-bold text-white mt-2">${summary.total_products}</p>
                        </div>
                        <div class="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-lg border-l-4 border-green-400">
                            <p class="text-xs font-semibold text-green-100 uppercase">Total Units</p>
                            <p class="text-2xl font-bold text-white mt-2">${summary.total_items.toLocaleString()}</p>
                        </div>
                        <div class="bg-gradient-to-br from-purple-600 to-purple-700 p-4 rounded-lg border-l-4 border-purple-400">
                            <p class="text-xs font-semibold text-purple-100 uppercase">Inventory Value</p>
                            <p class="text-2xl font-bold text-white mt-2">${settings.currency_symbol}${summary.total_inventory_value.toFixed(2)}</p>
                        </div>
                        <div class="bg-gradient-to-br from-amber-600 to-amber-700 p-4 rounded-lg border-l-4 border-amber-400">
                            <p class="text-xs font-semibold text-amber-100 uppercase">Alerts</p>
                            <p class="text-2xl font-bold text-white mt-2">${summary.low_stock_count + summary.out_of_stock_count}</p>
                        </div>
                    </div>

                    <!-- Stock Status Summary -->
                    <div class="grid grid-cols-3 gap-4 mb-8">
                        <div class="p-4 border ${borderColor} rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-xs font-semibold ${textSecondary} uppercase">In Stock</p>
                                    <p class="text-xl font-bold text-green-400">${summary.total_products - summary.low_stock_count - summary.out_of_stock_count}</p>
                                </div>
                                <i class="fas fa-check-circle text-3xl text-green-500 opacity-30"></i>
                            </div>
                        </div>
                        <div class="p-4 border ${borderColor} rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-xs font-semibold ${textSecondary} uppercase">Low Stock</p>
                                    <p class="text-xl font-bold text-orange-400">${summary.low_stock_count}</p>
                                </div>
                                <i class="fas fa-exclamation-triangle text-3xl text-orange-500 opacity-30"></i>
                            </div>
                        </div>
                        <div class="p-4 border ${borderColor} rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-xs font-semibold ${textSecondary} uppercase">Out of Stock</p>
                                    <p class="text-xl font-bold text-red-400">${summary.out_of_stock_count}</p>
                                </div>
                                <i class="fas fa-times-circle text-3xl text-red-500 opacity-30"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Category Breakdown -->
                    <div class="mb-8">
                        <h2 class="text-lg font-bold ${textPrimary} mb-4 pb-2 border-b-2 ${borderColor}">Category Breakdown</h2>
                        <div class="grid grid-cols-4 gap-3">
                            ${Object.entries(categoryStats).map(([category, stats]) => `
                                <div class="p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg border ${borderColor}">
                                    <p class="font-semibold ${textPrimary} text-sm">${category}</p>
                                    <p class="text-xs ${textSecondary}">${stats.product_count} SKUs</p>
                                    <p class="text-base font-bold text-blue-400 mt-1">${stats.total_items.toLocaleString()} units</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Product Inventory Table -->
                    <div class="mb-8">
                        <h2 class="text-lg font-bold ${textPrimary} mb-4 pb-2 border-b-2 ${borderColor}">Product Inventory</h2>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm border-collapse">
                                <thead class="${headerBg} ${textPrimary}">
                                    <tr>
                                        <th class="p-3 text-left font-semibold">SKU</th>
                                        <th class="p-3 text-left font-semibold">Product</th>
                                        <th class="p-3 text-center font-semibold">Qty</th>
                                        <th class="p-3 text-center font-semibold">Status</th>
                                        <th class="p-3 text-right font-semibold">Unit Price</th>
                                        <th class="p-3 text-right font-semibold">Total Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${products.map((p, index) => {
                                        const altBg = index % 2 === 0 ?
                                            (isDarkMode ? 'bg-gray-800' : 'bg-blue-50') :
                                            (isDarkMode ? 'bg-gray-750' : 'bg-green-50');
                                        return `
                                            <tr class="border-b ${borderColor} ${altBg} hover:opacity-80">
                                                <td class="p-2 font-mono text-xs font-normal">${p.sku}</td>
                                                <td class="p-2 text-xs">
                                                    <span class="font-bold ${textPrimary} block">${p.name}</span>
                                                    <span class="text-xs ${textSecondary}">${p.category}</span>
                                                </td>
                                                <td class="p-2 text-center text-xs font-normal">${p.quantity.toLocaleString()}</td>
                                                <td class="p-2 text-center">
                                                    <span class="px-2 py-0.5 rounded text-xs font-bold ${
                                                        p.status === 'in_stock' ? 'bg-green-900 text-green-200' :
                                                        p.status === 'low_stock' ? 'bg-orange-900 text-orange-200' :
                                                        'bg-red-900 text-red-200'
                                                    }">
                                                        ${p.status.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td class="p-2 text-right text-xs font-normal">${settings.currency_symbol}${p.unit_price.toFixed(2)}</td>
                                                <td class="p-2 text-right text-xs font-bold">${settings.currency_symbol}${(p.quantity * p.unit_price).toFixed(2)}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="border-t-2 ${borderColor} pt-4 mt-8 text-xs ${textSecondary} flex justify-between">
                        <div>
                            <p>Report Generated: ${new Date().toLocaleString()}</p>
                            <p>System: SwiftStock Inventory Management System v1.0</p>
                        </div>
                        <div class="text-right">
                            <p>© ${new Date().getFullYear()} ${settings.store_name || 'SwiftStock'}</p>
                            <p>Confidential</p>
                        </div>
                    </div>
                </div>

                <!-- PDF Export Button -->
                <div class="mt-6 flex gap-3 justify-center">
                    <button id="generatePDFBtn" class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transition transform hover:scale-105">
                        <i class="fas fa-file-pdf"></i>
                        Generate PDF Report
                    </button>
                    <button id="printReportBtn" class="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transition transform hover:scale-105">
                        <i class="fas fa-print"></i>
                        Print Report
                    </button>
                </div>
                `;

                // PDF Export Function
                document.getElementById('generatePDFBtn').addEventListener('click', () => {
                    const element = document.getElementById('reportContainer');
                    const opt = {
                        margin: 10,
                        filename: `Inventory_Report_${reportDate.replace(/\\s+/g, '_')}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2 },
                        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
                    };
                    html2pdf().set(opt).from(element).save();
                    this.showToast('PDF report generated successfully!');
                });

                // Print Function
                document.getElementById('printReportBtn').addEventListener('click', () => {
                    const printContent = document.getElementById('reportContainer').innerHTML;
                    const originalContent = document.body.innerHTML;
                    document.body.innerHTML = printContent;
                    window.print();
                    document.body.innerHTML = originalContent;
                    this.showToast('Print dialog opened');
                    this.loadReports();
                });
            } catch(error) {
                document.getElementById('reportContent').innerHTML = `<div class="text-red-500">Error: ${error.message}</div>`;
            }
        };

        // Call generateReport on initial load
        generateReport();

        // Add event listener to filter button
        document.getElementById('filterReportBtn').addEventListener('click', generateReport);
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
        document.getElementById('app').classList.add('hidden');
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

            // Show app, hide login modal
            document.getElementById('app').classList.remove('hidden');
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
        // Clear form fields
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        // Show login modal and hide app
        document.getElementById('app').classList.add('hidden');
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('registerModal').classList.add('hidden');
        this.showToast('Logged out successfully');
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
            let errorMessage = 'API Error';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    errorMessage = error.detail || error.message || 'API Error';
                } else {
                    const text = await response.text();
                    errorMessage = text || `HTTP ${response.status} Error`;
                }
            } catch (e) {
                errorMessage = `HTTP ${response.status} Error`;
            }
            throw new Error(errorMessage);
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
