// Store Lite Product Grid JavaScript
document.addEventListener('DOMContentLoaded', function() {
    
    // Quick View Functionality
    const quickViewBtns = document.querySelectorAll('.quick-view-btn');
    quickViewBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const productId = this.dataset.productId;
            openQuickView(productId);
        });
    });

    // Add to Cart with Animation
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
    addToCartBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Add loading state
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Adding...';
            this.disabled = true;
            
            // Simulate API call delay (remove this in production)
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-check me-1"></i>Added!';
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 1000);
            }, 800);
        });
    });

    // Product Card Hover Effects
    const productCards = document.querySelectorAll('.store-lite-product-card');
    productCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.zIndex = '10';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.zIndex = '1';
        });
    });

    // Lazy Loading for Product Images
    const productImages = document.querySelectorAll('.product-image');
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.classList.add('fade-in-up');
                    observer.unobserve(img);
                }
            });
        });

        productImages.forEach(img => {
            imageObserver.observe(img);
        });
    }
});

// Quick View Modal Function
function openQuickView(productId) {
    // Store the element that triggered the modal for focus restoration
    window.modalTrigger = document.activeElement;
    
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.style.zIndex = '1040';
    backdrop.setAttribute('aria-hidden', 'true');
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal fade show';
    modal.style.display = 'block';
    modal.style.zIndex = '1050';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'quickview-title');
    modal.setAttribute('aria-describedby', 'quickview-description');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="quickview-title">Product Quick View</h5>
                    <button type="button" class="btn-close" onclick="closeQuickView()" aria-label="Close modal" tabindex="0"></button>
                </div>
                <div class="modal-body" id="quickview-description">
                    <div class="d-flex justify-content-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                    <p class="text-center mt-2" aria-live="polite">Loading product details...</p>
                </div>
            </div>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    
    // Store modal references
    window.currentModal = modal;
    window.currentBackdrop = backdrop;
    
    // Focus management
    const closeButton = modal.querySelector('.btn-close');
    closeButton.focus();
    
    // Trap focus within modal
    trapFocus(modal);
    
    // Simulate loading product data (replace with actual API call)
    setTimeout(() => {
        modal.querySelector('.modal-body').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="text-center">
                        <img src="https://via.placeholder.com/400x300" class="img-fluid rounded" alt="Sample product showcase image">
                    </div>
                </div>
                <div class="col-md-6">
                    <h4>Sample Product Name</h4>
                    <div class="rating mb-2" role="img" aria-label="4 out of 5 stars rating">
                        <i class="fas fa-star text-warning" aria-hidden="true"></i>
                        <i class="fas fa-star text-warning" aria-hidden="true"></i>
                        <i class="fas fa-star text-warning" aria-hidden="true"></i>
                        <i class="fas fa-star text-warning" aria-hidden="true"></i>
                        <i class="far fa-star text-warning" aria-hidden="true"></i>
                        <span class="ms-2 text-muted">(4.0)</span>
                    </div>
                    <p class="text-muted">This is a sample product description that would normally be loaded from your database.</p>
                    <div class="price mb-3">
                        <span class="h4 text-danger fw-bold" aria-label="Price: 29 dollars and 99 cents">$29.99</span>
                    </div>
                    <div class="d-grid gap-2">
                        <button class="btn btn-primary btn-lg" aria-describedby="add-to-cart-desc">
                            <i class="fas fa-cart-plus me-2" aria-hidden="true"></i>Add to Cart
                        </button>
                        <div id="add-to-cart-desc" class="visually-hidden">Add this product to your shopping cart</div>
                        <a href="/product/${productId}/" class="btn btn-outline-secondary" role="button">
                            <i class="fas fa-info-circle me-2" aria-hidden="true"></i>View Full Details
                        </a>
                    </div>
                </div>
            </div>
        `;
    }, 1000);
    
    // Close modal on backdrop click
    backdrop.addEventListener('click', closeQuickView);
    
    // Close modal on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeQuickView();
        }
    });
}

// Close Quick View Modal
function closeQuickView() {
    if (window.currentModal && window.currentBackdrop) {
        document.body.removeChild(window.currentModal);
        document.body.removeChild(window.currentBackdrop);
        document.body.classList.remove('modal-open');
        
        // Restore focus to the element that opened the modal
        if (window.modalTrigger) {
            window.modalTrigger.focus();
            window.modalTrigger = null;
        }
        
        window.currentModal = null;
        window.currentBackdrop = null;
    }
}

// Focus trap utility for modals
function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    element.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    });
}

// Product Grid Animation on Scroll
function animateProductsOnScroll() {
    const products = document.querySelectorAll('.store-lite-product-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    products.forEach(product => {
        product.style.opacity = '0';
        product.style.transform = 'translateY(30px)';
        product.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(product);
    });
}

// Initialize animations when page loads
document.addEventListener('DOMContentLoaded', animateProductsOnScroll);
