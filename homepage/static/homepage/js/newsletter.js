// Newsletter Form Enhancement
document.addEventListener('DOMContentLoaded', function() {
    const newsletterForms = document.querySelectorAll('.newsletter-form');
    
    newsletterForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const emailInput = form.querySelector('input[name="email"]');
            const submitBtn = form.querySelector('.btn-newsletter');
            const email = emailInput.value.trim();
            
            // Validate email
            if (!email) {
                showMessage('Please enter your email address.', 'error');
                emailInput.focus();
                return;
            }
            
            if (!isValidEmail(email)) {
                showMessage('Please enter a valid email address.', 'error');
                emailInput.focus();
                return;
            }
            
            // Show loading state
            form.classList.add('loading');
            submitBtn.disabled = true;
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Subscribing...';
            
            // Submit form via fetch
            fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            })
            .then(response => {
                if (response.ok) {
                    // Success
                    showMessage('🎉 Thanks for subscribing! Check your email for confirmation.', 'success');
                    emailInput.value = '';
                    
                    // Animate success
                    const newsletterCard = form.closest('.newsletter-card');
                    if (newsletterCard) {
                        newsletterCard.style.transform = 'scale(1.02)';
                        setTimeout(() => {
                            newsletterCard.style.transform = '';
                        }, 300);
                    }
                } else {
                    showMessage('Sorry, there was an issue with your subscription. Please try again.', 'error');
                }
            })
            .catch(error => {
                console.error('Newsletter subscription error:', error);
                showMessage('Sorry, there was an issue with your subscription. Please try again.', 'error');
            })
            .finally(() => {
                // Remove loading state
                form.classList.remove('loading');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            });
        });
        
        // Add real-time email validation
        const emailInput = form.querySelector('input[name="email"]');
        if (emailInput) {
            emailInput.addEventListener('input', function() {
                const email = this.value.trim();
                
                // Remove previous validation classes
                this.classList.remove('is-valid', 'is-invalid');
                
                if (email && isValidEmail(email)) {
                    this.classList.add('is-valid');
                } else if (email) {
                    this.classList.add('is-invalid');
                }
            });
            
            // Add focus/blur effects
            emailInput.addEventListener('focus', function() {
                const newsletterCard = form.closest('.newsletter-card');
                if (newsletterCard) {
                    newsletterCard.style.boxShadow = '0 20px 60px rgba(255, 107, 53, 0.2)';
                    newsletterCard.style.borderColor = '#FF6B35';
                }
            });
            
            emailInput.addEventListener('blur', function() {
                const newsletterCard = form.closest('.newsletter-card');
                if (newsletterCard) {
                    newsletterCard.style.boxShadow = '';
                    newsletterCard.style.borderColor = '';
                }
            });
        }
    });
    
    // Email validation function
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Show message function
    function showMessage(message, type = 'info') {
        // Check if we have Django messages framework
        const messagesContainer = document.querySelector('.messages');
        
        if (messagesContainer) {
            // Use Django messages style
            const messageDiv = document.createElement('div');
            messageDiv.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show`;
            messageDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            messagesContainer.appendChild(messageDiv);
            
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                if (messageDiv && messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 5000);
        } else {
            // Fallback to custom toast
            showToast(message, type);
        }
    }
    
    // Custom toast notification
    function showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast align-items-center text-bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Initialize Bootstrap toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Clean up after toast is hidden
        toast.addEventListener('hidden.bs.toast', function() {
            toast.remove();
        });
    }
    
    // Add hover effects to feature badges
    const featureBadges = document.querySelectorAll('.feature-badge');
    featureBadges.forEach(badge => {
        badge.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.05)';
            this.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.3)';
        });
        
        badge.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '';
        });
    });
    
    // Animate newsletter card on scroll
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const newsletterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
                
                // Stagger animation for feature badges
                const badges = card.querySelectorAll('.feature-badge');
                badges.forEach((badge, index) => {
                    setTimeout(() => {
                        badge.style.opacity = '1';
                        badge.style.transform = 'translateY(0)';
                    }, index * 100);
                });
                
                newsletterObserver.unobserve(card);
            }
        });
    }, observerOptions);
    
    const newsletterCards = document.querySelectorAll('.newsletter-card');
    newsletterCards.forEach(card => {
        // Initially hide for animation
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        // Hide badges initially
        const badges = card.querySelectorAll('.feature-badge');
        badges.forEach(badge => {
            badge.style.opacity = '0';
            badge.style.transform = 'translateY(20px)';
            badge.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        });
        
        newsletterObserver.observe(card);
    });
    
    // Add typing animation to newsletter title
    const newsletterTitles = document.querySelectorAll('.newsletter-title');
    newsletterTitles.forEach(title => {
        const text = title.textContent;
        title.textContent = '';
        title.style.borderRight = '2px solid #FF6B35';
        title.style.animation = 'blink 1s infinite';
        
        let i = 0;
        const typeWriter = setInterval(() => {
            title.textContent += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(typeWriter);
                setTimeout(() => {
                    title.style.borderRight = 'none';
                    title.style.animation = 'none';
                }, 500);
            }
        }, 100);
    });
    
    // Add CSS for blinking cursor
    const style = document.createElement('style');
    style.textContent = `
        @keyframes blink {
            0%, 50% { border-color: #FF6B35; }
            51%, 100% { border-color: transparent; }
        }
        
        .newsletter-input.is-valid {
            border-color: #28a745;
            box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
        }
        
        .newsletter-input.is-invalid {
            border-color: #dc3545;
            box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
        }
    `;
    document.head.appendChild(style);
});
