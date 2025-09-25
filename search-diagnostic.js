// search-diagnostic.js
// Comprehensive diagnostic script for search issues
// Run this in browser console on the search page

console.log('🔧 Search Diagnostic Tool Starting...');

function runSearchDiagnostics() {
  console.log('\n=== SEARCH DIAGNOSTICS ===');
  
  // Test 1: Check if search services are available
  console.log('\n1. Checking Search Services...');
  console.log('   simpleSearchService available:', typeof window.simpleSearchService !== 'undefined');
  console.log('   supabase available:', typeof window.supabase !== 'undefined');
  
  // Test 2: Check DOM elements
  console.log('\n2. Checking DOM Elements...');
  const searchInput = document.querySelector('input[type="text"]');
  const searchButton = document.querySelector('button[type="submit"]');
  const searchForm = document.querySelector('form');
  
  console.log('   Search input found:', !!searchInput);
  console.log('   Search button found:', !!searchButton);
  console.log('   Search form found:', !!searchForm);
  
  if (searchInput) {
    console.log('   Current input value:', `"${searchInput.value}"`);
    console.log('   Input placeholder:', searchInput.placeholder);
  }
  
  // Test 3: Test direct search service
  console.log('\n3. Testing Direct Search Service...');
  if (window.simpleSearchService) {
    const testQueries = ['coupon', 'test', 'business'];
    
    testQueries.forEach((query, index) => {
      setTimeout(async () => {
        console.log(`\n3.${index + 1} Testing search for: "${query}"`);
        try {
          const result = await window.simpleSearchService.search({ q: query });
          console.log(`   ✅ Direct search for "${query}":`, {
            coupons: result.coupons.length,
            businesses: result.businesses.length,
            total: result.totalResults,
            time: result.searchTime + 'ms'
          });
          
          if (result.coupons.length > 0) {
            console.log('   📋 Coupon titles:', result.coupons.map(c => c.title));
          }
          if (result.businesses.length > 0) {
            console.log('   🏢 Business names:', result.businesses.map(b => b.business_name));
          }
        } catch (error) {
          console.log(`   ❌ Direct search for "${query}" failed:`, error.message);
        }
      }, index * 1000);
    });
  }
  
  // Test 4: Test UI interactions
  console.log('\n4. Setting up UI interaction tests...');
  
  if (searchInput && searchForm) {
    // Test Enter key
    setTimeout(() => {
      console.log('\n4.1 Testing ENTER key submission...');
      searchInput.value = 'test-enter';
      searchInput.focus();
      
      // Simulate Enter key
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        bubbles: true
      });
      
      console.log('   Triggering Enter key on input...');
      searchInput.dispatchEvent(enterEvent);
      
      // Also trigger form submit
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      console.log('   Triggering form submit...');
      searchForm.dispatchEvent(submitEvent);
      
    }, 4000);
    
    // Test button click
    setTimeout(() => {
      console.log('\n4.2 Testing BUTTON click submission...');
      searchInput.value = 'test-button';
      
      if (searchButton) {
        console.log('   Clicking search button...');
        searchButton.click();
      }
      
    }, 6000);
  }
  
  // Test 5: Monitor search events
  console.log('\n5. Setting up search event monitoring...');
  
  // Monitor form submissions
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      console.log('🎯 [EVENT] Form submitted:', {
        inputValue: searchInput?.value,
        preventDefault: e.defaultPrevented,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  // Monitor input changes
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      console.log('📝 [EVENT] Input changed:', e.target.value);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        console.log('⌨️ [EVENT] Enter key pressed on input');
      }
    });
  }
  
  // Monitor button clicks
  if (searchButton) {
    searchButton.addEventListener('click', (e) => {
      console.log('🖱️ [EVENT] Search button clicked:', {
        buttonText: e.target.textContent,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  console.log('\n✅ Search diagnostics setup complete!');
  console.log('   - Direct API tests will run over the next 3 seconds');
  console.log('   - UI interaction tests will start after 4 seconds');
  console.log('   - Event monitoring is now active');
  
  return {
    searchInput,
    searchButton,
    searchForm,
    testQuery: (query) => window.simpleSearchService?.search({ q: query })
  };
}

// Auto-run diagnostics
const diagnostics = runSearchDiagnostics();

// Make available globally
window.searchDiagnostics = {
  run: runSearchDiagnostics,
  testQuery: (query) => {
    console.log(`\n🔍 Manual test for: "${query}"`);
    return window.simpleSearchService?.search({ q: query });
  }
};

console.log('\n💡 Available commands:');
console.log('   window.searchDiagnostics.run() - Run full diagnostics');
console.log('   window.searchDiagnostics.testQuery("coupon") - Test specific query');