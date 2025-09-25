// test-search-fix.js  
// Test the search functionality after the debugging improvements
// This should be run in the browser console on /search page

console.log('🔧 Testing Search Fix');
console.log('====================');

// Test function to verify browse mode
async function testBrowseModeFixed() {
  console.log('\n📝 Test: Browse Mode (Empty Query) - Enhanced Debugging');
  
  if (typeof window.simpleSearchService === 'undefined') {
    console.log('❌ simpleSearchService not available in browser');
    return;
  }
  
  try {
    console.log('🚀 Starting browse mode test with enhanced debugging...');
    
    // Test empty query (browse mode)
    const result = await window.simpleSearchService.search({ q: '', limit: 20 });
    
    console.log('\n📊 BROWSE MODE RESULTS:');
    console.log(`   - Coupons found: ${result.coupons.length}`);
    console.log(`   - Businesses found: ${result.businesses.length}`);
    console.log(`   - Total results: ${result.totalResults}`);
    console.log(`   - Search time: ${result.searchTime}ms`);
    
    if (result.coupons.length > 0) {
      console.log('\n🎟️ Coupons returned:');
      result.coupons.forEach((coupon, index) => {
        console.log(`   ${index + 1}. "${coupon.title}" (Business: ${coupon.business_id?.slice(0, 8) || 'unknown'}...)`);
      });
    }
    
    // Analysis
    console.log('\n🔬 Analysis:');
    if (result.coupons.length === 0) {
      console.log('❌ ISSUE: No coupons returned from browse mode');
      console.log('💡 Check the console logs above for RLS or filtering issues');
    } else if (result.coupons.length < 6) {
      console.log(`⚠️ PARTIAL ISSUE: Expected 6 coupons, got ${result.coupons.length}`);
      console.log('💡 Check if RLS policies are filtering out some coupons');
    } else {
      console.log('✅ SUCCESS: Correct number of coupons returned');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Browse mode test failed:', error);
  }
}

// Test specific search terms
async function testSearchTerms() {
  console.log('\n📝 Test: Search Terms');
  
  if (typeof window.simpleSearchService === 'undefined') {
    return;
  }
  
  const searchTerms = ['pizza', 'coupon', 'coffee', 'test'];
  
  for (const term of searchTerms) {
    try {
      console.log(`\n🔍 Testing search term: "${term}"`);
      const result = await window.simpleSearchService.search({ q: term, limit: 20 });
      
      console.log(`   Results: ${result.coupons.length} coupons, ${result.businesses.length} businesses`);
      
      if (result.coupons.length > 0) {
        result.coupons.forEach((coupon, index) => {
          console.log(`     ${index + 1}. "${coupon.title}"`);
        });
      }
      
    } catch (error) {
      console.error(`❌ Search for "${term}" failed:`, error);
    }
  }
}

// Test UI interaction
function testUIInteraction() {
  console.log('\n📝 Test: UI Interaction');
  
  const searchInput = document.querySelector('input[type="text"]');
  const browseButton = document.querySelector('button:contains("Browse All"), button:contains("Browse")') ||
                      Array.from(document.querySelectorAll('button')).find(btn => 
                        btn.textContent.includes('Browse All') || btn.textContent.includes('Browse')
                      );
  
  console.log(`🔍 Search input found: ${!!searchInput}`);
  console.log(`🔍 Browse button found: ${!!browseButton}`);
  
  if (browseButton) {
    console.log('🎯 Clicking Browse All button...');
    browseButton.click();
    
    setTimeout(() => {
      const coupons = document.querySelectorAll('[class*="coupon"], [data-testid="coupon"]');
      const businesses = document.querySelectorAll('[class*="business"], [data-testid="business"]');
      const noResults = document.querySelectorAll(':contains("No results"), :contains("no results")');
      
      console.log(`📊 UI Results after Browse All click:`);
      console.log(`   - Coupon elements: ${coupons.length}`);
      console.log(`   - Business elements: ${businesses.length}`);
      console.log(`   - "No results" messages: ${noResults.length}`);
      
      if (coupons.length === 0 && noResults.length === 0) {
        console.log('⚠️ No results shown in UI - check if results are rendering');
      }
    }, 2000);
    
  } else if (searchInput) {
    console.log('🎯 Testing empty search input...');
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Submit the form or trigger search
    const form = searchInput.closest('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  }
}

// Main test runner
async function runSearchFixTests() {
  console.log('🚀 Starting Search Fix Tests\n');
  
  // Test 1: Browse mode with enhanced debugging
  await testBrowseModeFixed();
  
  // Test 2: Search terms
  await testSearchTerms();
  
  // Test 3: UI interaction
  testUIInteraction();
  
  console.log('\n🎯 SEARCH FIX TEST SUMMARY');
  console.log('=========================');
  console.log('✅ Tests completed');
  console.log('💡 Check the console logs above for detailed debugging info');
  console.log('💡 Look for RLS policy issues or business filtering problems');
}

// Make functions available globally
window.testSearchFix = {
  runAll: runSearchFixTests,
  testBrowse: testBrowseModeFixed,
  testTerms: testSearchTerms,
  testUI: testUIInteraction
};

// Auto-run if on search page
if (window.location.pathname.includes('/search')) {
  console.log('🎯 Search page detected - running tests in 2 seconds...');
  setTimeout(() => {
    runSearchFixTests();
  }, 2000);
} else {
  console.log('📋 Navigate to /search page to run tests automatically, or run:');
  console.log('   window.testSearchFix.runAll()');
}

console.log('\n📚 Available functions:');
console.log('• window.testSearchFix.runAll() - Run all tests');
console.log('• window.testSearchFix.testBrowse() - Test browse mode');
console.log('• window.testSearchFix.testTerms() - Test search terms');
console.log('• window.testSearchFix.testUI() - Test UI interaction');