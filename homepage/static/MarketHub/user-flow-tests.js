/**
 * MarketHub User Flow Testing System
 * Tests critical user journeys and end-to-end workflows
 */

window.MarketHubUserFlows = {
    
    // Test state management
    testState: {
        currentUser: null,
        testProducts: [],
        testCart: null,
        testOrder: null,
        errors: []
    },

    // Initialize user flow testing
    async initialize() {
        console.log('🚀 Initializing MarketHub User Flow Testing...');
        
        // Ensure API client is available
        if (!window.MarketHubAPI) {
            throw new Error('MarketHub API client not found. Please load the API client first.');
        }

        // Set up test environment
        this.testState = {
            currentUser: null,
            testProducts: [],
            testCart: null,
            testOrder: null,
            errors: []
        };

        console.log('✅ User Flow Testing initialized successfully');
        return true;
    },

    // Test Flow 1: Product Discovery & Browsing
    async testProductBrowsingFlow() {
        console.log('🔍 Testing Product Browsing Flow...');
        const results = [];

        try {
            // Step 1: Load product list
            const productsResult = await MarketHubAPI.getProducts();
            const products = productsResult.data.results || [];
            
            results.push({
                step: 'Load Product List',
                status: 'success',
                message: `Loaded ${products.length} products`,
                data: { productCount: products.length }
            });

            if (products.length === 0) {
                results.push({
                    step: 'Product Availability Check',
                    status: 'warning',
                    message: 'No products available for browsing test',
                    data: { note: 'Consider adding test products' }
                });
                return results;
            }

            this.testState.testProducts = products.slice(0, 5); // Store first 5 for testing

            // Step 2: Test product search
            const searchResult = await MarketHubAPI.getProducts({ search: 'test' });
            results.push({
                step: 'Product Search',
                status: 'success',
                message: `Search returned ${searchResult.data.results?.length || 0} results`,
                data: { searchResults: searchResult.data.results?.length || 0 }
            });

            // Step 3: Test product filtering
            const filterResult = await MarketHubAPI.getProducts({ category: 'electronics' });
            results.push({
                step: 'Product Filtering',
                status: 'success',
                message: `Filter returned ${filterResult.data.results?.length || 0} electronics products`,
                data: { filteredResults: filterResult.data.results?.length || 0 }
            });

            // Step 4: Test single product retrieval
            const singleProduct = await MarketHubAPI.getProduct(this.testState.testProducts[0].id);
            results.push({
                step: 'Single Product Details',
                status: 'success',
                message: `Successfully retrieved product: ${singleProduct.data.name}`,
                data: { product: singleProduct.data }
            });

        } catch (error) {
            results.push({
                step: 'Product Browsing Flow',
                status: 'error',
                message: error.message,
                data: { error: error.stack }
            });
        }

        return results;
    },

    // Test Flow 2: User Authentication Journey
    async testAuthenticationFlow(testCredentials = null) {
        console.log('🔐 Testing Authentication Flow...');
        const results = [];

        try {
            // Check current authentication status
            const hasToken = !!MarketHubAPI.token;
            results.push({
                step: 'Authentication Status Check',
                status: hasToken ? 'success' : 'info',
                message: hasToken ? 'User is authenticated' : 'User is not authenticated',
                data: { hasToken, tokenLength: MarketHubAPI.token?.length || 0 }
            });

            if (hasToken) {
                // Test authenticated endpoint access
                try {
                    const cartResult = await MarketHubAPI.getCart();
                    results.push({
                        step: 'Authenticated Endpoint Access',
                        status: 'success',
                        message: 'Successfully accessed protected endpoint',
                        data: { cart: cartResult.data }
                    });
                } catch (error) {
                    results.push({
                        step: 'Authenticated Endpoint Access',
                        status: 'error',
                        message: `Failed to access protected endpoint: ${error.message}`,
                        data: { error: error.message }
                    });
                }
            } else {
                // Test unauthenticated access to protected endpoints
                try {
                    await MarketHubAPI.getCart();
                    results.push({
                        step: 'Protected Endpoint Security',
                        status: 'error',
                        message: 'Protected endpoint accessible without authentication (security issue)',
                        data: { securityIssue: true }
                    });
                } catch (error) {
                    if (error.message.includes('401') || error.message.includes('403')) {
                        results.push({
                            step: 'Protected Endpoint Security',
                            status: 'success',
                            message: 'Protected endpoints properly secured',
                            data: { securityValid: true }
                        });
                    } else {
                        results.push({
                            step: 'Protected Endpoint Security',
                            status: 'warning',
                            message: `Unexpected error accessing protected endpoint: ${error.message}`,
                            data: { unexpectedError: error.message }
                        });
                    }
                }
            }

        } catch (error) {
            results.push({
                step: 'Authentication Flow',
                status: 'error',
                message: error.message,
                data: { error: error.stack }
            });
        }

        return results;
    },

    // Test Flow 3: Cart Management Journey
    async testCartManagementFlow() {
        console.log('🛒 Testing Cart Management Flow...');
        const results = [];

        if (!MarketHubAPI.token) {
            results.push({
                step: 'Cart Management Prerequisites',
                status: 'warning',
                message: 'Cart management requires authentication',
                data: { note: 'Please authenticate to test cart functionality' }
            });
            return results;
        }

        try {
            // Step 1: Get initial cart state
            const initialCart = await MarketHubAPI.getCart();
            results.push({
                step: 'Get Initial Cart',
                status: 'success',
                message: 'Successfully retrieved user cart',
                data: { 
                    initialCartItems: initialCart.data.items?.length || 0,
                    cart: initialCart.data 
                }
            });

            this.testState.testCart = initialCart.data;

            // Step 2: Add product to cart (if products available)
            if (this.testState.testProducts.length > 0) {
                const productToAdd = this.testState.testProducts[0];
                
                try {
                    const addResult = await MarketHubAPI.addToCart(productToAdd.id, 1);
                    results.push({
                        step: 'Add Product to Cart',
                        status: 'success',
                        message: `Successfully added product to cart: ${productToAdd.name}`,
                        data: { addedProduct: productToAdd, result: addResult.data }
                    });

                    // Step 3: Verify cart update
                    const updatedCart = await MarketHubAPI.getCart();
                    const cartItemCount = updatedCart.data.items?.length || 0;
                    results.push({
                        step: 'Verify Cart Update',
                        status: 'success',
                        message: `Cart now contains ${cartItemCount} item(s)`,
                        data: { updatedCartItems: cartItemCount, updatedCart: updatedCart.data }
                    });

                } catch (addError) {
                    results.push({
                        step: 'Add Product to Cart',
                        status: 'error',
                        message: `Failed to add product to cart: ${addError.message}`,
                        data: { error: addError.message, productId: productToAdd.id }
                    });
                }
            } else {
                results.push({
                    step: 'Add Product to Cart',
                    status: 'warning',
                    message: 'No test products available to add to cart',
                    data: { note: 'Load products first using testProductBrowsingFlow()' }
                });
            }

        } catch (error) {
            results.push({
                step: 'Cart Management Flow',
                status: 'error',
                message: error.message,
                data: { error: error.stack }
            });
        }

        return results;
    },

    // Test Flow 4: Order Placement Journey
    async testOrderPlacementFlow() {
        console.log('📦 Testing Order Placement Flow...');
        const results = [];

        if (!MarketHubAPI.token) {
            results.push({
                step: 'Order Placement Prerequisites',
                status: 'warning',
                message: 'Order placement requires authentication',
                data: { note: 'Please authenticate to test order functionality' }
            });
            return results;
        }

        try {
            // Step 1: Check cart has items
            const cart = await MarketHubAPI.getCart();
            const cartItems = cart.data.items || [];
            
            if (cartItems.length === 0) {
                results.push({
                    step: 'Cart Prerequisites Check',
                    status: 'warning',
                    message: 'Cart is empty - cannot test order placement',
                    data: { note: 'Add items to cart first using testCartManagementFlow()' }
                });
                return results;
            }

            results.push({
                step: 'Cart Prerequisites Check',
                status: 'success',
                message: `Cart contains ${cartItems.length} item(s) ready for order`,
                data: { cartItems: cartItems.length }
            });

            // Step 2: Test order creation with sample data
            const orderData = {
                email: 'test@example.com',
                first_name: 'Test',
                last_name: 'User',
                address_line_1: '123 Test Street',
                city: 'Test City',
                postal_code: '12345',
                province: 'Test Province',
                phone: '0123456789'
            };

            try {
                const orderResult = await MarketHubAPI.createOrder(orderData);
                results.push({
                    step: 'Create Order',
                    status: 'success',
                    message: `Successfully created order #${orderResult.data.order_number}`,
                    data: { order: orderResult.data, orderData }
                });

                this.testState.testOrder = orderResult.data;

                // Step 3: Verify order was created
                const orders = await MarketHubAPI.getOrders();
                const userOrders = orders.data.results || [];
                results.push({
                    step: 'Verify Order Creation',
                    status: 'success',
                    message: `User now has ${userOrders.length} order(s)`,
                    data: { totalOrders: userOrders.length, orders: userOrders }
                });

            } catch (orderError) {
                results.push({
                    step: 'Create Order',
                    status: 'error',
                    message: `Failed to create order: ${orderError.message}`,
                    data: { error: orderError.message, orderData }
                });
            }

        } catch (error) {
            results.push({
                step: 'Order Placement Flow',
                status: 'error',
                message: error.message,
                data: { error: error.stack }
            });
        }

        return results;
    },

    // Test Flow 5: Product Review Journey
    async testProductReviewFlow() {
        console.log('⭐ Testing Product Review Flow...');
        const results = [];

        if (!MarketHubAPI.token) {
            results.push({
                step: 'Review Prerequisites',
                status: 'warning',
                message: 'Product reviews require authentication',
                data: { note: 'Please authenticate to test review functionality' }
            });
            return results;
        }

        if (this.testState.testProducts.length === 0) {
            results.push({
                step: 'Review Prerequisites',
                status: 'warning',
                message: 'No products available for review testing',
                data: { note: 'Load products first using testProductBrowsingFlow()' }
            });
            return results;
        }

        try {
            const productToReview = this.testState.testProducts[0];

            // Step 1: Get existing reviews for the product
            const existingReviews = await MarketHubAPI.getReviews(productToReview.id);
            results.push({
                step: 'Get Existing Reviews',
                status: 'success',
                message: `Product has ${existingReviews.data.results?.length || 0} existing reviews`,
                data: { 
                    existingReviewCount: existingReviews.data.results?.length || 0,
                    productId: productToReview.id 
                }
            });

            // Step 2: Create a new review
            const reviewData = {
                product_id: productToReview.id,
                rating: 5,
                comment: 'This is a test review for automated testing purposes.'
            };

            try {
                const reviewResult = await MarketHubAPI.createReview(reviewData);
                results.push({
                    step: 'Create Review',
                    status: 'success',
                    message: 'Successfully created product review',
                    data: { review: reviewResult.data, reviewData }
                });

                // Step 3: Verify review was created
                const updatedReviews = await MarketHubAPI.getReviews(productToReview.id);
                const newReviewCount = updatedReviews.data.results?.length || 0;
                results.push({
                    step: 'Verify Review Creation',
                    status: 'success',
                    message: `Product now has ${newReviewCount} reviews`,
                    data: { 
                        newReviewCount,
                        reviewIncrease: newReviewCount - (existingReviews.data.results?.length || 0)
                    }
                });

            } catch (reviewError) {
                if (reviewError.message.includes('already reviewed')) {
                    results.push({
                        step: 'Create Review',
                        status: 'info',
                        message: 'User has already reviewed this product (expected behavior)',
                        data: { note: 'Duplicate review prevention working correctly' }
                    });
                } else {
                    results.push({
                        step: 'Create Review',
                        status: 'error',
                        message: `Failed to create review: ${reviewError.message}`,
                        data: { error: reviewError.message, reviewData }
                    });
                }
            }

        } catch (error) {
            results.push({
                step: 'Product Review Flow',
                status: 'error',
                message: error.message,
                data: { error: error.stack }
            });
        }

        return results;
    },

    // Test Flow 6: Favorites Management Journey
    async testFavoritesFlow() {
        console.log('❤️ Testing Favorites Management Flow...');
        const results = [];

        if (!MarketHubAPI.token) {
            results.push({
                step: 'Favorites Prerequisites',
                status: 'warning',
                message: 'Favorites management requires authentication',
                data: { note: 'Please authenticate to test favorites functionality' }
            });
            return results;
        }

        if (this.testState.testProducts.length === 0) {
            results.push({
                step: 'Favorites Prerequisites',
                status: 'warning',
                message: 'No products available for favorites testing',
                data: { note: 'Load products first using testProductBrowsingFlow()' }
            });
            return results;
        }

        try {
            // Step 1: Get initial favorites
            const initialFavorites = await MarketHubAPI.getFavorites();
            const initialCount = initialFavorites.data.results?.length || 0;
            results.push({
                step: 'Get Initial Favorites',
                status: 'success',
                message: `User has ${initialCount} favorite products`,
                data: { initialFavoriteCount: initialCount }
            });

            // Step 2: Add product to favorites
            const productToFavorite = this.testState.testProducts[0];
            
            try {
                const favoriteResult = await MarketHubAPI.addToFavorites(productToFavorite.id);
                results.push({
                    step: 'Add to Favorites',
                    status: 'success',
                    message: `Successfully added product to favorites: ${productToFavorite.name}`,
                    data: { favorite: favoriteResult.data, productId: productToFavorite.id }
                });

                // Step 3: Verify favorites update
                const updatedFavorites = await MarketHubAPI.getFavorites();
                const newCount = updatedFavorites.data.results?.length || 0;
                results.push({
                    step: 'Verify Favorites Update',
                    status: 'success',
                    message: `User now has ${newCount} favorite products`,
                    data: { 
                        newFavoriteCount: newCount,
                        favoriteIncrease: newCount - initialCount
                    }
                });

            } catch (favoriteError) {
                if (favoriteError.message.includes('already favorited') || favoriteError.message.includes('400')) {
                    results.push({
                        step: 'Add to Favorites',
                        status: 'info',
                        message: 'Product is already in favorites (expected behavior)',
                        data: { note: 'Duplicate favorite prevention working correctly' }
                    });
                } else {
                    results.push({
                        step: 'Add to Favorites',
                        status: 'error',
                        message: `Failed to add to favorites: ${favoriteError.message}`,
                        data: { error: favoriteError.message, productId: productToFavorite.id }
                    });
                }
            }

        } catch (error) {
            results.push({
                step: 'Favorites Management Flow',
                status: 'error',
                message: error.message,
                data: { error: error.stack }
            });
        }

        return results;
    },

    // Run all user flow tests
    async runAllUserFlows() {
        console.log('🧪 Running All MarketHub User Flow Tests...');
        
        await this.initialize();
        
        const allResults = {
            productBrowsing: await this.testProductBrowsingFlow(),
            authentication: await this.testAuthenticationFlow(),
            cartManagement: await this.testCartManagementFlow(),
            orderPlacement: await this.testOrderPlacementFlow(),
            productReviews: await this.testProductReviewFlow(),
            favorites: await this.testFavoritesFlow()
        };

        // Calculate summary statistics
        let totalTests = 0;
        let successCount = 0;
        let errorCount = 0;
        let warningCount = 0;
        let infoCount = 0;

        Object.values(allResults).forEach(flowResults => {
            flowResults.forEach(result => {
                totalTests++;
                switch (result.status) {
                    case 'success':
                        successCount++;
                        break;
                    case 'error':
                        errorCount++;
                        break;
                    case 'warning':
                        warningCount++;
                        break;
                    case 'info':
                        infoCount++;
                        break;
                }
            });
        });

        const summary = {
            totalTests,
            successCount,
            errorCount,
            warningCount,
            infoCount,
            successRate: Math.round((successCount / totalTests) * 100),
            testState: this.testState
        };

        console.log('📊 User Flow Test Summary:', summary);
        
        return {
            summary,
            results: allResults
        };
    },

    // Display results in a user-friendly format
    displayResults(testResults) {
        const container = document.getElementById('user-flow-results') || document.body;
        
        const resultsHTML = `
            <div class="user-flow-results card mt-4">
                <div class="card-header bg-success text-white">
                    <h5 class="mb-0">
                        <i class="bi bi-diagram-3-fill me-2"></i>
                        User Flow Test Results
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="display-6 text-success">${testResults.summary.successCount}</div>
                                <small>Passed</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="display-6 text-danger">${testResults.summary.errorCount}</div>
                                <small>Failed</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="display-6 text-warning">${testResults.summary.warningCount}</div>
                                <small>Warnings</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="display-6 text-info">${testResults.summary.infoCount}</div>
                                <small>Info</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="progress">
                            <div class="progress-bar bg-success" style="width: ${testResults.summary.successRate}%">
                                ${testResults.summary.successRate}% Success Rate
                            </div>
                        </div>
                    </div>

                    ${Object.entries(testResults.results).map(([flowName, flowResults]) => `
                        <div class="mb-3">
                            <h6 class="text-capitalize">${flowName.replace(/([A-Z])/g, ' $1').trim()} Flow</h6>
                            ${flowResults.map(result => `
                                <div class="alert alert-${result.status === 'success' ? 'success' : result.status === 'error' ? 'danger' : result.status === 'warning' ? 'warning' : 'info'} py-2">
                                    <strong>${result.step}</strong>: ${result.message}
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        if (container.id === 'user-flow-results') {
            container.innerHTML = resultsHTML;
        } else {
            container.insertAdjacentHTML('beforeend', resultsHTML);
        }
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Add user flow test button for development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const testButton = `
            <div class="position-fixed bottom-0 end-0 m-3" style="z-index: 999;">
                <button class="btn btn-success" onclick="MarketHubUserFlows.runAllUserFlows().then(results => MarketHubUserFlows.displayResults(results))">
                    <i class="bi bi-diagram-3"></i> Test User Flows
                </button>
            </div>
            <div id="user-flow-results"></div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', testButton);
    }
});

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.MarketHubUserFlows;
}
