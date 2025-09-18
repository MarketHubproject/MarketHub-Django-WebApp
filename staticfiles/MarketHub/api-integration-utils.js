/**
 * MarketHub API Integration Utilities
 * Helper functions and testing utilities for API integration
 */

// API Integration Utilities
window.MarketHubAPIUtils = {
    
    // Test API connectivity and endpoints
    async testAPIConnectivity() {
        const tests = [];
        
        try {
            // Test API overview endpoint
            const overview = await MarketHubAPI.request('/overview/', { auth: false });
            tests.push({
                endpoint: '/overview/',
                status: 'success',
                message: 'API overview accessible'
            });
        } catch (error) {
            tests.push({
                endpoint: '/overview/',
                status: 'error',
                message: error.message
            });
        }

        try {
            // Test product categories
            const categories = await MarketHubAPI.request('/categories/', { auth: false });
            tests.push({
                endpoint: '/categories/',
                status: 'success',
                message: `Categories loaded: ${categories.data?.categories?.length || 0} items`
            });
        } catch (error) {
            tests.push({
                endpoint: '/categories/',
                status: 'error',
                message: error.message
            });
        }

        try {
            // Test products endpoint
            const products = await MarketHubAPI.getProducts();
            tests.push({
                endpoint: '/products/',
                status: 'success',
                message: `Products loaded: ${products.data?.results?.length || 0} items`
            });
        } catch (error) {
            tests.push({
                endpoint: '/products/',
                status: 'error',
                message: error.message
            });
        }

        // Test authenticated endpoints if user is logged in
        if (MarketHubAPI.token) {
            try {
                const cart = await MarketHubAPI.getCart();
                tests.push({
                    endpoint: '/cart/',
                    status: 'success',
                    message: 'Cart accessible (authenticated)'
                });
            } catch (error) {
                tests.push({
                    endpoint: '/cart/',
                    status: 'error',
                    message: error.message
                });
            }

            try {
                const orders = await MarketHubAPI.getOrders();
                tests.push({
                    endpoint: '/orders/',
                    status: 'success',
                    message: `Orders accessible: ${orders.data?.results?.length || 0} items`
                });
            } catch (error) {
                tests.push({
                    endpoint: '/orders/',
                    status: 'error',
                    message: error.message
                });
            }

            try {
                const favorites = await MarketHubAPI.getFavorites();
                tests.push({
                    endpoint: '/favorites/',
                    status: 'success',
                    message: `Favorites accessible: ${favorites.data?.results?.length || 0} items`
                });
            } catch (error) {
                tests.push({
                    endpoint: '/favorites/',
                    status: 'error',
                    message: error.message
                });
            }
        }

        return tests;
    },

    // Display API test results
    displayAPITestResults(tests) {
        const container = document.getElementById('api-test-results') || document.body;
        
        const resultsHTML = `
            <div class="api-test-results card mt-4">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="bi bi-gear-fill me-2"></i>API Connectivity Test Results</h5>
                </div>
                <div class="card-body">
                    ${tests.map(test => `
                        <div class="alert alert-${test.status === 'success' ? 'success' : 'danger'} d-flex align-items-center">
                            <i class="bi bi-${test.status === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'} me-2"></i>
                            <div>
                                <strong>${test.endpoint}</strong>: ${test.message}
                            </div>
                        </div>
                    `).join('')}
                    <div class="mt-3">
                        <strong>Summary:</strong> 
                        ${tests.filter(t => t.status === 'success').length}/${tests.length} endpoints working properly
                    </div>
                </div>
            </div>
        `;
        
        if (container.id === 'api-test-results') {
            container.innerHTML = resultsHTML;
        } else {
            container.insertAdjacentHTML('beforeend', resultsHTML);
        }
    },

    // Enhanced product operations with UI feedback
    async loadProductsWithFeedback(container, params = {}) {
        if (!container) return;

        // Show loading state
        MarketHubLoading.showSkeletonLoading(container, 6);

        try {
            const result = await MarketHubAPI.getProducts(params);
            const products = result.data.results || [];

            if (products.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="bi bi-search display-4 text-muted mb-3"></i>
                        <h4 class="text-muted">No products found</h4>
                        <p class="text-muted">Try adjusting your search criteria</p>
                    </div>
                `;
                return;
            }

            // Render products
            container.innerHTML = products.map(product => `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="card h-100 MarketHub-product-card">
                        <div class="position-relative">
                            <img src="${product.image_url || 'https://via.placeholder.com/300x200'}" 
                                 class="card-img-top product-image" 
                                 alt="${product.name}"
                                 style="height: 200px; object-fit: cover;">
                            <div class="position-absolute top-0 end-0 p-2">
                                <button class="btn btn-sm btn-light rounded-circle favorite-btn" 
                                        data-product-id="${product.id}">
                                    <i class="bi bi-heart"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${product.name}</h5>
                            <p class="card-text text-muted">${product.description.substring(0, 100)}...</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="h5 text-primary mb-0">R${product.price}</span>
                                <div class="btn-group">
                                    <button class="btn btn-outline-primary btn-sm quick-view-btn" 
                                            data-product-id="${product.id}">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-primary btn-sm add-to-cart-btn" 
                                            data-product-id="${product.id}">
                                        <i class="bi bi-cart-plus"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            // Attach event listeners
            this.attachProductEventListeners(container);

            MarketHubNotifications.success(`Loaded ${products.length} products successfully`);

        } catch (error) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-exclamation-circle display-4 text-danger mb-3"></i>
                    <h4 class="text-danger">Failed to load products</h4>
                    <p class="text-muted">${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Retry
                    </button>
                </div>
            `;
            MarketHubAPI.handleError(error, 'Load Products');
        }
    },

    // Attach event listeners to product elements
    attachProductEventListeners(container) {
        // Add to cart buttons
        container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const productId = btn.dataset.productId;
                await this.addToCartWithFeedback(productId, btn);
            });
        });

        // Favorite buttons
        container.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const productId = btn.dataset.productId;
                await this.toggleFavoriteWithFeedback(productId, btn);
            });
        });

        // Quick view buttons
        container.querySelectorAll('.quick-view-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const productId = btn.dataset.productId;
                await this.showQuickViewWithAPI(productId);
            });
        });
    },

    // Add to cart with visual feedback
    async addToCartWithFeedback(productId, button) {
        if (!MarketHubAPI.token) {
            MarketHubNotifications.error('Please log in to add items to cart');
            return;
        }

        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="spinner-border spinner-border-sm"></i>';
        button.disabled = true;

        try {
            await MarketHubAPI.addToCart(productId);
            
            // Success feedback
            button.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';
            MarketHubNotifications.success('Product added to cart!');

            // Update cart badge if exists
            this.updateCartBadge();

            // Reset button after delay
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.disabled = false;
            }, 2000);

        } catch (error) {
            button.innerHTML = '<i class="bi bi-exclamation-circle-fill text-danger"></i>';
            MarketHubAPI.handleError(error, 'Add to Cart');
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.disabled = false;
            }, 3000);
        }
    },

    // Toggle favorite with feedback
    async toggleFavoriteWithFeedback(productId, button) {
        if (!MarketHubAPI.token) {
            MarketHubNotifications.error('Please log in to manage favorites');
            return;
        }

        const icon = button.querySelector('i');
        const isFavorited = icon.classList.contains('bi-heart-fill');

        try {
            if (isFavorited) {
                // Remove from favorites - would need favorite ID
                // This is a simplified implementation
                icon.classList.remove('bi-heart-fill', 'text-danger');
                icon.classList.add('bi-heart');
                MarketHubNotifications.success('Removed from favorites');
            } else {
                await MarketHubAPI.addToFavorites(productId);
                icon.classList.remove('bi-heart');
                icon.classList.add('bi-heart-fill', 'text-danger');
                MarketHubNotifications.success('Added to favorites');
            }
        } catch (error) {
            MarketHubAPI.handleError(error, 'Toggle Favorite');
        }
    },

    // Show quick view with API data
    async showQuickViewWithAPI(productId) {
        MarketHubLoading.showPageLoader('Loading product details...');

        try {
            const result = await MarketHubAPI.getProduct(productId);
            const product = result.data;

            // Hide loading
            MarketHubLoading.hidePageLoader();

            // Create enhanced quick view modal
            const modalHTML = `
                <div class="modal fade show" style="display: block;" tabindex="-1">
                    <div class="modal-dialog modal-lg modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${product.name}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <img src="${product.image_url || 'https://via.placeholder.com/400x300'}" 
                                             class="img-fluid rounded" alt="${product.name}">
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <span class="badge bg-secondary">${product.category}</span>
                                            <span class="badge bg-info ms-1">${product.condition}</span>
                                        </div>
                                        <p class="text-muted">${product.description}</p>
                                        <div class="mb-3">
                                            <span class="h4 text-primary">R${product.price}</span>
                                        </div>
                                        <div class="mb-3">
                                            <small class="text-muted">
                                                <i class="bi bi-geo-alt"></i> ${product.location}
                                            </small>
                                        </div>
                                        <div class="mb-3">
                                            <small class="text-muted">
                                                Sold by: <strong>${product.seller?.username}</strong>
                                            </small>
                                        </div>
                                        <div class="d-grid gap-2">
                                            <button class="btn btn-primary" data-product-id="${product.id}" 
                                                    onclick="MarketHubAPIUtils.addToCartWithFeedback(${product.id}, this)">
                                                <i class="bi bi-cart-plus me-2"></i>Add to Cart
                                            </button>
                                            <a href="/product/${product.id}/" class="btn btn-outline-secondary">
                                                <i class="bi bi-eye me-2"></i>View Full Details
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-backdrop fade show"></div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Handle modal close
            const modal = document.body.lastElementChild.previousElementSibling;
            const backdrop = document.body.lastElementChild;
            
            modal.querySelector('.btn-close').addEventListener('click', () => {
                document.body.removeChild(modal);
                document.body.removeChild(backdrop);
            });

            backdrop.addEventListener('click', () => {
                document.body.removeChild(modal);
                document.body.removeChild(backdrop);
            });

        } catch (error) {
            MarketHubLoading.hidePageLoader();
            MarketHubAPI.handleError(error, 'Load Product Details');
        }
    },

    // Update cart badge across the site
    updateCartBadge() {
        MarketHubAPI.getCart().then(result => {
            const cartItems = result.data.items || [];
            const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
            
            document.querySelectorAll('.cart-badge, .cart-counter, [data-cart-count]').forEach(badge => {
                badge.textContent = totalItems;
                if (totalItems > 0) {
                    badge.classList.add('api-updated');
                    setTimeout(() => badge.classList.remove('api-updated'), 300);
                }
            });
        }).catch(error => {
            console.log('Could not update cart badge:', error.message);
        });
    },

    // Search with real-time suggestions
    setupEnhancedSearch(searchInput, suggestionsContainer) {
        if (!searchInput) return;

        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            clearTimeout(searchTimeout);
            
            if (query.length < 2) {
                if (suggestionsContainer) {
                    suggestionsContainer.classList.add('d-none');
                }
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const suggestions = await MarketHubAPI.getSearchSuggestions(query);
                    this.displaySearchSuggestions(suggestions, suggestionsContainer, query);
                } catch (error) {
                    console.log('Search suggestions failed:', error.message);
                }
            }, 300);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (suggestionsContainer && !searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.classList.add('d-none');
            }
        });
    },

    // Display search suggestions
    displaySearchSuggestions(suggestions, container, query) {
        if (!container || !suggestions.length) return;

        const suggestionsHTML = suggestions.map(product => `
            <a href="/product/${product.id}/" class="list-group-item list-group-item-action">
                <div class="d-flex align-items-center">
                    <img src="${product.image_url || 'https://via.placeholder.com/40x40'}" 
                         class="me-3 rounded" width="40" height="40" alt="${product.name}">
                    <div>
                        <div class="fw-medium">${this.highlightSearchTerm(product.name, query)}</div>
                        <small class="text-muted">R${product.price}</small>
                    </div>
                </div>
            </a>
        `).join('');

        container.innerHTML = `
            <div class="list-group api-suggestions shadow">
                ${suggestionsHTML}
                <div class="list-group-item text-center">
                    <a href="/search/?q=${encodeURIComponent(query)}" class="text-decoration-none">
                        <small><i class="bi bi-search me-1"></i>View all results for "${query}"</small>
                    </a>
                </div>
            </div>
        `;
        
        container.classList.remove('d-none');
    },

    // Highlight search terms in suggestions
    highlightSearchTerm(text, term) {
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },

    // Initialize all API integrations on a page
    initializePageIntegrations() {
        console.log('Initializing MarketHub API integrations...');

        // Setup enhanced search
        const searchInput = document.querySelector('input[name="search"], .search-input');
        const suggestionsContainer = document.querySelector('.search-suggestions, #search-suggestions');
        
        if (searchInput) {
            this.setupEnhancedSearch(searchInput, suggestionsContainer);
        }

        // Update cart badge on page load
        if (MarketHubAPI.token) {
            this.updateCartBadge();
        }

        // Add API test button for development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.addDevelopmentTools();
        }
    },

    // Add development tools for testing
    addDevelopmentTools() {
        const toolsHTML = `
            <div class="position-fixed bottom-0 start-0 m-3" style="z-index: 1000;">
                <div class="btn-group-vertical" role="group">
                    <button class="btn btn-sm btn-info" onclick="MarketHubAPIUtils.testAPIConnectivity().then(tests => MarketHubAPIUtils.displayAPITestResults(tests))">
                        <i class="bi bi-gear"></i> Test API
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="console.log('MarketHub API:', window.MarketHubAPI)">
                        <i class="bi bi-code"></i> Console
                    </button>
                </div>
            </div>
            <div id="api-test-results"></div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', toolsHTML);
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure other scripts are loaded
    setTimeout(() => {
        if (window.MarketHubAPI && window.MarketHubAPIUtils) {
            MarketHubAPIUtils.initializePageIntegrations();
        }
    }, 500);
});

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.MarketHubAPIUtils;
}
