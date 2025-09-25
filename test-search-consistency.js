// test-search-consistency.js
// Test script to verify search consistency fixes
// Run this in the browser console on the search page

console.log('🔧 Testing Search Consistency Fixes');
console.log('===================================');

// Test different search scenarios to check consistency

const testScenarios = [
  {
    name: 'Empty Query (Browse Mode)',
    query: '',
    description: 'Should show all public active coupons'
  },
  {
    name: 'Single Character',
    query: 'p',
    description: 'Should show coupons/businesses containing "p"'
  },
  {
    name: 'Common Term',
    query: 'pizza',
    description: 'Should show pizza-related results'
  },
  {
    name: 'Business Name',
    query: 'Test Business',
    description: 'Should show coupons from Test Business'
  },
  {
    name: 'Coupon Title',
    query: 'Coupon 1',
    description: 'Should show specific coupon'
  }
];

// Function to test search scenarios
async function testSearchScenario(scenario) {
  console.log(`\n📝 Testing: ${scenario.name}`);
  console.log(`📋 Query: "${scenario.query}"`);
  console.log(`📋 Expected: ${scenario.description}`);
  
  try {
    // Check if simpleSearchService is available
    if (typeof window.simpleSearchService === 'undefined') {
      console.log('❌ simpleSearchService not available');
      return { success: false, error: 'Service not available' };
    }
    
    // Execute search
    const startTime = performance.now();
    const result = await window.simpleSearchService.search({
      q: scenario.query,
      limit: 20
    });
    const endTime = performance.now();
    
    // Log results
    console.log('✅ Search completed in', Math.round(endTime - startTime), 'ms');
    console.log('📊 Results:');
    console.log(`  - Coupons: ${result.coupons.length}`);
    console.log(`  - Businesses: ${result.businesses.length}`);
    console.log(`  - Total: ${result.totalResults}`);
    
    // Log coupon details for debugging
    if (result.coupons.length > 0) {
      console.log('🎟️ Coupons found:');
      result.coupons.forEach((coupon, index) => {
        console.log(`  ${index + 1}. "${coupon.title}" (Business: ${coupon.business_id})`);
      });
    }
    
    // Log business details
    if (result.businesses.length > 0) {
      console.log('🏢 Businesses found:');
      result.businesses.forEach((business, index) => {
        console.log(`  ${index + 1}. "${business.business_name}" (${business.business_type || 'No type'})`);
      });
    }
    
    return { 
      success: true, 
      result: {
        coupons: result.coupons.length,
        businesses: result.businesses.length,
        total: result.totalResults,
        searchTime: Math.round(endTime - startTime)
      }
    };
    
  } catch (error) {
    console.log('❌ Search failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Function to test UI interaction
function testUIConsistency() {
  console.log('\n🖥️ Testing UI Consistency');
  console.log('========================');
  
  const searchInput = document.querySelector('input[type="text"]');
  if (!searchInput) {
    console.log('❌ Search input not found');
    return false;
  }
  
  console.log('✅ Search input found');
  
  // Test different input scenarios
  const testInputs = ['', 'pizza', 'test', 'coffee'];
  
  testInputs.forEach((testValue, index) => {
    setTimeout(() => {
      console.log(`\n🎯 UI Test ${index + 1}: Setting input to "${testValue}"`);
      searchInput.value = testValue;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Check what the UI shows
      setTimeout(() => {
        const hasResults = document.querySelector('[class*="results"], [class*="coupon"], [class*="business"]');
        const hasLoading = document.querySelector('[class*="loading"], [class*="searching"]');
        const hasError = document.querySelector('[class*="error"]');
        
        console.log(`  UI State: Results=${!!hasResults}, Loading=${!!hasLoading}, Error=${!!hasError}`);
      }, 500);
    }, index * 1000);
  });
  
  return true;
}

// Main test runner
async function runConsistencyTests() {
  console.log('🚀 Starting Search Consistency Tests\n');
  
  const results = [];
  
  // Test each scenario
  for (const scenario of testScenarios) {
    const result = await testSearchScenario(scenario);
    results.push({
      scenario: scenario.name,
      ...result
    });
    
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test UI consistency
  testUIConsistency();
  
  // Summary
  console.log('\n📋 CONSISTENCY TEST SUMMARY');
  console.log('===========================');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total} tests`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const details = result.success 
      ? `(${result.result.total} results in ${result.result.searchTime}ms)`
      : `(${result.error})`;
    console.log(`  ${status} ${result.scenario} ${details}`);
  });
  
  // Check for specific consistency issues
  console.log('\n🔍 CONSISTENCY ANALYSIS');
  console.log('======================');
  
  const successfulResults = results.filter(r => r.success && r.result);
  
  if (successfulResults.length >= 2) {
    // Check if empty query returns results
    const emptyQuery = successfulResults.find(r => r.scenario === 'Empty Query (Browse Mode)');
    if (emptyQuery && emptyQuery.result.total === 0) {
      console.log('⚠️ ISSUE: Empty query returns no results (should show browse results)');
    } else if (emptyQuery && emptyQuery.result.total > 0) {
      console.log(`✅ Good: Empty query shows ${emptyQuery.result.total} browse results`);
    }
    
    // Check search times
    const avgSearchTime = successfulResults.reduce((sum, r) => sum + r.result.searchTime, 0) / successfulResults.length;
    console.log(`📊 Average search time: ${Math.round(avgSearchTime)}ms`);
    
    if (avgSearchTime > 1000) {
      console.log('⚠️ WARNING: Average search time is high (>1000ms)');
    } else {
      console.log('✅ Good: Search performance is acceptable');
    }
  }
  
  return results;
}

// Make functions globally available
window.testSearchConsistency = {
  runAll: runConsistencyTests,
  testScenario: testSearchScenario,
  testUI: testUIConsistency
};

// Auto-run if on search page
if (window.location.pathname.includes('/search')) {
  console.log('🎯 Detected search page - running tests in 2 seconds...');
  setTimeout(() => {
    runConsistencyTests();
  }, 2000);
} else {
  console.log('📋 Search consistency tests loaded. Navigate to /search page and run:');
  console.log('   window.testSearchConsistency.runAll()');
}

console.log('\n📚 Available test functions:');
console.log('• window.testSearchConsistency.runAll() - Run all consistency tests');
console.log('• window.testSearchConsistency.testScenario(scenario) - Test specific scenario');
console.log('• window.testSearchConsistency.testUI() - Test UI consistency');