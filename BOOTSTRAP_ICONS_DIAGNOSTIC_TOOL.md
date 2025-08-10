# Bootstrap Icons Diagnostic Tool

A comprehensive diagnostic tool to test and debug Bootstrap Icons integration in your Django application.

## Quick Start

### Running the Diagnostic Tool

1. **Start the Django development server:**
   ```bash
   python manage.py runserver
   ```

2. **Navigate to the diagnostic page:**
   ```
   http://localhost:8000/test_icons/
   ```

### Alternative Standalone Usage

You can also run the diagnostic tool as a standalone HTML file:

1. **Open the standalone file:**
   ```bash
   # Open in your default browser
   open test_icons.html
   # Or serve it with Python's HTTP server
   python -m http.server 8080
   # Then navigate to: http://localhost:8080/test_icons.html
   ```

### Validation Testing

To validate that the diagnostic tool is properly installed:

```bash
python test_diagnostic_tool.py
```

## Features

### 🔍 **Test 1-5: Core Icon Testing**
- Tests basic icon rendering (house, search, cart, person)
- E-commerce specific icons (bag, heart, star, credit-card)
- Navigation & UI icons (list, x, filter, grid)
- Font loading status verification
- Interactive icon functionality

### 📊 **Test 6: Network Waterfall Timings**
Shows detailed performance metrics for both CDN and local file loading:

- **DNS Lookup Time**: Domain name resolution
- **Connection Time**: TCP connection establishment
- **Download Time**: Actual file transfer
- **Total Time**: End-to-end loading time
- **Performance Comparison**: Automatically determines which source is faster

### 🔌 **Test 7: CDN Failure Simulation**
Interactive testing of fallback mechanisms:

- **"Simulate CDN Failure" Button**: Removes the CDN link to test local fallback
- **"Restore CDN" Button**: Restores CDN functionality
- **Real-time Status**: Shows current CDN status and fallback behavior
- **Automatic Re-testing**: Runs diagnostics after each change

## Understanding the Results

### ✅ **Success Indicators**
- **Green alerts**: All tests passed, icons loading perfectly
- **Bootstrap Icons font loaded: TRUE**: Font successfully detected
- **CSS Rules working: TRUE**: Icon styling is functional
- **Network timing comparison**: Shows which source is faster

### ⚠️ **Warning Indicators**  
- **Yellow alerts**: Partial functionality, may still work
- **Font not detected**: CDN might still work without local detection
- **CSS Rules working: PARTIAL**: Some styling issues detected

### ❌ **Error Indicators**
- **Red alerts**: Critical issues requiring attention
- **No icons detected as visible**: Icons not rendering
- **Network errors**: Connection or loading failures

## Network Performance Insights

### Timing Interpretation
- **0-50ms**: Excellent performance
- **50-200ms**: Good performance  
- **200-500ms**: Acceptable performance
- **500ms+**: Poor performance, consider optimization
- **Error/Timeout**: Connection failed

### CDN vs Local Comparison
The tool automatically compares CDN and local file performance:
- **CDN Advantages**: Global distribution, caching, reduced server load
- **Local Advantages**: No external dependency, consistent availability
- **Recommendation**: Use CDN with local fallback (current setup)

## Troubleshooting Common Issues

### Icons Not Displaying
1. Check if CDN is accessible
2. Verify local fallback files exist
3. Test with CDN simulation tool
4. Review browser console for errors

### Performance Issues
1. Compare CDN vs local timing
2. Check network conditions
3. Consider preloading critical icons
4. Verify font loading optimization

### Fallback Not Working
1. Use "Simulate CDN Failure" button
2. Check local file paths in base.html
3. Verify static file configuration
4. Test with different browsers

## Technical Implementation

### Network Timing API
The tool uses the [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API) to measure:
- `performance.getEntriesByName()` for detailed resource timing
- `performance.now()` for high-resolution timestamps
- Resource loading events for accurate measurements

### CDN Simulation
- Dynamically removes/restores `<link>` elements
- Tests real fallback behavior without server changes
- Preserves original CDN configuration for restoration

### Cross-Browser Compatibility
- Tested on modern browsers with Performance API support
- Graceful degradation for older browsers
- Progressive enhancement approach

## Development Usage

### For Developers
```javascript
// Check console for detailed logging
console.log('Bootstrap Icons Test Page Loaded');
console.log('Available fonts:', Array.from(document.fonts).map(f => f.family));
console.log('Network Performance API supported:', 'performance' in window && 'getEntriesByName' in performance);
```

### For QA Testing
1. Run full diagnostic suite
2. Test CDN failure simulation
3. Verify performance benchmarks
4. Document any issues found

### For Production Monitoring
- Bookmark the diagnostic URL
- Run periodic checks after deployments
- Monitor network performance trends
- Verify fallback mechanisms work

## Advanced Configuration

### Custom Testing URLs
Modify the `testResourceTiming()` function to test different CDN providers:
```javascript
// Test alternative CDNs
testResourceTiming('https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.2/font/bootstrap-icons.min.css', 'alternative-cdn')
```

### Performance Thresholds
Adjust timing thresholds in `formatTiming()` for your requirements:
```javascript
function formatTiming(ms) {
    if (ms === -1) return 'Error';
    if (ms === -2) return 'Timeout';
    if (ms === 0) return 'N/A';
    if (ms > 1000) return '⚠️ ' + ms.toFixed(1) + 'ms'; // Highlight slow loading
    return ms.toFixed(1) + 'ms';
}
```

## Integration with CI/CD

### Automated Testing
Consider integrating with headless browsers for automated testing:
```javascript
// Puppeteer example
const results = await page.evaluate(() => {
    return {
        fontLoaded: document.fonts.check('16px "Bootstrap Icons"'),
        iconCount: document.querySelectorAll('.bi').length,
        networkTiming: networkTimings
    };
});
```

This diagnostic tool provides comprehensive testing capabilities to ensure your Bootstrap Icons integration is robust, performant, and reliable across different scenarios.
