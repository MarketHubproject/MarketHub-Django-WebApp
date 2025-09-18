// MarketHub Cart Enhancement JavaScript
document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize cart functionality
    initializeCart();
    
    function initializeCart() {
        // Enhanced quantity controls
        setupQuantityControls();
        
        // Cart item animations
        setupCartAnimations();
        
        // Add to cart functionality
        setupAddToCartButtons();
        
        // Cart badge updates
        updateCartBadge();
        
        // Auto-update cart totals
        setupCartTotalUpdates();
    }
    
    function setupQuantityControls() {
        const quantityForms = document.querySelectorAll('.quantity-form');
        
        quantityForms.forEach(form => {
            const decreaseBtn = form.querySelector('.quantity-btn[data-action="decrease"]');
            const increaseBtn = form.querySelector('.quantity-btn[data-action="increase"]');
            const quantityInput = form.querySelector('input[name="quantity"]');
            const submitBtn = form.querySelector('button[type="submit"]');
            
            if (!decreaseBtn || !increaseBtn || !quantityInput) return;
            
            // Decrease quantity
            decreaseBtn.addEventListener('click', function() {
                let currentValue = parseInt(quantityInput.value);
                if (currentValue > 1) {
                    quantityInput.value = currentValue - 1;
                    submitFormWithLoading(form);
                }
            });
            
            // Increase quantity
            increaseBtn.addEventListener('click', function() {
                let currentValue = parseInt(quantityInput.value);
                if (currentValue < 99) {
                    quantityInput.value = currentValue + 1;
                    submitFormWithLoading(form);
                }
            });
            
            // Direct input change
            quantityInput.addEventListener('change', function() {
                let value = parseInt(this.value);
                if (value < 1) {
                    this.value = 1;
                } else if (value > 99) {
                    this.value = 99;
                }
                submitFormWithLoading(form);
            });
        });
    }
    
    function submitFormWithLoading(form) {
        // Add loading state
        const formElement = form.closest('.cart-item');
        if (formElement) {
            formElement.classList.add('loading');
            formElement.style.opacity = '0.7';
            formElement.style.pointerEvents = 'none';
        }
        
        // Show loading spinner on submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.classList.remove('d-none');
            submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Updating...';
            
            // Auto-submit after short delay
            setTimeout(() => {
                submitBtn.click();
            }, 300);
        }
    }
    
    function setupCartAnimations() {
        // Animate cart items on removal
        const removeButtons = document.querySelectorAll('a[href*="remove_from_cart"]');
        
        removeButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                const cartItem = this.closest('.cart-item');
                const productName = cartItem.querySelector('h6').textContent;
                
                // Show confirmation with animation
                if (confirm(`Remove ${productName} from cart?`)) {
                    // Animate removal
                    cartItem.style.transform = 'translateX(-100%)';
                    cartItem.style.opacity = '0';
                    cartItem.style.transition = 'all 0.3s ease';
                    
                    setTimeout(() => {
                        window.location.href = this.href;
                    }, 300);
                }
            });
        });
        
        // Animate cart items on page load
        const cartItems = document.querySelectorAll('.cart-item');
        cartItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.4s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, 100 * (index + 1));
        });
    }
    
    function setupAddToCartButtons() {
        const addToCartForms = document.querySelectorAll('form[action*="add_to_cart"]');
        
        addToCartForms.forEach(form => {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const button = form.querySelector('button[type="submit"]');
                const originalText = button.innerHTML;
                
                // Add loading state
                button.disabled = true;
                button.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Adding...';
                button.classList.add('loading');
                
                // Submit form via AJAX for better UX
                fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => {
                    if (response.ok) {
                        // Success animation
                        button.innerHTML = '<i class="bi bi-check-circle"></i> Added!';
                        button.classList.remove('btn-primary');
                        button.classList.add('btn-success');
                        
                        // Update cart badge
                        updateCartBadge(1);
                        
                        // Show success notification
                        showNotification('Product added to cart!', 'success');
                        
                        // Reset button after delay
                        setTimeout(() => {
                            button.innerHTML = originalText;
                            button.classList.remove('btn-success', 'loading');
                            button.classList.add('btn-primary');
                            button.disabled = false;
                        }, 2000);
                    } else {
                        throw new Error('Failed to add to cart');
                    }
                })
                .catch(error => {
                    console.error('Add to cart error:', error);
                    
                    // Error state
                    button.innerHTML = '<i class="bi bi-exclamation-circle"></i> Error';
                    button.classList.remove('btn-primary');
                    button.classList.add('btn-danger');
                    
                    showNotification('Failed to add to cart. Please try again.', 'error');
                    
                    // Reset button after delay
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        button.classList.remove('btn-danger', 'loading');
                        button.classList.add('btn-primary');
                        button.disabled = false;
                    }, 3000);
                });
            });
        });
    }
    
    function updateCartBadge(increment = 0) {
        const cartBadges = document.querySelectorAll('.cart-badge, .cart-counter, .cart-items-count');
        
        cartBadges.forEach(badge => {
            let currentCount = parseInt(badge.textContent) || 0;
            if (increment) {
                currentCount += increment;
                badge.textContent = currentCount;
                
                // Animate badge
                badge.style.transform = 'scale(1.3)';
                badge.style.background = '#28a745';
                
                setTimeout(() => {
                    badge.style.transform = 'scale(1)';
                    badge.style.background = '';
                }, 300);
            }
        });
    }
    
    function setupCartTotalUpdates() {
        // Monitor quantity changes and update totals
        const quantityInputs = document.querySelectorAll('.quantity-form input[name="quantity"]');
        
        quantityInputs.forEach(input => {
            input.addEventListener('input', debounce(updateCartTotals, 500));
        });
    }
    
    function updateCartTotals() {
        let subtotal = 0;
        const cartItems = document.querySelectorAll('.cart-item');
        
        cartItems.forEach(item => {
            const quantityInput = item.querySelector('input[name="quantity"]');
            const priceElement = item.querySelector('small:contains("×")');
            
            if (quantityInput && priceElement) {
                const quantity = parseInt(quantityInput.value) || 1;
                const priceText = priceElement.textContent;
                const priceMatch = priceText.match(/R([\d,.]+)/);
                
                if (priceMatch) {
                    const price = parseFloat(priceMatch[1].replace(',', ''));
                    const itemTotal = quantity * price;
                    subtotal += itemTotal;
                    
                    // Update item total display
                    const totalElement = item.querySelector('.price-total h5');
                    if (totalElement) {
                        totalElement.textContent = `R${itemTotal.toFixed(2)}`;
                    }
                }
            }
        });
        
        // Update cart summary
        const subtotalElements = document.querySelectorAll('[class*="subtotal"], .price-total');
        subtotalElements.forEach(element => {
            if (element.textContent.includes('Subtotal') || element.textContent.includes('Total')) {
                element.textContent = `R${subtotal.toFixed(2)}`;
            }
        });
    }
    
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show notification-toast`;
        notification.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            border: none;
            border-radius: 12px;
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    // Enhanced cart page interactions
    function setupCartPageEnhancements() {
        // Animate checkout button
        const checkoutBtn = document.querySelector('a[href*="checkout"]');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px) scale(1.05)';
            });
            
            checkoutBtn.addEventListener('mouseleave', function() {
                this.style.transform = '';
            });
        }
        
        // Enhanced empty cart state
        const emptyCartIcon = document.querySelector('.modern-empty-cart-icon');
        if (emptyCartIcon) {
            // Add floating animation
            emptyCartIcon.style.animation = 'float 3s ease-in-out infinite';
        }
        
        // Progressive disclosure for cart summary
        const orderSummary = document.querySelector('.card-header');
        if (orderSummary) {
            orderSummary.style.cursor = 'pointer';
            orderSummary.addEventListener('click', function() {
                const cardBody = this.nextElementSibling;
                cardBody.classList.toggle('show');
            });
        }
    }
    
    // Utility functions
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // CSS animations
    const style = document.createElement('style');
    style.textContent = `
        .spin {
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        
        .loading {
            position: relative;
            overflow: hidden;
        }
        
        .loading::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        
        .notification-toast {
            animation: slideInRight 0.3s ease;
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .cart-item {
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .cart-item:hover {
            transform: translateX(5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        
        .quantity-btn:hover {
            transform: scale(1.1);
        }
        
        .btn.loading {
            pointer-events: none;
            position: relative;
        }
    `;
    document.head.appendChild(style);
    
    // Initialize cart page specific enhancements
    if (window.location.pathname.includes('cart')) {
        setupCartPageEnhancements();
    }
});

// Global cart utilities
window.MarketHubCart = {
    addToCart: function(productId) {
        fetch(`/add-to-cart/${productId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.updateCartBadge(data.cart_count);
                this.showNotification('Product added to cart!', 'success');
            }
        })
        .catch(error => {
            console.error('Cart error:', error);
            this.showNotification('Failed to add to cart', 'error');
        });
    },
    
    updateCartBadge: function(count) {
        const badges = document.querySelectorAll('.cart-badge, .cart-counter');
        badges.forEach(badge => {
            badge.textContent = count;
            badge.style.animation = 'pulse 0.5s ease';
        });
    },
    
    showNotification: function(message, type) {
        // Reuse the notification function from above
        const event = new CustomEvent('showNotification', {
            detail: { message, type }
        });
        document.dispatchEvent(event);
    }
};
