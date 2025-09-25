// test-browse-mode.js
// Quick test to verify browse mode (empty search) is working
// Run this in browser console on the search page

console.log('🔍 Testing Browse Mode (Empty Search)');
console.log('====================================');

// Function to test browse mode
async function testBrowseMode() {
  console.log('\n📝 Test: Browse Mode (Empty Query)');
  
  try {
    // Test 1: Check if simpleSearchService handles empty queries
    if (typeof window.simpleSearchService !== 'undefined') {
      console.log('✅ simpleSearchService available');
      
      // Test empty query directly
      const result = await window.simpleSearchService.search({ q: '', limit: 20 });
      
      console.log('📊 Browse Mode Results:');
      console.log(`  - Coupons: ${result.coupons.length}`);
      console.log(`  - Businesses: ${result.businesses.length}`);
      console.log(`  - Total: ${result.totalResults}`);
      console.log(`  - Search time: ${result.searchTime}ms`);
      
      if (result.coupons.length > 0) {
        console.log('🎟️ Coupons in browse mode:');
        result.coupons.forEach((coupon, index) => {
          console.log(`  ${index + 1}. "${coupon.title}"`);
        });
      }
      
      return {
        success: true,
        coupons: result.coupons.length,
        businesses: result.businesses.length,
        total: result.totalResults
      };
    } else {
      console.log('❌ simpleSearchService not available');
      return { success: false, error: 'Service not available' };
    }
    
  } catch (error) {
    console.log('❌ Browse mode test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Function to test UI browse functionality
function testBrowseUI() {
  console.log('\n🖥️ Testing Browse Mode UI');
  
  const searchInput = document.querySelector('input[type="text"]');
  const browseButton = document.querySelector('button:contains("Browse All")') || 
                      Array.from(document.querySelectorAll('button')).find(btn => 
                        btn.textContent.includes('Browse') || btn.textContent.includes('All')
                      );
  
  console.log('🔍 UI Elements:');
  console.log(`  - Search input: ${searchInput ? 'Found' : 'Not found'}`);
  console.log(`  - Browse button: ${browseButton ? 'Found' : 'Not found'}`);
  
  if (browseButton) {
    console.log('🎯 Testing Browse button click...');
    browseButton.click();
    
    setTimeout(() => {
      const hasResults = document.querySelector('[class*="coupon"], [class*="business"], [class*="results"]');
      const hasLoading = document.querySelector('[class*="loading"], [class*="searching"]');
      
      console.log(`  - Results appeared: ${!!hasResults}`);
      console.log(`  - Loading state: ${!!hasLoading}`);
    }, 1000);
    
    return true;
  } else if (searchInput) {
    console.log('🎯 Testing empty search submit...');
    searchInput.value = '';
    
    // Trigger form submission
    const form = searchInput.closest('form');
    if (form) {
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
    }
    
    // Also try the Enter key
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    searchInput.dispatchEvent(enterEvent);
    
    console.log('  - Submitted empty search form');
    return true;
  }
  
  return false;
}

// Function to compare browse vs search results
async function compareBrowseVsSearch() {
  console.log('\n📊 Comparing Browse vs Search Results');
  
  if (typeof window.simpleSearchService === 'undefined') {
    console.log('❌ Cannot compare - service not available');
    return;
  }
  
  try {
    // Test browse mode (empty query)
    const browseResult = await window.simpleSearchService.search({ q: '', limit: 20 });
    console.log(`📋 Browse mode: ${browseResult.totalResults} results`);
    
    // Test search mode (pizza query)
    const searchResult = await window.simpleSearchService.search({ q: 'pizza', limit: 20 });
    console.log(`🔍 Pizza search: ${searchResult.totalResults} results`);
    
    // Test search mode (coupon query)
    const couponResult = await window.simpleSearchService.search({ q: 'coupon', limit: 20 });
    console.log(`🎟️ Coupon search: ${couponResult.totalResults} results`);
    
    // Analysis
    console.log('\n🔬 Analysis:');
    if (browseResult.totalResults >= searchResult.totalResults && 
        browseResult.totalResults >= couponResult.totalResults) {
      console.log('✅ Good: Browse mode shows more/equal results than specific searches');
    } else {
      console.log('⚠️ Warning: Browse mode shows fewer results than specific searches');
    }
    
    if (browseResult.totalResults === 0) {
      console.log('❌ Issue: Browse mode returns no results (should show all public coupons)');
    } else {
      console.log(`✅ Good: Browse mode returns ${browseResult.totalResults} results`);
    }
    
  } catch (error) {
    console.log('❌ Comparison failed:', error.message);
  }
}

// Main test function
async function runBrowseTests() {
  console.log('🚀 Starting Browse Mode Tests\n');
  
  const browseResult = await testBrowseMode();
  const uiResult = testBrowseUI();
  
  // Wait a moment then run comparison
  setTimeout(async () => {
    await compareBrowseVsSearch();
    
    // Summary
    console.log('\n🎯 BROWSE MODE TEST SUMMARY');
    console.log('==========================');
    
    if (browseResult.success) {
      console.log(`✅ Browse mode API: ${browseResult.total} results`);
      
      if (browseResult.total === 0) {
        console.log('❌ ISSUE: Browse mode returns no results');
        console.log('💡 Expected: Should return all public active coupons (6 based on database)');
      } else {
        console.log('✅ Browse mode is working - returns results');
      }
    } else {
      console.log('❌ Browse mode API failed:', browseResult.error);
    }
    
    console.log(`${uiResult ? '✅' : '❌'} Browse mode UI: ${uiResult ? 'Working' : 'Issues found'}`);
    
    console.log('\n💡 Next Steps:');
    console.log('1. Navigate to /search page');
    console.log('2. Click "Browse All Deals" button');
    console.log('3. OR submit empty search form');
    console.log('4. Should see all available coupons');
    
  }, 2000);
}

// Make functions available globally
window.testBrowseMode = {
  runAll: runBrowseTests,
  testAPI: testBrowseMode,
  testUI: testBrowseUI,
  compare: compareBrowseVsSearch
};

// Auto-run if on search page
if (window.location.pathname.includes('/search')) {
  console.log('🎯 Detected search page - running browse tests in 1 second...');
  setTimeout(() => {
    runBrowseTests();
  }, 1000);
} else {
  console.log('📋 Browse mode tests loaded. Navigate to /search page and run:');
  console.log('   window.testBrowseMode.runAll()');
}

console.log('\n📚 Available functions:');
console.log('• window.testBrowseMode.runAll() - Run all browse tests');
console.log('• window.testBrowseMode.testAPI() - Test browse API directly');
console.log('• window.testBrowseMode.testUI() - Test browse UI elements');
console.log('• window.testBrowseMode.compare() - Compare browse vs search results');