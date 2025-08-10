// Bootstrap Icons Regression Test Suite for MarketHub
// This test can be run with Cypress to automate icon testing

describe('Bootstrap Icons Regression Test Suite', () => {
  // Test configuration
  const baseUrl = 'http://localhost:8000'; // Django dev server
  const iconTestPage = 'bootstrap_icons_test.html';
  
  // Key MarketHub pages to test
  const testPages = [
    { name: 'Home', path: '/', key: 'home' },
    { name: 'Product List', path: '/products/', key: 'product_list' },
    { name: 'Cart', path: '/cart/', key: 'cart', requiresAuth: true },
    { name: 'Checkout', path: '/checkout/', key: 'checkout', requiresAuth: true },
    { name: 'Search Advanced', path: '/search/advanced/', key: 'search' },
  ];
  
  // Test viewports for responsive testing
  const viewports = [
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Laptop', width: 1366, height: 768 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Mobile Large', width: 414, height: 896 },
  ];

  beforeEach(() => {
    // Set up test environment
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Icon Test Utility Page', () => {
    it('should load the icon test page successfully', () => {
      cy.visit(`/${iconTestPage}`);
      cy.contains('Bootstrap Icons Regression Test').should('be.visible');
      
      // Wait for tests to complete
      cy.wait(3000);
      
      // Check that test suite ran
      cy.window().should('have.property', 'iconTestSuite');
    });

    it('should pass font loading test', () => {
      cy.visit(`/${iconTestPage}`);
      cy.wait(3000);
      
      // Check font loading status
      cy.get('#fontStatus').should('satisfy', ($el) => {
        const classes = $el.attr('class');
        return classes.includes('status-pass') || classes.includes('status-warn');
      });
    });

    it('should detect visible Bootstrap Icons', () => {
      cy.visit(`/${iconTestPage}`);
      cy.wait(3000);
      
      // Check that icons are visible
      cy.get('.bi').should('have.length.greaterThan', 20);
      
      // Verify specific test icons are visible
      cy.get('.bi-clipboard-check').should('be.visible');
      cy.get('.bi-speedometer2').should('be.visible');
      cy.get('.bi-house-door-fill').should('be.visible');
    });

    it('should provide test results via JavaScript API', () => {
      cy.visit(`/${iconTestPage}`);
      cy.wait(3000);
      
      cy.window().then((win) => {
        const results = win.iconTestSuite.getTestResults();
        
        expect(results).to.have.property('timestamp');
        expect(results).to.have.property('results');
        expect(results).to.have.property('summary');
        expect(results.summary).to.have.property('totalIcons');
        expect(results.summary).to.have.property('visibleIcons');
        expect(results.summary.visibleIcons).to.be.greaterThan(0);
      });
    });
  });

  describe('MarketHub Pages Icon Testing', () => {
    testPages.forEach((page) => {
      describe(`${page.name} Page Icons`, () => {
        beforeEach(() => {
          if (page.requiresAuth) {
            // Login if required (you may need to adjust this based on your auth system)
            cy.visit('/login/');
            // Add login steps here if needed
            // cy.get('[name="username"]').type('testuser');
            // cy.get('[name="password"]').type('testpass');
            // cy.get('[type="submit"]').click();
          }
        });

        it('should display Bootstrap Icons correctly', () => {
          cy.visit(page.path, { failOnStatusCode: false });
          
          // Wait for page to load
          cy.wait(1000);
          
          // Check that Bootstrap Icons are present
          cy.get('.bi').should('exist');
          
          // Check that Bootstrap Icons have proper CSS classes
          cy.get('.bi').each(($icon) => {
            expect($icon).to.have.class('bi');
          });
          
          // Check that icons are visible (have dimensions)
          cy.get('.bi').first().should('satisfy', ($el) => {
            const el = $el[0];
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        });

        it('should not show broken icon placeholders', () => {
          cy.visit(page.path, { failOnStatusCode: false });
          
          // Check that icons don't contain fallback text
          cy.get('.bi').each(($icon) => {
            expect($icon.text().trim()).to.equal('');
          });
        });

        viewports.forEach((viewport) => {
          it(`should display icons correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
            cy.viewport(viewport.width, viewport.height);
            cy.visit(page.path, { failOnStatusCode: false });
            
            cy.wait(1000);
            
            // Check icons are still visible at this viewport
            cy.get('.bi').should('exist');
            
            // Take screenshot for manual review
            cy.screenshot(`${page.key}-icons-${viewport.name.toLowerCase()}`, {
              capture: 'viewport'
            });
          });
        });
      });
    });
  });

  describe('Cross-Browser Icon Compatibility', () => {
    const browsers = ['chrome', 'firefox', 'edge'];
    
    it('should verify icon font loading across browsers', () => {
      cy.visit(`/${iconTestPage}`);
      cy.wait(3000);
      
      // Get browser info and test results
      cy.window().then((win) => {
        const results = win.iconTestSuite.getTestResults();
        const userAgent = win.navigator.userAgent;
        
        // Log browser info
        cy.log(`Testing in browser: ${results.summary.browser}`);
        cy.log(`User Agent: ${userAgent}`);
        
        // Verify icons are working
        expect(results.summary.visibleIcons).to.be.greaterThan(15);
        expect(results.summary.successRate).to.be.greaterThan(80);
      });
    });
  });

  describe('Performance and Loading Tests', () => {
    it('should load Bootstrap Icons efficiently', () => {
      // Test icon loading performance
      cy.visit(`/${iconTestPage}`);
      
      // Measure time to first icon visibility
      const startTime = Date.now();
      
      cy.get('.bi').first().should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(5000); // Icons should load within 5 seconds
      });
    });

    it('should handle icon font fallback gracefully', () => {
      // Test what happens when CDN fails
      cy.visit(`/${iconTestPage}`);
      cy.wait(3000);
      
      cy.window().then((win) => {
        const results = win.iconTestSuite.getTestResults();
        
        // Even if font loading fails, CSS fallback should work
        if (!results.results.fontLoading) {
          expect(results.summary.visibleIcons).to.be.greaterThan(0);
        }
      });
    });
  });

  describe('Accessibility and Icon Semantics', () => {
    it('should ensure icons are accessible', () => {
      cy.visit('/');
      
      // Check that interactive icons have proper ARIA labels or text
      cy.get('button .bi, a .bi').each(($icon) => {
        const $parent = $icon.parent();
        const hasAriaLabel = $parent.attr('aria-label');
        const hasText = $parent.text().trim().length > 0;
        const hasTitle = $parent.attr('title');
        
        expect(hasAriaLabel || hasText || hasTitle).to.be.true;
      });
    });

    it('should use appropriate icon semantics', () => {
      cy.visit('/');
      
      // Check for common semantic patterns
      cy.get('.bi-search').should('exist'); // Search functionality
      cy.get('.bi-cart, .bi-cart3').should('exist'); // Shopping cart
      cy.get('.bi-person, .bi-person-circle').should('exist'); // User profile
    });
  });

  // Utility functions for custom commands
  describe('Custom Test Utilities', () => {
    it('should provide icon validation helper', () => {
      cy.visit(`/${iconTestPage}`);
      
      // Custom command to validate icon rendering
      const validateIcon = (selector) => {
        return cy.get(selector).should('exist').and('be.visible').and('satisfy', ($el) => {
          const el = $el[0];
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el, '::before');
          
          return rect.width > 0 && 
                 rect.height > 0 && 
                 style.getPropertyValue('content') !== 'none';
        });
      };
      
      // Test the validator
      validateIcon('.bi-clipboard-check');
      validateIcon('.bi-speedometer2');
    });
  });

  // Generate test report
  after(() => {
    cy.visit(`/${iconTestPage}`);
    cy.wait(3000);
    
    cy.window().then((win) => {
      const results = win.iconTestSuite.getTestResults();
      
      // Log final test summary
      cy.log('=== BOOTSTRAP ICONS TEST SUMMARY ===');
      cy.log(`Total Icons: ${results.summary.totalIcons}`);
      cy.log(`Visible Icons: ${results.summary.visibleIcons}`);
      cy.log(`Success Rate: ${results.summary.successRate}%`);
      cy.log(`Browser: ${results.summary.browser}`);
      cy.log(`Overall Status: ${results.summary.overall}`);
      cy.log('=====================================');
      
      // Write results to file (if running in headless mode)
      if (Cypress.env('writeResults')) {
        cy.writeFile('cypress/results/bootstrap-icons-test-results.json', results);
      }
    });
  });
});

// Additional custom Cypress commands for icon testing
Cypress.Commands.add('validateBootstrapIcon', (selector) => {
  return cy.get(selector).should('exist').and('be.visible').and('satisfy', ($el) => {
    const el = $el[0];
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el, '::before');
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.getPropertyValue('content') !== 'none' &&
           $el.hasClass('bi');
  });
});

Cypress.Commands.add('checkIconsOnPage', () => {
  return cy.get('.bi').should('exist').each(($icon) => {
    cy.wrap($icon).should('be.visible');
  });
});

Cypress.Commands.add('takeIconsScreenshot', (name) => {
  return cy.screenshot(`icons-${name}`, {
    capture: 'viewport',
    clip: { x: 0, y: 0, width: 1920, height: 1080 }
  });
});
