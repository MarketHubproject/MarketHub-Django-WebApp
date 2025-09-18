// MarketHub Product Grid JavaScript
document.addEventListener("DOMContentLoaded", function () {
  // Quick View Functionality
  const quickViewBtns = document.querySelectorAll(".quick-view-btn");
  quickViewBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const productId = this.dataset.productId;
      openQuickView(productId);
    });
  });

  // Add to Cart with AJAX
  const addToCartBtns = document.querySelectorAll(".add-to-cart-btn");
  addToCartBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      
      // Check if user is authenticated
      const isAuthenticated = document.body.classList.contains('authenticated') || 
                             document.querySelector('[data-user-authenticated="true"]');
      
      if (!isAuthenticated) {
        window.location.href = '/login/';
        return;
      }
      
      // Get product ID from the button's href or data attribute
      const href = this.getAttribute('href');
      const productId = href ? href.match(/\/(\d+)\//)?.[1] : this.dataset.productId;
      
      if (!productId) {
        console.error('Product ID not found');
        return;
      }
      
      // Add loading state
      const originalText = this.innerHTML;
      this.innerHTML = '<i class="bi bi-arrow-repeat me-1" style="animation: spin 1s linear infinite;"></i>Adding...';
      this.disabled = true;

      // Make AJAX request
      fetch(`/cart/add/${productId}/`, {
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': getCsrfToken()
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          this.innerHTML = '<i class="bi bi-check me-1"></i>Added!';
          
          // Update cart count if element exists
          const cartCount = document.querySelector('.cart-count');
          if (cartCount && data.cart_count) {
            cartCount.textContent = data.cart_count;
          }
          
          // Show success message
          showNotification('success', data.message || 'Item added to cart!');
          
          setTimeout(() => {
            this.innerHTML = originalText;
            this.disabled = false;
          }, 1500);
        } else {
          this.innerHTML = originalText;
          this.disabled = false;
          showNotification('error', 'Failed to add item to cart');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        this.innerHTML = originalText;
        this.disabled = false;
        showNotification('error', 'Failed to add item to cart');
      });
    });
  });

  // Product Card Hover Effects
  const productCards = document.querySelectorAll(".MarketHub-product-card");
  productCards.forEach((card) => {
    card.addEventListener("mouseenter", function () {
      this.style.zIndex = "10";
    });

    card.addEventListener("mouseleave", function () {
      this.style.zIndex = "1";
    });
  });

  // Lazy Loading for Product Images
  const productImages = document.querySelectorAll(".product-image");
  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.classList.add("fade-in-up");
          observer.unobserve(img);
        }
      });
    });

    productImages.forEach((img) => {
      imageObserver.observe(img);
    });
  }
});

// Quick View Modal Function
function openQuickView(productId) {
  // Store the element that triggered the modal for focus restoration
  window.modalTrigger = document.activeElement;

  // Create modal backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop fade show";
  backdrop.style.zIndex = "1040";
  backdrop.setAttribute("aria-hidden", "true");

  // Create modal
  const modal = document.createElement("div");
  modal.className = "modal fade show";
  modal.style.display = "block";
  modal.style.zIndex = "1050";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-labelledby", "quickview-title");
  modal.setAttribute("aria-describedby", "quickview-description");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("tabindex", "-1");
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
  document.body.classList.add("modal-open");

  // Store modal references
  window.currentModal = modal;
  window.currentBackdrop = backdrop;

  // Focus management
  const closeButton = modal.querySelector(".btn-close");
  closeButton.focus();

  // Trap focus within modal
  trapFocus(modal);

  // Fetch real product data from API
  fetch(`/api/product/${productId}/quick-view/`, {
    method: 'POST',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': getCsrfToken(),
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success && data.product) {
      const product = data.product;
      const ratingStars = generateStarRating(product.avg_rating);
      const imageUrl = product.image_url || '/static/homepage/images/placeholder-product.jpg';
      
      modal.querySelector(".modal-body").innerHTML = `
        <div class="row">
          <div class="col-md-6">
            <div class="text-center">
              <img src="${imageUrl}" class="img-fluid rounded" alt="${product.name}" 
                   style="max-height: 400px; object-fit: cover;" 
                   onerror="this.src='/static/homepage/images/placeholder-product.jpg'">
            </div>
          </div>
          <div class="col-md-6">
            <h4>${product.name}</h4>
            <div class="rating mb-2" role="img" aria-label="${product.avg_rating} out of 5 stars rating">
              ${ratingStars}
              <span class="ms-2 text-muted">(${product.avg_rating})</span>
            </div>
            <div class="mb-2">
              <small class="text-muted">Category: ${product.category}</small><br>
              <small class="text-muted"><i class="bi bi-geo-alt-fill text-danger"></i> ${product.location}</small><br>
              <small class="text-muted">Seller: ${product.seller}</small><br>
              <small class="text-muted">Listed: ${product.created_at}</small>
            </div>
            <p class="text-muted">${product.description}</p>
            <div class="price mb-3">
              <span class="h4 text-success fw-bold">R${product.price}</span>
            </div>
            <div class="d-grid gap-2">
              ${product.is_available ? `
                <button class="btn btn-primary btn-lg add-to-cart-modal-btn" data-product-id="${product.id}">
                  <i class="bi bi-cart-plus me-2"></i>Add to Cart
                </button>
              ` : `
                <button class="btn btn-secondary btn-lg" disabled>
                  <i class="bi bi-x-circle me-2"></i>Not Available
                </button>
              `}
              <a href="/products/${productId}/" class="btn btn-outline-secondary" role="button">
                <i class="bi bi-info-circle me-2"></i>View Full Details
              </a>
            </div>
          </div>
        </div>
      `;
      
      // Add event listener for modal add to cart button
      const modalAddToCartBtn = modal.querySelector('.add-to-cart-modal-btn');
      if (modalAddToCartBtn) {
        modalAddToCartBtn.addEventListener('click', function() {
          const productId = this.dataset.productId;
          addToCartFromModal(productId, this);
        });
      }
      
    } else {
      modal.querySelector(".modal-body").innerHTML = `
        <div class="text-center p-4">
          <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
          <h5 class="mt-3">Product Not Found</h5>
          <p class="text-muted">Sorry, we couldn't load the product details.</p>
          <button class="btn btn-secondary" onclick="closeQuickView()">Close</button>
        </div>
      `;
    }
  })
  .catch(error => {
    console.error('Error loading product:', error);
    modal.querySelector(".modal-body").innerHTML = `
      <div class="text-center p-4">
        <i class="bi bi-wifi-off text-danger" style="font-size: 3rem;"></i>
        <h5 class="mt-3">Connection Error</h5>
        <p class="text-muted">Failed to load product details. Please try again.</p>
        <button class="btn btn-primary" onclick="openQuickView(${productId})">Retry</button>
        <button class="btn btn-secondary ms-2" onclick="closeQuickView()">Close</button>
      </div>
    `;
  });

  // Close modal on backdrop click
  backdrop.addEventListener("click", closeQuickView);

  // Close modal on escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeQuickView();
    }
  });
}

// Close Quick View Modal
function closeQuickView() {
  if (window.currentModal && window.currentBackdrop) {
    document.body.removeChild(window.currentModal);
    document.body.removeChild(window.currentBackdrop);
    document.body.classList.remove("modal-open");

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
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  element.addEventListener("keydown", function (e) {
    if (e.key === "Tab") {
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
  const products = document.querySelectorAll(".MarketHub-product-card");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
          }, index * 100);
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
    },
  );

  products.forEach((product) => {
    product.style.opacity = "0";
    product.style.transform = "translateY(30px)";
    product.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(product);
  });
}

// Initialize animations when page loads
document.addEventListener("DOMContentLoaded", animateProductsOnScroll);

// Utility Functions

// Get CSRF token from cookies
function getCsrfToken() {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  
  if (!cookieValue) {
    // Try to get from meta tag as fallback
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag ? metaTag.getAttribute('content') : '';
  }
  
  return cookieValue;
}

// Show notification messages
function showNotification(type, message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
  notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
  
  // Add click to dismiss
  notification.querySelector('.btn-close').addEventListener('click', () => {
    notification.remove();
  });
}

// Generate star rating HTML
function generateStarRating(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let html = '';
  
  // Full stars
  for (let i = 0; i < fullStars; i++) {
    html += '<i class="bi bi-star-fill text-warning"></i>';
  }
  
  // Half star
  if (hasHalfStar) {
    html += '<i class="bi bi-star-half text-warning"></i>';
  }
  
  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    html += '<i class="bi bi-star text-warning"></i>';
  }
  
  return html;
}

// Add to cart from modal
function addToCartFromModal(productId, button) {
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="bi bi-arrow-repeat me-1" style="animation: spin 1s linear infinite;"></i>Adding...';
  button.disabled = true;
  
  fetch(`/cart/add/${productId}/`, {
    method: 'GET',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': getCsrfToken()
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      button.innerHTML = '<i class="bi bi-check me-1"></i>Added!';
      showNotification('success', data.message || 'Item added to cart!');
      
      // Update cart count if element exists
      const cartCount = document.querySelector('.cart-count');
      if (cartCount && data.cart_count) {
        cartCount.textContent = data.cart_count;
      }
      
      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 1500);
    } else {
      button.innerHTML = originalText;
      button.disabled = false;
      showNotification('error', 'Failed to add item to cart');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    button.innerHTML = originalText;
    button.disabled = false;
    showNotification('error', 'Failed to add item to cart');
  });
}

// Toggle favorite functionality
function toggleFavorite(productId, button) {
  const originalHtml = button.innerHTML;
  button.disabled = true;
  
  fetch(`/products/toggle-favorite/${productId}/`, {
    method: 'POST',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': getCsrfToken(),
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      const icon = button.querySelector('i');
      if (data.is_favorited) {
        icon.className = 'bi bi-heart-fill';
        icon.style.color = '#e74c3c';
        showNotification('success', 'Added to favorites!');
      } else {
        icon.className = 'bi bi-heart';
        icon.style.color = '#bdc3c7';
        showNotification('success', 'Removed from favorites!');
      }
      button.classList.toggle('favorited', data.is_favorited);
    } else {
      showNotification('error', 'Failed to update favorites');
    }
    button.disabled = false;
  })
  .catch(error => {
    console.error('Error:', error);
    showNotification('error', 'Failed to update favorites');
    button.disabled = false;
  });
}
