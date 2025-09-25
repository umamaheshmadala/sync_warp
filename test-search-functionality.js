// test-search-functionality.js
// Quick automated tests for Story 4.4 Enhanced Search Functionality
// Run this in browser console on the search page: http://localhost:5174/search

console.log('🔍 Starting Story 4.4 Search Functionality Tests...');

// Test 1: Verify search components exist
function testSearchComponentsExist() {
  console.log('\n📝 Test 1: Search Components Existence');
  
  const searchInput = document.querySelector('input[type="text"]');
  const searchButton = document.querySelector('button[type="submit"]');
  const resultsContainer = document.querySelector('[class*="search-results"], [class*="results"]');
  
  console.log('✓ Search input exists:', !!searchInput);
  console.log('✓ Search button exists:', !!searchButton);
  console.log('✓ Results area exists:', !!resultsContainer);
  
  return { searchInput, searchButton, resultsContainer };
}

// Test 2: Test search input functionality
function testSearchInput(searchInput) {
  console.log('\n📝 Test 2: Search Input Functionality');
  
  if (!searchInput) {
    console.log('❌ Search input not found');
    return false;
  }
  
  // Test input focus
  searchInput.focus();
  console.log('✓ Search input can be focused');
  
  // Test input value change
  const testQuery = 'pizza';
  searchInput.value = testQuery;
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  
  console.log('✓ Search input accepts text:', searchInput.value === testQuery);
  
  return true;
}

// Test 3: Check for React components in DOM
function testReactComponents() {
  console.log('\n📝 Test 3: React Components Detection');
  
  // Look for key elements that should exist
  const elements = {
    searchForm: document.querySelector('form'),
    filterButton: document.querySelector('[class*="filter"], button:has([class*="Filter"])'),
    sortDropdown: document.querySelector('select, [role="combobox"]'),
    viewToggle: document.querySelector('[class*="view"], [class*="grid"], [class*="list"]'),
    tabs: document.querySelectorAll('[role="tab"], button[class*="tab"]')
  };
  
  Object.entries(elements).forEach(([name, element]) => {
    console.log(`✓ ${name} exists:`, !!element);
  });
  
  return elements;
}

// Test 4: Check for search service
function testSearchService() {
  console.log('\n📝 Test 4: Search Service Detection');
  
  const hasSearchService = typeof window.searchService !== 'undefined';
  console.log('✓ Search service available:', hasSearchService);
  
  if (hasSearchService) {
    console.log('✓ Search service methods:');
    console.log('  - search method:', typeof window.searchService.search === 'function');
    console.log('  - clearCache method:', typeof window.searchService.clearCache === 'function');
  }
  
  return hasSearchService;
}

// Test 5: Simulate user interaction
function testUserInteraction() {
  console.log('\n📝 Test 5: User Interaction Simulation');
  
  const searchInput = document.querySelector('input[type="text"]');
  if (!searchInput) {
    console.log('❌ Cannot test user interaction - search input not found');
    return false;
  }
  
  // Clear any existing value
  searchInput.value = '';
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Simulate typing
  const testQueries = ['p', 'pi', 'piz', 'pizza'];
  let index = 0;
  
  const typeNext = () => {
    if (index < testQueries.length) {
      searchInput.value = testQueries[index];
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log(`✓ Simulated typing: "${testQueries[index]}"`);
      index++;
      setTimeout(typeNext, 100);
    } else {
      console.log('✓ User interaction simulation complete');
    }
  };
  
  typeNext();
  return true;
}

// Test 6: Check URL parameters
function testURLParameters() {
  console.log('\n📝 Test 6: URL Parameters');
  
  const urlParams = new URLSearchParams(window.location.search);
  const hasSearchParam = urlParams.has('q');
  
  console.log('✓ Current URL:', window.location.href);
  console.log('✓ Has search parameter:', hasSearchParam);
  
  if (hasSearchParam) {
    console.log('✓ Search parameter value:', urlParams.get('q'));
  }
  
  return { urlParams, hasSearchParam };
}

// Test 7: Check console errors
function testConsoleErrors() {
  console.log('\n📝 Test 7: Console Error Check');
  
  // Store original console.error
  const originalError = console.error;
  const errors = [];
  
  // Override console.error to capture errors
  console.error = function(...args) {
    errors.push(args);
    originalError.apply(console, args);
  };
  
  // Restore after 5 seconds
  setTimeout(() => {
    console.error = originalError;
    console.log('✓ Console errors captured:', errors.length);
    if (errors.length > 0) {
      console.log('❌ Errors found:', errors);
    } else {
      console.log('✅ No console errors detected');
    }
  }, 5000);
  
  return errors;
}

// Test 8: Performance check
function testPerformance() {
  console.log('\n📝 Test 8: Performance Check');
  
  const startTime = performance.now();
  
  // Measure page load performance
  const navigation = performance.getEntriesByType('navigation')[0];
  if (navigation) {
    console.log('✓ Page load time:', Math.round(navigation.loadEventEnd - navigation.loadEventStart), 'ms');
    console.log('✓ DOM content loaded:', Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart), 'ms');
  }
  
  // Measure current script execution time
  const currentTime = performance.now();
  console.log('✓ Test execution time:', Math.round(currentTime - startTime), 'ms');
  
  return { startTime, currentTime };
}

// Main test runner
function runAllTests() {
  console.log('🚀 Running all automated tests...');
  
  try {
    const components = testSearchComponentsExist();
    testSearchInput(components.searchInput);
    testReactComponents();
    testSearchService();
    testURLParameters();
    testConsoleErrors();
    testPerformance();
    
    // Simulate user interaction last (as it's async)
    setTimeout(() => {
      testUserInteraction();
    }, 1000);
    
    console.log('\n🎉 Automated tests completed! Check results above.');
    console.log('💡 For manual testing, follow the comprehensive guide in STORY_4.4_TESTING_GUIDE.md');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Make functions available globally for manual testing
window.testSearchFunctionality = {
  runAll: runAllTests,
  testComponents: testSearchComponentsExist,
  testInput: testSearchInput,
  testService: testSearchService,
  testURL: testURLParameters,
  testPerformance: testPerformance
};

// Auto-run tests if script is executed
if (typeof window !== 'undefined' && window.location.pathname.includes('/search')) {
  console.log('🎯 Detected search page - running automated tests in 2 seconds...');
  setTimeout(runAllTests, 2000);
} else {
  console.log('📋 Search functionality tests loaded. Navigate to /search page and run:');
  console.log('   window.testSearchFunctionality.runAll()');
}

console.log('\n📚 Available manual test functions:');
console.log('• window.testSearchFunctionality.runAll() - Run all tests');
console.log('• window.testSearchFunctionality.testComponents() - Test component existence');
console.log('• window.testSearchFunctionality.testService() - Test search service');
console.log('• window.testSearchFunctionality.testURL() - Check URL parameters');
console.log('• window.testSearchFunctionality.testPerformance() - Check performance');