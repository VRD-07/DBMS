/**
 * Voltcart - Frontend Application Logic (Vanilla JavaScript)
 * Architecture: Clean state-driven Single Page Application
 * No framework, no build step, standard DOM manipulation.
 */

// ============================================================================
// APPLICATION STATE
// ============================================================================
const state = {
    currentView: 'shop', // 'shop' | 'cart' | 'admin'
    adminActiveTab: 'tab-dashboard',
    
    // Catalog filters
    category: 'all',
    brand: 'all',
    sort: 'newest',
    search: '',
    page: 1,
    limit: 12,
    totalPages: 1,
    totalProducts: 0,
    
    // Cached collections
    categories: [],
    brands: [],
    suppliers: [],
    customers: [],
    products: [],
    
    // Shopping Cart (loaded from localStorage)
    cart: []
};

// ============================================================================
// FORMATTING HELPERS
// ============================================================================
const inrFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
});

function formatINR(amount) {
    const val = parseFloat(amount);
    return isNaN(val) ? '₹0.00' : inrFormatter.format(val);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : ''}`;
    
    const iconSvg = type === 'error' 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 250);
    }, 4000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================================================
// CART MANAGEMENT
// ============================================================================
function loadCartFromStorage() {
    try {
        const stored = localStorage.getItem('voltcart_cart');
        if (stored) {
            state.cart = JSON.parse(stored);
        }
    } catch (e) {
        state.cart = [];
    }
    updateCartBadge();
}

function saveCartToStorage() {
    localStorage.setItem('voltcart_cart', JSON.stringify(state.cart));
    updateCartBadge();
}

function updateCartBadge() {
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-counter');
    if (badge) badge.textContent = totalItems;
    const label = document.getElementById('cart-item-count-label');
    if (label) label.textContent = totalItems;
}

function addToCart(product, qty = 1) {
    const existing = state.cart.find(item => item.product_id === product.product_id);
    const available = product.stock_qty;

    if (existing) {
        if (existing.quantity + qty > available) {
            showToast(`Cannot add more. Only ${available} unit(s) available in stock.`, 'error');
            return;
        }
        existing.quantity += qty;
    } else {
        if (qty > available) {
            showToast(`Cannot add to cart. Only ${available} unit(s) in stock.`, 'error');
            return;
        }
        state.cart.push({
            product_id: product.product_id,
            name: product.name,
            sku: product.sku,
            price: parseFloat(product.price),
            image_url: product.image_url || '/images/placeholder.svg',
            brand_name: product.brand_name || '',
            quantity: qty,
            stock_qty: available
        });
    }

    saveCartToStorage();
    showToast(`Added "${product.name}" to cart`, 'success');
}

function updateCartQuantity(productId, delta) {
    const item = state.cart.find(i => i.product_id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }

    if (newQty > item.stock_qty) {
        showToast(`Stock limit reached (${item.stock_qty} available)`, 'error');
        return;
    }

    item.quantity = newQty;
    saveCartToStorage();
    renderCart();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(i => i.product_id !== productId);
    saveCartToStorage();
    renderCart();
    showToast('Item removed from cart', 'info');
}

// ============================================================================
// NAVIGATION & VIEW SWITCHING
// ============================================================================
function switchView(viewName) {
    state.currentView = viewName;

    const viewShop = document.getElementById('view-shop');
    const viewCart = document.getElementById('view-cart');
    const viewAdmin = document.getElementById('view-admin');
    const navShop = document.getElementById('nav-btn-shop');
    const navAdmin = document.getElementById('nav-btn-admin');

    viewShop.style.display = 'none';
    viewCart.style.display = 'none';
    viewAdmin.style.display = 'none';
    navShop.classList.remove('active');
    navAdmin.classList.remove('active');

    if (viewName === 'shop') {
        viewShop.style.display = 'block';
        navShop.classList.add('active');
        fetchProducts();
    } else if (viewName === 'cart') {
        viewCart.style.display = 'block';
        renderCart();
    } else if (viewName === 'admin') {
        viewAdmin.style.display = 'block';
        navAdmin.classList.add('active');
        loadAdminTab(state.adminActiveTab);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// API CLIENT
// ============================================================================
async function apiGet(endpoint) {
    const res = await fetch(endpoint);
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
    }
    return res.json();
}

async function apiPost(endpoint, data) {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(result.error || `HTTP error ${res.status}`);
    }
    return result;
}

async function apiPut(endpoint, data) {
    const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(result.error || `HTTP error ${res.status}`);
    }
    return result;
}

async function apiPatch(endpoint, data) {
    const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(result.error || `HTTP error ${res.status}`);
    }
    return result;
}

async function apiDelete(endpoint) {
    const res = await fetch(endpoint, { method: 'DELETE' });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(result.error || `HTTP error ${res.status}`);
    }
    return result;
}

// ============================================================================
// SHOP & CATALOG
// ============================================================================
async function fetchCategories() {
    try {
        state.categories = await apiGet('/api/categories');
        renderCategoryChips();
        populateCategorySelects();
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}

async function fetchBrands() {
    try {
        state.brands = await apiGet('/api/brands');
        renderBrandFilterOptions();
        populateBrandSelects();
    } catch (err) {
        console.error('Failed to load brands:', err);
    }
}

async function fetchSuppliers() {
    try {
        state.suppliers = await apiGet('/api/suppliers');
        populateSupplierSelects();
    } catch (err) {
        console.error('Failed to load suppliers:', err);
    }
}

function renderCategoryChips() {
    const container = document.getElementById('category-chips-list');
    if (!container) return;

    let html = `<button class="chip ${state.category === 'all' ? 'active' : ''}" data-category="all">All Products</button>`;
    
    state.categories.forEach(cat => {
        const isActive = state.category === cat.slug;
        html += `<button class="chip ${isActive ? 'active' : ''}" data-category="${escapeHtml(cat.slug)}">${escapeHtml(cat.name)}</button>`;
    });

    container.innerHTML = html;

    container.querySelectorAll('.chip').forEach(btn => {
        btn.addEventListener('click', () => {
            state.category = btn.getAttribute('data-category');
            state.page = 1;
            renderCategoryChips();
            fetchProducts();
        });
    });
}

function renderBrandFilterOptions() {
    const select = document.getElementById('filter-brand');
    if (!select) return;

    let options = '<option value="all">All Brands</option>';
    state.brands.forEach(b => {
        options += `<option value="${escapeHtml(b.name)}" ${state.brand === b.name ? 'selected' : ''}>${escapeHtml(b.name)}</option>`;
    });
    select.innerHTML = options;
}

async function fetchProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    // Loading skeletons
    grid.innerHTML = Array(8).fill('<div class="skeleton-card"></div>').join('');

    try {
        const params = new URLSearchParams({
            page: state.page,
            limit: state.limit,
            sort: state.sort,
            category: state.category,
            brand: state.brand,
            search: state.search
        });

        const data = await apiGet(`/api/products?${params.toString()}`);
        state.products = data.products;
        state.totalProducts = data.total;
        state.totalPages = data.totalPages;

        renderProductGrid();
        renderPagination();
        updateResultsCount();
    } catch (err) {
        console.error('Error fetching products:', err);
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <p>Could not connect to database or fetch catalog: ${escapeHtml(err.message)}</p>
                <button class="btn-secondary" onclick="fetchProducts()" style="margin-top: 12px;">Retry</button>
            </div>
        `;
    }
}

function renderProductGrid() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if (!state.products || state.products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <h3>No hardware matched your criteria</h3>
                <p>Try clearing your search query or selecting a different category.</p>
            </div>
        `;
        return;
    }

    // Strict Product Card Rule: Image, Name, Brand (small), Price, One button.
    const html = state.products.map(p => {
        const imgUrl = p.image_url || '/images/placeholder.svg';
        const isOutOfStock = p.stock_qty <= 0;

        return `
            <article class="product-card" data-id="${p.product_id}">
                <div class="product-card-image-wrap" onclick="openProductDetail(${p.product_id})">
                    <img 
                        class="product-card-image" 
                        src="${escapeHtml(imgUrl)}" 
                        alt="${escapeHtml(p.name)}" 
                        loading="lazy" 
                        onerror="this.onerror=null;this.src='/images/placeholder.svg';"
                    >
                </div>
                <div class="product-card-body">
                    <div class="product-card-brand">${escapeHtml(p.brand_name || 'Generic')}</div>
                    <h3 class="product-card-title" onclick="openProductDetail(${p.product_id})" title="${escapeHtml(p.name)}">
                        ${escapeHtml(p.name)}
                    </h3>
                    <div class="product-card-footer">
                        <div class="product-card-price tabular-nums">${formatINR(p.price)}</div>
                        <button 
                            class="btn-card-action" 
                            onclick="handleQuickAddToCart(event, ${p.product_id})"
                            ${isOutOfStock ? 'disabled' : ''}
                        >
                            ${isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    grid.innerHTML = html;
}

function updateResultsCount() {
    const el = document.getElementById('results-count-text');
    if (!el) return;
    el.textContent = `Showing ${state.products.length} of ${state.totalProducts} items`;
}

function renderPagination() {
    const container = document.getElementById('pagination-container');
    if (!container) return;

    if (state.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let buttons = `
        <button class="btn-page" ${state.page === 1 ? 'disabled' : ''} onclick="goToPage(${state.page - 1})" aria-label="Previous page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
    `;

    for (let p = 1; p <= state.totalPages; p++) {
        buttons += `
            <button class="btn-page ${p === state.page ? 'active' : ''}" onclick="goToPage(${p})">
                ${p}
            </button>
        `;
    }

    buttons += `
        <button class="btn-page" ${state.page === state.totalPages ? 'disabled' : ''} onclick="goToPage(${state.page + 1})" aria-label="Next page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
    `;

    container.innerHTML = buttons;
}

function goToPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > state.totalPages) return;
    state.page = pageNumber;
    fetchProducts();
    window.scrollTo({ top: 380, behavior: 'smooth' });
}

function handleQuickAddToCart(event, productId) {
    event.stopPropagation();
    const product = state.products.find(p => p.product_id === productId);
    if (product) {
        addToCart(product, 1);
    }
}

// ============================================================================
// PRODUCT DETAIL MODAL (VIEW 2)
// ============================================================================
async function openProductDetail(productId) {
    const modal = document.getElementById('modal-product-detail');
    const body = document.getElementById('modal-detail-body');
    if (!modal || !body) return;

    body.innerHTML = '<div style="padding: 40px; text-align: center;">Loading hardware details...</div>';
    modal.classList.add('open');

    try {
        const p = await apiGet(`/api/products/${productId}`);
        const imgUrl = p.image_url || '/images/placeholder.svg';
        
        let stockTagClass = 'stock-in';
        let stockText = `In Stock (${p.stock_qty} units available)`;
        if (p.stock_qty <= 0) {
            stockTagClass = 'stock-out';
            stockText = 'Out of Stock';
        } else if (p.stock_qty < 5) {
            stockTagClass = 'stock-low';
            stockText = `Low Stock (${p.stock_qty} units left)`;
        }

        body.innerHTML = `
            <div class="detail-image-box">
                <img 
                    src="${escapeHtml(imgUrl)}" 
                    alt="${escapeHtml(p.name)}" 
                    onerror="this.onerror=null;this.src='/images/placeholder.svg';"
                >
            </div>
            <div class="detail-info">
                <div class="detail-brand-badge">${escapeHtml(p.brand_name || '')} • ${escapeHtml(p.category_name || '')}</div>
                <h2 class="detail-title">${escapeHtml(p.name)}</h2>
                <div class="detail-sku">SKU: ${escapeHtml(p.sku)}</div>
                <div class="detail-price tabular-nums">${formatINR(p.price)}</div>
                
                <div class="stock-status-tag ${stockTagClass}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    <span>${stockText}</span>
                </div>

                <div class="detail-description">
                    ${escapeHtml(p.description || 'Precision engineered hardware with original manufacturer warranty.')}
                </div>

                <button 
                    class="btn-detail-add" 
                    id="btn-detail-add-cart"
                    ${p.stock_qty <= 0 ? 'disabled' : ''}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    ${p.stock_qty <= 0 ? 'Currently Out of Stock' : 'Add to Shopping Cart'}
                </button>
            </div>
        `;

        const addBtn = document.getElementById('btn-detail-add-cart');
        if (addBtn && p.stock_qty > 0) {
            addBtn.addEventListener('click', () => {
                addToCart(p, 1);
                modal.classList.remove('open');
            });
        }
    } catch (err) {
        body.innerHTML = `<div style="padding: 40px; text-align: center; color: red;">Failed to load details: ${escapeHtml(err.message)}</div>`;
    }
}

// ============================================================================
// CART & CHECKOUT VIEW (VIEW 3)
// ============================================================================
function renderCart() {
    const list = document.getElementById('cart-items-container');
    const wrapper = document.getElementById('cart-content-wrapper');
    const emptyState = document.getElementById('cart-empty-state');
    const successScreen = document.getElementById('order-success-screen');

    if (successScreen) successScreen.style.display = 'none';

    if (!state.cart || state.cart.length === 0) {
        if (wrapper) {
            wrapper.innerHTML = `
                <div class="empty-state" style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: var(--space-12);">
                    <div class="empty-state-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                    </div>
                    <h3>Your cart is empty</h3>
                    <p style="margin: 8px 0 24px;">Browse our catalog and add precision electronics to your checkout.</p>
                    <button class="btn-primary" style="width: auto; margin: 0 auto; padding: 0 24px;" onclick="switchView('shop')">Explore Catalog</button>
                </div>
            `;
        }
        return;
    }

    // Restore checkout container if it was replaced by empty state
    if (!document.getElementById('cart-items-container')) {
        location.reload(); // Quick restore
        return;
    }

    let subtotal = 0;
    const itemsHtml = state.cart.map(item => {
        const itemSubtotal = item.price * item.quantity;
        subtotal += itemSubtotal;

        return `
            <div class="cart-item-row" data-id="${item.product_id}">
                <img 
                    class="cart-item-img" 
                    src="${escapeHtml(item.image_url)}" 
                    alt="${escapeHtml(item.name)}"
                    onerror="this.onerror=null;this.src='/images/placeholder.svg';"
                >
                <div class="cart-item-details">
                    <div class="cart-item-brand">${escapeHtml(item.brand_name || '')}</div>
                    <div class="cart-item-name">${escapeHtml(item.name)}</div>
                    <div class="cart-item-unit-price tabular-nums">${formatINR(item.price)} each</div>
                </div>
                <div class="cart-qty-ctrl">
                    <button class="cart-qty-btn" onclick="updateCartQuantity(${item.product_id}, -1)" aria-label="Decrease quantity">−</button>
                    <span class="cart-qty-val tabular-nums">${item.quantity}</span>
                    <button class="cart-qty-btn" onclick="updateCartQuantity(${item.product_id}, 1)" aria-label="Increase quantity">+</button>
                </div>
                <div class="cart-item-subtotal tabular-nums">${formatINR(itemSubtotal)}</div>
                <button class="cart-item-remove-btn" onclick="removeFromCart(${item.product_id})" title="Remove item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
    }).join('');

    list.innerHTML = itemsHtml;

    document.getElementById('checkout-subtotal').textContent = formatINR(subtotal);
    document.getElementById('checkout-total').textContent = formatINR(subtotal);

    // Refresh customers in dropdown
    fetchCustomersForCheckout();
}

async function fetchCustomersForCheckout() {
    const select = document.getElementById('checkout-customer-select');
    if (!select) return;

    try {
        state.customers = await apiGet('/api/customers');
        let options = '<option value="">-- Choose Existing Customer or Enter Below --</option>';
        state.customers.forEach(c => {
            options += `<option value="${c.customer_id}">${escapeHtml(c.full_name)} (${escapeHtml(c.city)} - ${escapeHtml(c.email)})</option>`;
        });
        select.innerHTML = options;
    } catch (e) {
        console.warn('Could not populate customer list:', e);
    }
}

// Handle Order Placement (Calls POST /api/orders transactional)
async function handleOrderSubmit(e) {
    e.preventDefault();

    if (state.cart.length === 0) {
        showToast('Your cart is empty.', 'error');
        return;
    }

    const customerSelect = document.getElementById('checkout-customer-select');
    const selectedCustomerId = customerSelect.value ? parseInt(customerSelect.value, 10) : null;

    let payload = {
        items: state.cart.map(i => ({
            product_id: i.product_id,
            quantity: i.quantity
        }))
    };

    if (selectedCustomerId) {
        payload.customer_id = selectedCustomerId;
    } else {
        const fullName = document.getElementById('cust-name').value.trim();
        const email = document.getElementById('cust-email').value.trim();
        const phone = document.getElementById('cust-phone').value.trim();
        const city = document.getElementById('cust-city').value.trim();

        if (!fullName || !email || !phone || !city) {
            showToast('Please fill in all customer details.', 'error');
            return;
        }

        payload.customer = {
            full_name: fullName,
            email: email,
            phone: phone,
            city: city
        };
    }

    const submitBtn = document.getElementById('btn-place-order');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Executing Atomic Transaction...';

    try {
        const orderResponse = await apiPost('/api/orders', payload);
        
        // Clear cart
        state.cart = [];
        saveCartToStorage();

        // Show confirmation screen
        const wrapper = document.getElementById('cart-content-wrapper');
        const successScreen = document.getElementById('order-success-screen');
        if (wrapper && successScreen) {
            wrapper.style.display = 'none';
            successScreen.style.display = 'block';

            document.getElementById('confirm-order-id').textContent = `ORDER #${orderResponse.order_id}`;
            document.getElementById('confirm-order-total').textContent = `Total Billed: ${formatINR(orderResponse.total_amount)}`;
        }

        showToast(`Order #${orderResponse.order_id} recorded successfully!`, 'success');
    } catch (err) {
        console.error('Order placement failed:', err);
        showToast(`Transaction Failed: ${err.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ============================================================================
// ADMIN VIEW & DASHBOARD (VIEW 4)
// ============================================================================
function loadAdminTab(tabId) {
    state.adminActiveTab = tabId;

    // Toggle tab headers
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Toggle tab panels
    document.querySelectorAll('.admin-tab-panel').forEach(panel => {
        panel.style.display = panel.id === tabId ? 'block' : 'none';
    });

    if (tabId === 'tab-dashboard') {
        loadAdminStats();
    } else if (tabId === 'tab-products') {
        loadAdminProducts();
    } else if (tabId === 'tab-orders') {
        loadAdminOrders();
    } else if (tabId === 'tab-customers') {
        loadAdminCustomers();
    }
}

async function loadAdminStats() {
    try {
        const data = await apiGet('/api/stats');
        const summary = data.summary;

        document.getElementById('stat-revenue').textContent = formatINR(summary.total_revenue);
        document.getElementById('stat-orders').textContent = summary.total_orders;
        document.getElementById('stat-pending-orders').textContent = `${summary.pending_orders} pending fulfillment`;
        document.getElementById('stat-products').textContent = summary.total_products;
        document.getElementById('stat-customers').textContent = summary.total_customers;
        document.getElementById('low-stock-count-badge').textContent = `${summary.low_stock_count} SKUs`;

        // Low stock products table
        const lowStockTbody = document.getElementById('low-stock-table-body');
        if (data.low_stock_products.length === 0) {
            lowStockTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">All inventory healthy (stock >= 5)</td></tr>';
        } else {
            lowStockTbody.innerHTML = data.low_stock_products.map(p => `
                <tr>
                    <td><strong>${escapeHtml(p.name)}</strong></td>
                    <td><code>${escapeHtml(p.sku)}</code></td>
                    <td><span class="status-badge badge-cancelled tabular-nums">${p.stock_qty} left</span></td>
                    <td class="tabular-nums">${formatINR(p.price)}</td>
                </tr>
            `).join('');
        }

        // Top 5 selling products table (JOIN & GROUP BY)
        const topTbody = document.getElementById('top-selling-table-body');
        if (data.top_selling_products.length === 0) {
            topTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No sales data available</td></tr>';
        } else {
            topTbody.innerHTML = data.top_selling_products.map(p => `
                <tr>
                    <td><strong>${escapeHtml(p.name)}</strong></td>
                    <td>${escapeHtml(p.brand_name)}</td>
                    <td><span class="status-badge badge-paid tabular-nums">${p.total_sold} units</span></td>
                    <td class="tabular-nums">${formatINR(p.total_revenue)}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Failed to load admin stats:', err);
        showToast('Could not load dashboard metrics: ' + err.message, 'error');
    }
}

async function loadAdminProducts() {
    const tbody = document.getElementById('admin-products-tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading inventory catalog...</td></tr>';

    try {
        const data = await apiGet('/api/products?all=true&include_inactive=true');
        const products = data.products;

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No products in database.</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p => {
            const isInactive = !p.is_active;
            const stockColor = p.stock_qty < 5 ? 'var(--status-cancelled-text)' : 'inherit';

            return `
                <tr style="${isInactive ? 'opacity: 0.6; background-color: #F5F4F0;' : ''}">
                    <td>
                        <strong>${escapeHtml(p.name)}</strong>
                        ${isInactive ? '<span class="status-badge badge-cancelled" style="margin-left: 6px;">Inactive</span>' : ''}
                    </td>
                    <td><code>${escapeHtml(p.sku)}</code></td>
                    <td>${escapeHtml(p.category_name)}</td>
                    <td class="tabular-nums">${formatINR(p.price)}</td>
                    <td class="tabular-nums" style="color: ${stockColor}; font-weight: 600;">${p.stock_qty}</td>
                    <td style="text-align: right; white-space: nowrap;">
                        <button class="btn-secondary" style="height: 30px; padding: 0 10px; margin-right: 6px;" onclick="openEditProductDrawer(${p.product_id})">
                            Edit
                        </button>
                        <button class="btn-danger" style="height: 30px; padding: 0 10px;" onclick="handleDeleteProduct(${p.product_id}, '${escapeHtml(p.name)}')">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
}

async function loadAdminOrders() {
    const tbody = document.getElementById('admin-orders-tbody');
    const statusFilter = document.getElementById('admin-orders-filter-status').value;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading customer orders...</td></tr>';

    try {
        const orders = await apiGet(`/api/orders?status=${statusFilter}`);
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No orders recorded.</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(o => {
            const badgeClass = `badge-${o.status}`;

            return `
                <tr>
                    <td><strong>#${o.order_id}</strong></td>
                    <td>
                        <div>${escapeHtml(o.customer_name)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(o.customer_city)}</div>
                    </td>
                    <td>${formatDate(o.order_date)}</td>
                    <td>
                        <select 
                            class="custom-select" 
                            style="height: 28px; font-weight: 600;" 
                            onchange="handleOrderStatusChange(${o.order_id}, this.value)"
                        >
                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="paid" ${o.status === 'paid' ? 'selected' : ''}>Paid</option>
                            <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                    <td class="tabular-nums">${o.item_count} items</td>
                    <td class="tabular-nums" style="font-weight: 700;">${formatINR(o.total_amount)}</td>
                    <td style="text-align: right;">
                        <button class="btn-secondary" style="height: 30px; padding: 0 10px;" onclick="openOrderDetailModal(${o.order_id})">
                            View Items
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
}

async function handleOrderStatusChange(orderId, newStatus) {
    try {
        await apiPatch(`/api/orders/${orderId}/status`, { status: newStatus });
        showToast(`Order #${orderId} marked as ${newStatus}`, 'success');
        loadAdminOrders();
    } catch (err) {
        showToast(`Failed to update status: ${err.message}`, 'error');
        loadAdminOrders();
    }
}

async function openOrderDetailModal(orderId) {
    const modal = document.getElementById('modal-order-detail');
    const content = document.getElementById('modal-order-detail-content');
    modal.classList.add('open');
    content.innerHTML = '<div style="text-align: center; padding: 20px;">Fetching order details...</div>';

    try {
        const order = await apiGet(`/api/orders/${orderId}`);
        content.innerHTML = `
            <div style="border-bottom: 1px solid var(--border-light); padding-bottom: 16px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>Order #${order.order_id}</h3>
                    <span class="status-badge badge-${order.status}">${order.status}</span>
                </div>
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 4px;">
                    Placed on ${formatDate(order.order_date)}
                </div>
                <div style="margin-top: 12px; font-size: 0.875rem;">
                    <strong>Customer:</strong> ${escapeHtml(order.customer_name)} (${escapeHtml(order.customer_email)}, ${escapeHtml(order.customer_phone)}, ${escapeHtml(order.customer_city)})
                </div>
            </div>

            <h4 style="margin-bottom: 12px;">Purchased Items</h4>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td><strong>${escapeHtml(item.product_name)}</strong></td>
                                <td><code>${escapeHtml(item.sku)}</code></td>
                                <td class="tabular-nums">${item.quantity}</td>
                                <td class="tabular-nums">${formatINR(item.unit_price)}</td>
                                <td class="tabular-nums" style="font-weight: 600;">${formatINR(item.line_total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 20px; font-size: 1.125rem; font-weight: 700;">
                <span>Total Amount: &nbsp;</span>
                <span class="tabular-nums">${formatINR(order.total_amount)}</span>
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div style="color: red; text-align: center;">Error loading order: ${escapeHtml(err.message)}</div>`;
    }
}

async function loadAdminCustomers() {
    const tbody = document.getElementById('admin-customers-tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading customer directory...</td></tr>';

    try {
        state.customers = await apiGet('/api/customers');
        if (state.customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No registered customers found.</td></tr>';
            return;
        }

        tbody.innerHTML = state.customers.map(c => `
            <tr>
                <td><strong>${escapeHtml(c.full_name)}</strong></td>
                <td>${escapeHtml(c.email)}</td>
                <td>${escapeHtml(c.phone)}</td>
                <td>${escapeHtml(c.city)}</td>
                <td class="tabular-nums">${c.total_orders}</td>
                <td class="tabular-nums" style="font-weight: 600;">${formatINR(c.lifetime_spent)}</td>
                <td style="text-align: right;">
                    <button class="btn-secondary" style="height: 30px; padding: 0 10px;" onclick="openEditCustomerModal(${c.customer_id})">
                        Edit
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
}

// ============================================================================
// PRODUCT CRUD (DRAWER)
// ============================================================================
function populateCategorySelects() {
    const select = document.getElementById('prod-category');
    if (!select) return;
    select.innerHTML = state.categories.map(c => `<option value="${c.category_id}">${escapeHtml(c.name)}</option>`).join('');
}

function populateBrandSelects() {
    const select = document.getElementById('prod-brand');
    if (!select) return;
    select.innerHTML = state.brands.map(b => `<option value="${b.brand_id}">${escapeHtml(b.name)} (${escapeHtml(b.country)})</option>`).join('');
}

function populateSupplierSelects() {
    const select = document.getElementById('prod-supplier');
    if (!select) return;
    let html = '<option value="">-- No Direct Supplier --</option>';
    html += state.suppliers.map(s => `<option value="${s.supplier_id}">${escapeHtml(s.name)}</option>`).join('');
    select.innerHTML = html;
}

function openCreateProductDrawer() {
    document.getElementById('drawer-product-title').textContent = 'Add New Hardware Product';
    document.getElementById('prod-edit-id').value = '';
    document.getElementById('prod-name').value = '';
    document.getElementById('prod-sku').value = '';
    document.getElementById('prod-price').value = '';
    document.getElementById('prod-stock').value = '10';
    document.getElementById('prod-image').value = '';
    document.getElementById('prod-desc').value = '';
    document.getElementById('prod-active').checked = true;

    populateCategorySelects();
    populateBrandSelects();
    populateSupplierSelects();

    document.getElementById('drawer-product-form').classList.add('open');
}

async function openEditProductDrawer(productId) {
    document.getElementById('drawer-product-title').textContent = 'Edit Product Specifications';
    document.getElementById('drawer-product-form').classList.add('open');

    try {
        const p = await apiGet(`/api/products/${productId}`);
        document.getElementById('prod-edit-id').value = p.product_id;
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-sku').value = p.sku;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-stock').value = p.stock_qty;
        document.getElementById('prod-image').value = p.image_url || '';
        document.getElementById('prod-desc').value = p.description || '';
        document.getElementById('prod-active').checked = Boolean(p.is_active);

        populateCategorySelects();
        populateBrandSelects();
        populateSupplierSelects();

        document.getElementById('prod-category').value = p.category_id;
        document.getElementById('prod-brand').value = p.brand_id;
        if (p.supplier_id) document.getElementById('prod-supplier').value = p.supplier_id;
    } catch (err) {
        showToast('Failed to load product: ' + err.message, 'error');
        document.getElementById('drawer-product-form').classList.remove('open');
    }
}

async function handleSaveProduct() {
    const editId = document.getElementById('prod-edit-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const sku = document.getElementById('prod-sku').value.trim();
    const category_id = parseInt(document.getElementById('prod-category').value, 10);
    const brand_id = parseInt(document.getElementById('prod-brand').value, 10);
    const supplier_id = document.getElementById('prod-supplier').value ? parseInt(document.getElementById('prod-supplier').value, 10) : null;
    const price = parseFloat(document.getElementById('prod-price').value);
    const stock_qty = parseInt(document.getElementById('prod-stock').value, 10);
    const image_url = document.getElementById('prod-image').value.trim();
    const description = document.getElementById('prod-desc').value.trim();
    const is_active = document.getElementById('prod-active').checked;

    if (!name || !sku || isNaN(price) || isNaN(stock_qty)) {
        showToast('Please fill all required product fields correctly.', 'error');
        return;
    }

    const payload = {
        name,
        sku,
        category_id,
        brand_id,
        supplier_id,
        price,
        stock_qty,
        image_url,
        description,
        is_active
    };

    try {
        if (editId) {
            await apiPut(`/api/products/${editId}`, payload);
            showToast('Product updated successfully', 'success');
        } else {
            await apiPost('/api/products', payload);
            showToast('Product created successfully', 'success');
        }

        document.getElementById('drawer-product-form').classList.remove('open');
        loadAdminProducts();
        fetchProducts(); // Refresh shop catalog
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleDeleteProduct(productId, productName) {
    if (!confirm(`Are you sure you want to delete "${productName}"?\nNote: If this product exists in customer order history, it will be automatically soft-deleted to maintain database referential integrity.`)) {
        return;
    }

    try {
        const res = await apiDelete(`/api/products/${productId}`);
        showToast(res.message, res.soft_deleted ? 'info' : 'success');
        loadAdminProducts();
        fetchProducts();
    } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
    }
}

// ============================================================================
// CUSTOMER CRUD (MODAL)
// ============================================================================
function openCreateCustomerModal() {
    document.getElementById('modal-customer-title').textContent = 'Add Customer Profile';
    document.getElementById('cust-edit-id').value = '';
    document.getElementById('cust-form-name').value = '';
    document.getElementById('cust-form-email').value = '';
    document.getElementById('cust-form-phone').value = '';
    document.getElementById('cust-form-city').value = '';
    document.getElementById('modal-customer-form').classList.add('open');
}

function openEditCustomerModal(customerId) {
    const cust = state.customers.find(c => c.customer_id === customerId);
    if (!cust) return;

    document.getElementById('modal-customer-title').textContent = 'Edit Customer Profile';
    document.getElementById('cust-edit-id').value = cust.customer_id;
    document.getElementById('cust-form-name').value = cust.full_name;
    document.getElementById('cust-form-email').value = cust.email;
    document.getElementById('cust-form-phone').value = cust.phone;
    document.getElementById('cust-form-city').value = cust.city;
    document.getElementById('modal-customer-form').classList.add('open');
}

async function handleSaveCustomer(e) {
    e.preventDefault();
    const editId = document.getElementById('cust-edit-id').value;
    const full_name = document.getElementById('cust-form-name').value.trim();
    const email = document.getElementById('cust-form-email').value.trim();
    const phone = document.getElementById('cust-form-phone').value.trim();
    const city = document.getElementById('cust-form-city').value.trim();

    const payload = { full_name, email, phone, city };

    try {
        if (editId) {
            await apiPut(`/api/customers/${editId}`, payload);
            showToast('Customer profile updated', 'success');
        } else {
            await apiPost('/api/customers', payload);
            showToast('Customer registered successfully', 'success');
        }

        document.getElementById('modal-customer-form').classList.remove('open');
        loadAdminCustomers();
        fetchCustomersForCheckout();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============================================================================
// INITIALIZATION & EVENT LISTENERS
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadCartFromStorage();

    // Top Navigation Listeners
    document.getElementById('nav-logo').addEventListener('click', () => switchView('shop'));
    document.getElementById('nav-btn-shop').addEventListener('click', () => switchView('shop'));
    document.getElementById('nav-btn-admin').addEventListener('click', () => switchView('admin'));
    document.getElementById('header-cart-btn').addEventListener('click', () => switchView('cart'));

    // Cart return buttons
    const backBtn = document.getElementById('btn-back-to-shop');
    if (backBtn) backBtn.addEventListener('click', () => switchView('shop'));
    const adminToShopBtn = document.getElementById('btn-admin-to-shop');
    if (adminToShopBtn) adminToShopBtn.addEventListener('click', () => switchView('shop'));
    const confirmShopBtn = document.getElementById('btn-confirm-continue');
    if (confirmShopBtn) confirmShopBtn.addEventListener('click', () => switchView('shop'));
    const confirmAdminBtn = document.getElementById('btn-confirm-admin');
    if (confirmAdminBtn) confirmAdminBtn.addEventListener('click', () => {
        switchView('admin');
        loadAdminTab('tab-orders');
    });

    // Global Search Input with debounce
    let searchDebounceTimer;
    const searchInput = document.getElementById('global-search-input');
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            state.search = e.target.value.trim();
            state.page = 1;
            if (state.currentView !== 'shop') switchView('shop');
            fetchProducts();
        }, 280);
    });

    // Brand and Sort Filters
    document.getElementById('filter-brand').addEventListener('change', (e) => {
        state.brand = e.target.value;
        state.page = 1;
        fetchProducts();
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
        state.sort = e.target.value;
        state.page = 1;
        fetchProducts();
    });

    // Checkout Customer Select Change
    const custSelect = document.getElementById('checkout-customer-select');
    custSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const newFields = document.getElementById('new-customer-fields');
        if (val) {
            newFields.style.opacity = '0.4';
            newFields.querySelectorAll('input').forEach(inp => inp.required = false);
        } else {
            newFields.style.opacity = '1';
            newFields.querySelectorAll('input').forEach(inp => inp.required = true);
        }
    });

    // Checkout Form Submit
    document.getElementById('checkout-form').addEventListener('submit', handleOrderSubmit);

    // Admin Tabs
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            loadAdminTab(btn.getAttribute('data-tab'));
        });
    });

    // Admin Filter Orders
    document.getElementById('admin-orders-filter-status').addEventListener('change', loadAdminOrders);

    // Product Modal & Drawer Listeners
    document.getElementById('btn-close-detail-modal').addEventListener('click', () => {
        document.getElementById('modal-product-detail').classList.remove('open');
    });

    document.getElementById('btn-close-order-modal').addEventListener('click', () => {
        document.getElementById('modal-order-detail').classList.remove('open');
    });

    document.getElementById('btn-open-create-product').addEventListener('click', openCreateProductDrawer);
    document.getElementById('btn-close-product-drawer').addEventListener('click', () => {
        document.getElementById('drawer-product-form').classList.remove('open');
    });
    document.getElementById('btn-cancel-product').addEventListener('click', () => {
        document.getElementById('drawer-product-form').classList.remove('open');
    });
    document.getElementById('btn-save-product').addEventListener('click', handleSaveProduct);

    // Customer Modal Listeners
    document.getElementById('btn-open-create-customer').addEventListener('click', openCreateCustomerModal);
    document.getElementById('btn-close-customer-modal').addEventListener('click', () => {
        document.getElementById('modal-customer-form').classList.remove('open');
    });
    document.getElementById('btn-cancel-customer').addEventListener('click', () => {
        document.getElementById('modal-customer-form').classList.remove('open');
    });
    document.getElementById('form-customer').addEventListener('submit', handleSaveCustomer);

    // Close Modals on backdrop click or Escape key
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('open');
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
            document.getElementById('drawer-product-form').classList.remove('open');
        }
    });

    // Load initial metadata and shop
    fetchCategories();
    fetchBrands();
    fetchSuppliers();
    fetchProducts();
});
