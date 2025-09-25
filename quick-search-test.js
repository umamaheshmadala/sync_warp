// quick-search-test.js
// Quick test script to run in browser console on search page
// Tests the simplified search functionality

console.log('🔍 Story 4.4 Quick Search Test');
console.log('===============================');

// Test 1: Check if simple search service is available
function testSimpleSearchService() {
  console.log('\n📝 Test 1: Simple Search Service');
  
  if (typeof window.simpleSearchService !== 'undefined') {
    console.log('✅ Simple search service is available');
    return true;
  } else {
    console.log('❌ Simple search service not found');
    console.log('💡 Make sure you\'re on the search page and the server is running');
    return false;
  }
}

// Test 2: Test direct API call
async function testDirectSearch() {
  console.log('\n📝 Test 2: Direct Search API Call');
  
  if (!window.simpleSearchService) return false;
  
  try {
    const result = await window.simpleSearchService.search({ q: 'pizza' });
    console.log('✅ Direct search successful:', result);
    console.log('   - Coupons found:', result.coupons.length);
    console.log('   - Businesses found:', result.businesses.length);
    console.log('   - Total results:', result.totalResults);
    console.log('   - Search time:', result.searchTime + 'ms');
    return true;
  } catch (error) {
    console.log('❌ Direct search failed:', error.message);
    return false;
  }
}

// Test 3: Test search suggestions
async function testSuggestions() {
  console.log('\n📝 Test 3: Search Suggestions');
  
  if (!window.simpleSearchService) return false;
  
  try {
    const suggestions = await window.simpleSearchService.getSuggestions('pi');
    console.log('✅ Suggestions successful:', suggestions);
    console.log('   - Suggestions count:', suggestions.length);
    return true;
  } catch (error) {
    console.log('❌ Suggestions failed:', error.message);
    return false;
  }
}

// Test 4: Test search input interaction
function testSearchInputInteraction() {
  console.log('\n📝 Test 4: Search Input Interaction');
  
  const searchInput = document.querySelector('input[type="text"]');
  if (!searchInput) {
    console.log('❌ Search input not found');
    return false;
  }
  
  console.log('✅ Search input found');
  
  // Test typing simulation
  searchInput.value = 'pizza';
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  
  console.log('✅ Simulated typing "pizza"');
  console.log('   - Input value:', searchInput.value);
  
  return true;
}

// Test 5: Check for React components
function testReactComponents() {
  console.log('\n📝 Test 5: React Components Check');
  
  const components = {
    'Search Form': document.querySelector('form'),
    'Search Input': document.querySelector('input[type="text"]'),
    'Search Button': document.querySelector('button[type="submit"]'),
    'Filter Elements': document.querySelectorAll('[class*="filter"], [class*="Filter"]').length,
    'Sort Elements': document.querySelectorAll('select').length,
    'Results Area': document.querySelector('[class*="results"], [class*="search"]') || document.querySelector('main')
  };
  
  Object.entries(components).forEach(([name, element]) => {
    if (element) {
      const count = typeof element === 'number' ? element : 1;
      console.log(`✅ ${name}: ${count > 0 ? count : 'Found'}`);
    } else {
      console.log(`⚠️ ${name}: Not found`);
    }
  });
  
  return true;
}

// Main test runner
async function runQuickTests() {
  console.log('🚀 Running Quick Search Tests...\n');
  
  const results = {
    simpleService: testSimpleSearchService(),
    components: testReactComponents(),
    inputInteraction: testSearchInputInteraction(),
    directSearch: false,
    suggestions: false
  };
  
  // Only run async tests if service is available
  if (results.simpleService) {
    results.directSearch = await testDirectSearch();
    results.suggestions = await testSuggestions();
  }
  
  // Summary
  console.log('\n🎯 Test Results Summary');
  console.log('========================');
  
  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;
  
  console.log(`✅ Passed: ${passed}/${total} tests`);
  console.log('📊 Details:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${test}`);
  });
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Search functionality is working.');
    console.log('💡 Now try manual testing:');
    console.log('   1. Type "pizza" in the search box');
    console.log('   2. Check if results appear or if you see "No results found"');
    console.log('   3. Try different search terms like "coffee", "burger"');
  } else {
    console.log('\n⚠️ Some tests failed. Check the issues above.');
    console.log('💡 Common fixes:');
    console.log('   1. Make sure you\'re on http://localhost:5173/search');
    console.log('   2. Refresh the page and try again');
    console.log('   3. Check browser console for errors');
    console.log('   4. Ensure test data exists in database');
  }
  
  return results;
}

// Auto-run if on search page
if (window.location.pathname.includes('/search')) {
  console.log('🎯 Detected search page - running tests...');
  setTimeout(runQuickTests, 1000);
} else {
  console.log('📋 Quick search tests loaded. Navigate to /search page and run:');
  console.log('   runQuickTests()');
}

// Make functions available
window.testSearch = {
  runAll: runQuickTests,
  testService: testSimpleSearchService,
  testDirect: testDirectSearch,
  testSuggestions: testSuggestions,
  testInput: testSearchInputInteraction,
  testComponents: testReactComponents
};

console.log('\n📚 Available test functions:');
console.log('• window.testSearch.runAll() - Run all tests');
console.log('• window.testSearch.testService() - Test search service');
console.log('• window.testSearch.testDirect() - Test direct search');
console.log('• window.testSearch.testSuggestions() - Test suggestions');
console.log('• window.testSearch.testInput() - Test input interaction');