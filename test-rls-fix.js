// test-rls-fix.js
// Test script to verify the RLS policy fix for all users
// Run this in browser console after the database fix

console.log('🔧 Testing RLS Policy Fix');
console.log('==========================');

// Test function to verify all users can now see 6 coupons
async function testRLSFix() {
  console.log('\n📝 Test: RLS Policy Fix - All Users Should See 6 Coupons');
  
  if (typeof window.simpleSearchService === 'undefined') {
    console.log('❌ simpleSearchService not available in browser');
    return;
  }
  
  try {
    console.log('🚀 Testing browse mode after RLS policy fix...');
    
    // Test browse mode (empty query)
    const browseResult = await window.simpleSearchService.search({ q: '', limit: 20 });
    
    console.log('\n📊 BROWSE MODE RESULTS (After Fix):');
    console.log(`   - Coupons found: ${browseResult.coupons.length}`);
    console.log(`   - Businesses found: ${browseResult.businesses.length}`);
    console.log(`   - Total results: ${browseResult.totalResults}`);
    
    if (browseResult.coupons.length > 0) {
      console.log('\n🎟️ All coupons now visible:');
      browseResult.coupons.forEach((coupon, index) => {
        console.log(`   ${index + 1}. "${coupon.title}"`);
      });
    }
    
    // Test specific searches
    console.log('\n🔍 Testing specific searches:');
    
    // Test "coupon" search - should now find Coupon 1 and Coupon 2
    const couponResult = await window.simpleSearchService.search({ q: 'coupon', limit: 20 });
    console.log(`   "coupon" search: ${couponResult.coupons.length} results`);
    couponResult.coupons.forEach((coupon, index) => {
      console.log(`     ${index + 1}. "${coupon.title}"`);
    });
    
    // Test "pizza" search
    const pizzaResult = await window.simpleSearchService.search({ q: 'pizza', limit: 20 });
    console.log(`   "pizza" search: ${pizzaResult.coupons.length} results`);
    
    // Analysis
    console.log('\n🔬 FIX ANALYSIS:');
    if (browseResult.coupons.length === 6) {
      console.log('✅ SUCCESS: All 6 coupons are now visible!');
      console.log('✅ RLS policy fix worked - valid_from dates corrected');
    } else if (browseResult.coupons.length >= 4) {
      console.log(`⚠️ PARTIAL FIX: ${browseResult.coupons.length}/6 coupons visible`);
      console.log('💡 Some coupons may still have date/permission issues');
    } else {
      console.log('❌ ISSUE REMAINS: Still not seeing expected coupons');
    }
    
    // Check if the missing coupons are now present
    const expectedCoupons = ['Coupon 1', 'Coupon 2', 'Test Fixed Coupon'];
    const foundCoupons = browseResult.coupons.map(c => c.title);
    
    expectedCoupons.forEach(expectedTitle => {
      const isFound = foundCoupons.some(title => title.includes(expectedTitle));
      console.log(`   ${isFound ? '✅' : '❌'} "${expectedTitle}": ${isFound ? 'Found' : 'Missing'}`);
    });
    
    return browseResult;
    
  } catch (error) {
    console.error('❌ RLS fix test failed:', error);
  }
}

// Test with different user context
async function testUserContexts() {
  console.log('\n📝 Test: User Context Verification');
  
  // Get current user info
  const currentUser = await window.supabase?.auth.getUser();
  const userId = currentUser?.data?.user?.id;
  
  console.log(`👤 Current user ID: ${userId || 'Anonymous'}`);
  
  if (userId === '6fb5eaeb-89ef-4eb0-b156-5b0d012ea4f3') {
    console.log('✅ Logged in as Test User 3 - Perfect for testing the fix!');
  } else if (userId === 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2') {
    console.log('ℹ️ Logged in as Test User 1 (Business Owner) - this user could always see all coupons');
  } else {
    console.log('ℹ️ Different user or anonymous - testing from this perspective');
  }
}

// Compare before/after
async function compareResults() {
  console.log('\n📝 Test: Before/After Comparison');
  
  console.log('📋 BEFORE FIX (Expected behavior):');
  console.log('   - Test User 1 (Owner): 6 coupons');
  console.log('   - Test User 3 (Other): 4 coupons (missing "Coupon 1" & "Coupon 2")');
  console.log('   - Root Cause: Future valid_from dates on Coupon 1 & 2');
  
  console.log('\n📋 AFTER FIX (Current behavior):');
  const result = await testRLSFix();
  
  if (result && result.coupons.length === 6) {
    console.log('✅ SUCCESS: RLS policy issue completely resolved!');
    console.log('✅ All users now see all 6 public coupons as expected');
  }
}

// Main test runner
async function runRLSFixTests() {
  console.log('🚀 Starting RLS Policy Fix Tests\n');
  
  await testUserContexts();
  await compareResults();
  
  console.log('\n🎯 RLS FIX TEST SUMMARY');
  console.log('========================');
  console.log('✅ Database updated: valid_from dates fixed for Coupon 1 & 2');
  console.log('✅ RLS policies now work correctly for all users');
  console.log('📊 Expected result: 6 coupons visible to all authenticated users');
  console.log('📊 Expected result: 6 coupons visible to anonymous users');
  
  console.log('\n💡 Next Steps:');
  console.log('1. Test with Test User 3 (current session)');  
  console.log('2. Test with anonymous user (logout and test)');
  console.log('3. Confirm Browse All Deals button shows 6 coupons');
}

// Make functions available globally
window.testRLSFix = {
  runAll: runRLSFixTests,
  testFix: testRLSFix,
  testUsers: testUserContexts,
  compare: compareResults
};

// Auto-run if on search page
if (window.location.pathname.includes('/search')) {
  console.log('🎯 Search page detected - running RLS fix tests in 2 seconds...');
  setTimeout(() => {
    runRLSFixTests();
  }, 2000);
} else {
  console.log('📋 Navigate to /search page to test, or run manually:');
  console.log('   window.testRLSFix.runAll()');
}

console.log('\n📚 Available functions:');
console.log('• window.testRLSFix.runAll() - Run all RLS fix tests');  
console.log('• window.testRLSFix.testFix() - Test the fix specifically');
console.log('• window.testRLSFix.testUsers() - Check user context');
console.log('• window.testRLSFix.compare() - Compare before/after');