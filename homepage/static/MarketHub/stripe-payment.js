/**
 * MarketHub Stripe Payment Integration
 * Secure payment processing with Stripe Elements
 */

class MarketHubStripePayment {
    constructor(stripePublicKey) {
        this.stripe = null;
        this.elements = null;
        this.cardElement = null;
        this.paymentIntent = null;
        this.isProcessing = false;
        
        // Initialize Stripe
        if (stripePublicKey && stripePublicKey !== 'pk_test_51XXX') {
            this.stripe = Stripe(stripePublicKey);
            this.setupStripeElements();
        } else {
            console.warn('Stripe public key not configured');
            this.showError('Payment system not configured. Please contact support.');
        }
    }

    setupStripeElements() {
        try {
            // Create an instance of Elements
            this.elements = this.stripe.elements({
                appearance: {
                    theme: 'stripe',
                    variables: {
                        colorPrimary: '#FF6B35',
                        colorBackground: '#ffffff',
                        colorText: '#30313d',
                        colorDanger: '#df1b41',
                        fontFamily: '"Segoe UI", system-ui, sans-serif',
                        spacingUnit: '8px',
                        borderRadius: '8px',
                    },
                },
            });

            // Create and mount the Payment Element
            this.cardElement = this.elements.create('payment', {
                layout: 'tabs'
            });

            const cardContainer = document.getElementById('card-element');
            if (cardContainer) {
                this.cardElement.mount('#card-element');
                
                // Handle real-time validation errors from the card Element
                this.cardElement.on('change', ({ error }) => {
                    this.displayCardErrors(error);
                });
            }

            console.log('Stripe Elements initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Stripe Elements:', error);
            this.showError('Failed to initialize payment system');
        }
    }

    displayCardErrors(error) {
        const errorElement = document.getElementById('card-errors');
        if (errorElement) {
            if (error) {
                errorElement.textContent = error.message;
                errorElement.style.display = 'block';
            } else {
                errorElement.textContent = '';
                errorElement.style.display = 'none';
            }
        }
    }

    async createPaymentIntent(orderData) {
        try {
            const response = await fetch('/api/payments/create-intent/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                    'Authorization': `Token ${this.getAuthToken()}`
                },
                body: JSON.stringify(orderData)
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create payment intent');
            }

            this.paymentIntent = data;
            return data;
        } catch (error) {
            console.error('Error creating payment intent:', error);
            throw error;
        }
    }

    async processPayment(orderData) {
        if (this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showLoading(true);

            // Create payment intent
            const paymentIntent = await this.createPaymentIntent(orderData);
            
            // Confirm payment with Stripe
            const result = await this.stripe.confirmPayment({
                elements: this.elements,
                confirmParams: {
                    return_url: `${window.location.origin}/payment/success/`,
                    payment_method_data: {
                        billing_details: {
                            name: orderData.cardholder_name || `${orderData.first_name} ${orderData.last_name}`,
                            email: orderData.email,
                            address: {
                                line1: orderData.address_line_1,
                                line2: orderData.address_line_2,
                                city: orderData.city,
                                state: orderData.province,
                                postal_code: orderData.postal_code,
                                country: 'ZA'
                            }
                        }
                    }
                },
                redirect: 'if_required'
            });

            if (result.error) {
                // Show error to customer
                this.showError(result.error.message);
                this.isProcessing = false;
                this.showLoading(false);
                return { success: false, error: result.error.message };
            }

            // Payment succeeded
            if (result.paymentIntent.status === 'succeeded') {
                this.showSuccess('Payment successful!');
                
                // Redirect to order confirmation or handle success
                if (orderData.order_id) {
                    window.location.href = `/order/confirmation/${orderData.order_id}/`;
                } else {
                    this.handlePaymentSuccess(result.paymentIntent);
                }
                
                return { success: true, paymentIntent: result.paymentIntent };
            }

            // Handle other statuses
            return this.handlePaymentIntentStatus(result.paymentIntent);

        } catch (error) {
            console.error('Payment processing error:', error);
            this.showError(error.message || 'Payment failed. Please try again.');
            return { success: false, error: error.message };
        } finally {
            this.isProcessing = false;
            this.showLoading(false);
        }
    }

    async processPaymentWithSavedMethod(paymentMethodId, orderData) {
        if (this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            this.showLoading(true);

            // Create payment intent
            const paymentIntent = await this.createPaymentIntent(orderData);
            
            // Confirm payment with saved payment method
            const result = await this.stripe.confirmPayment({
                clientSecret: paymentIntent.client_secret,
                confirmParams: {
                    payment_method: paymentMethodId,
                    return_url: `${window.location.origin}/payment/success/`
                },
                redirect: 'if_required'
            });

            if (result.error) {
                this.showError(result.error.message);
                return { success: false, error: result.error.message };
            }

            if (result.paymentIntent.status === 'succeeded') {
                this.showSuccess('Payment successful!');
                
                if (orderData.order_id) {
                    window.location.href = `/order/confirmation/${orderData.order_id}/`;
                } else {
                    this.handlePaymentSuccess(result.paymentIntent);
                }
                
                return { success: true, paymentIntent: result.paymentIntent };
            }

            return this.handlePaymentIntentStatus(result.paymentIntent);

        } catch (error) {
            console.error('Payment processing error:', error);
            this.showError(error.message || 'Payment failed. Please try again.');
            return { success: false, error: error.message };
        } finally {
            this.isProcessing = false;
            this.showLoading(false);
        }
    }

    handlePaymentIntentStatus(paymentIntent) {
        switch (paymentIntent.status) {
            case 'requires_action':
                this.showError('Additional authentication required');
                return { success: false, requiresAction: true, paymentIntent };
            
            case 'requires_payment_method':
                this.showError('Payment method was declined');
                return { success: false, error: 'Payment method was declined' };
            
            case 'processing':
                this.showInfo('Payment is processing...');
                return { success: true, processing: true, paymentIntent };
            
            default:
                this.showError('Payment failed');
                return { success: false, error: 'Payment failed' };
        }
    }

    async savePaymentMethod(paymentMethodId) {
        try {
            const response = await fetch('/api/payments/save-method/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                    'Authorization': `Token ${this.getAuthToken()}`
                },
                body: JSON.stringify({ payment_method_id: paymentMethodId })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to save payment method');
            }

            return data;
        } catch (error) {
            console.error('Error saving payment method:', error);
            throw error;
        }
    }

    async getSavedPaymentMethods() {
        try {
            const response = await fetch('/api/payments/methods/', {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${this.getAuthToken()}`
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to get payment methods');
            }

            return data.payment_methods || [];
        } catch (error) {
            console.error('Error getting payment methods:', error);
            return [];
        }
    }

    async removeSavedPaymentMethod(paymentMethodId) {
        try {
            const response = await fetch(`/api/payments/methods/${paymentMethodId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': this.getCSRFToken(),
                    'Authorization': `Token ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to remove payment method');
            }

            return true;
        } catch (error) {
            console.error('Error removing payment method:', error);
            throw error;
        }
    }

    handlePaymentSuccess(paymentIntent) {
        // Custom success handling
        this.showSuccess('Payment completed successfully!');
        
        // You can customize this based on your needs
        setTimeout(() => {
            window.location.href = '/dashboard/';
        }, 2000);
    }

    getCSRFToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='));
        return cookieValue ? cookieValue.split('=')[1] : null;
    }

    getAuthToken() {
        return localStorage.getItem('markethub_token') || 
               sessionStorage.getItem('markethub_token') || 
               this.getCookieValue('auth_token');
    }

    getCookieValue(name) {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`));
        return cookieValue ? cookieValue.split('=')[1] : null;
    }

    showLoading(show = true) {
        const loadingElements = document.querySelectorAll('.payment-loading');
        const submitButtons = document.querySelectorAll('.submit-payment-btn');
        
        loadingElements.forEach(el => {
            if (show) {
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
        
        submitButtons.forEach(btn => {
            btn.disabled = show;
            if (show) {
                btn.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Processing...';
            } else {
                btn.innerHTML = 'Complete Payment';
            }
        });
    }

    showError(message) {
        if (window.MarketHubNotifications) {
            window.MarketHubNotifications.error(message);
        } else {
            this.showMessage(message, 'danger');
        }
    }

    showSuccess(message) {
        if (window.MarketHubNotifications) {
            window.MarketHubNotifications.success(message);
        } else {
            this.showMessage(message, 'success');
        }
    }

    showInfo(message) {
        if (window.MarketHubNotifications) {
            window.MarketHubNotifications.info(message);
        } else {
            this.showMessage(message, 'info');
        }
    }

    showMessage(message, type) {
        // Fallback message display
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type} alert-dismissible fade show`;
        alertElement.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.payment-messages') || 
                         document.querySelector('.container') || 
                         document.body;
        
        container.insertAdjacentElement('afterbegin', alertElement);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.remove();
            }
        }, 5000);
    }

    // Utility method to validate form data
    validatePaymentForm(formData) {
        const errors = [];

        if (!formData.email || !formData.email.includes('@')) {
            errors.push('Valid email is required');
        }

        if (!formData.first_name || !formData.last_name) {
            errors.push('Name is required');
        }

        if (!formData.address_line_1) {
            errors.push('Address is required');
        }

        if (!formData.city || !formData.province || !formData.postal_code) {
            errors.push('City, province, and postal code are required');
        }

        return errors;
    }

    // Format currency for display
    formatCurrency(amount, currency = 'ZAR') {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    }

    // Create order summary display
    createOrderSummary(orderData) {
        return `
            <div class="order-summary">
                <h5>Order Summary</h5>
                <div class="d-flex justify-content-between">
                    <span>Subtotal:</span>
                    <span>${this.formatCurrency(orderData.subtotal)}</span>
                </div>
                <div class="d-flex justify-content-between">
                    <span>Shipping:</span>
                    <span>${this.formatCurrency(orderData.shipping_cost || 0)}</span>
                </div>
                <div class="d-flex justify-content-between">
                    <span>Tax:</span>
                    <span>${this.formatCurrency(orderData.tax_amount || 0)}</span>
                </div>
                <hr>
                <div class="d-flex justify-content-between fw-bold">
                    <span>Total:</span>
                    <span>${this.formatCurrency(orderData.total_amount)}</span>
                </div>
            </div>
        `;
    }
}

// Initialize payment system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get Stripe public key from template context
    const stripeKeyElement = document.querySelector('[data-stripe-key]');
    const stripePublicKey = stripeKeyElement ? stripeKeyElement.dataset.stripeKey : null;
    
    if (stripePublicKey) {
        window.MarketHubPayment = new MarketHubStripePayment(stripePublicKey);
        
        // Set up payment form if it exists
        const paymentForm = document.getElementById('payment-form');
        if (paymentForm) {
            setupPaymentForm(paymentForm);
        }
    }
});

// Payment form setup helper
function setupPaymentForm(form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!window.MarketHubPayment || !window.MarketHubPayment.stripe) {
            window.MarketHubPayment.showError('Payment system not available');
            return;
        }

        // Collect form data
        const formData = new FormData(form);
        const orderData = {
            order_id: formData.get('order_id'),
            email: formData.get('email'),
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            address_line_1: formData.get('address_line_1'),
            address_line_2: formData.get('address_line_2'),
            city: formData.get('city'),
            province: formData.get('province'),
            postal_code: formData.get('postal_code'),
            phone: formData.get('phone'),
            amount: formData.get('amount'),
            currency: formData.get('currency') || 'zar',
            save_payment_method: formData.get('save_payment_method') === 'on'
        };

        // Validate form
        const errors = window.MarketHubPayment.validatePaymentForm(orderData);
        if (errors.length > 0) {
            window.MarketHubPayment.showError(errors.join(', '));
            return;
        }

        // Check if using saved payment method
        const savedMethodId = formData.get('saved_payment_method');
        
        if (savedMethodId && savedMethodId !== 'new') {
            // Process with saved payment method
            await window.MarketHubPayment.processPaymentWithSavedMethod(savedMethodId, orderData);
        } else {
            // Process with new payment method
            await window.MarketHubPayment.processPayment(orderData);
        }
    });
}

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarketHubStripePayment;
}
