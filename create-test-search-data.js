// create-test-search-data.js
// Script to create sample coupons for testing search functionality
// Run this in browser console after logging in as a business owner

console.log('🎯 Creating test data for Story 4.4 Search Testing...');

// Test coupon data for different search scenarios
const testCoupons = [
  {
    title: "25% Off Pizza Orders",
    description: "Get 25% discount on all pizza orders over ₹500",
    type: "percentage",
    discount_value: 25,
    min_purchase_amount: 500,
    terms_conditions: "Valid for dine-in and takeaway orders",
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    target_audience: "all_users",
    is_public: true
  },
  {
    title: "₹100 Off Coffee Shop",
    description: "Save ₹100 on coffee and pastries at our cafe",
    type: "fixed_amount",
    discount_value: 100,
    min_purchase_amount: 300,
    terms_conditions: "Cannot be combined with other offers",
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days
    target_audience: "all_users",
    is_public: true
  },
  {
    title: "Buy 2 Burgers Get 1 Free",
    description: "Amazing BOGO deal on all burger varieties",
    type: "buy_x_get_y",
    discount_value: 100,
    min_purchase_amount: 400,
    terms_conditions: "Valid on burgers of equal or lesser value",
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    target_audience: "all_users",
    is_public: true
  },
  {
    title: "Free Dessert with Meal",
    description: "Complimentary dessert with any main course order",
    type: "free_item",
    discount_value: 150,
    min_purchase_amount: 800,
    terms_conditions: "Select desserts only. Valid till stocks last",
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days
    target_audience: "returning_users",
    is_public: true
  },
  {
    title: "50% Off Restaurant Week",
    description: "Half price on all items during restaurant week special",
    type: "percentage",
    discount_value: 50,
    min_purchase_amount: 1000,
    terms_conditions: "Valid from Monday to Friday only",
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days
    target_audience: "all_users",
    is_public: true
  }
];

// Function to create test coupons
async function createTestCoupons() {
  console.log('📝 Starting test coupon creation...');
  
  // Check if user is logged in
  if (typeof window === 'undefined' || !window.location.href.includes('localhost')) {
    console.log('❌ This script should be run in the browser on localhost');
    return false;
  }
  
  // Get business ID from current user (you'll need to replace this)
  const getCurrentBusinessId = () => {
    // This is a placeholder - in real testing, you'd need to:
    // 1. Log in as a business owner
    // 2. Navigate to business dashboard  
    // 3. Get the business ID from the URL or user state
    const urlPath = window.location.pathname;
    const businessIdMatch = urlPath.match(/\/business\/([a-f0-9-]+)/);
    
    if (businessIdMatch) {
      return businessIdMatch[1];
    }
    
    // If no business ID in URL, try to get from localStorage or prompt user
    const storedBusinessId = localStorage.getItem('currentBusinessId');
    if (storedBusinessId) {
      return storedBusinessId;
    }
    
    return prompt('Enter your business ID for creating test coupons:');
  };
  
  const businessId = getCurrentBusinessId();
  
  if (!businessId) {
    console.log('❌ Business ID is required to create test coupons');
    console.log('💡 Please:');
    console.log('   1. Log in as a business owner');
    console.log('   2. Navigate to your business dashboard');
    console.log('   3. Run this script again');
    return false;
  }
  
  console.log('✓ Using business ID:', businessId);
  
  // Check if useCoupons hook is available
  if (typeof window.testCouponCreation === 'undefined') {
    console.log('❌ Coupon creation utility not available');
    console.log('💡 Make sure you\'re on a page with coupon functionality loaded');
    return false;
  }
  
  // Create each test coupon
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < testCoupons.length; i++) {
    const couponData = testCoupons[i];
    
    try {
      console.log(`📝 Creating coupon ${i + 1}/${testCoupons.length}: "${couponData.title}"`);
      
      // Use the existing test coupon creation utility if available
      if (typeof window.testCouponCreation === 'function') {
        await window.testCouponCreation();
      } else {
        // Manual API call if test utility not available
        const response = await fetch('/api/coupons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...couponData,
            business_id: businessId
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      successCount++;
      console.log(`✅ Created: "${couponData.title}"`);
      
      // Small delay between creations
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      failureCount++;
      console.log(`❌ Failed to create "${couponData.title}":`, error.message);
    }
  }
  
  console.log('\n🎉 Test coupon creation completed!');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  
  if (successCount > 0) {
    console.log('\n🔍 You can now test search functionality with these coupons:');
    testCoupons.slice(0, successCount).forEach((coupon, index) => {
      console.log(`${index + 1}. "${coupon.title}" (${coupon.type})`);
    });
    
    console.log('\n💡 Suggested search terms to test:');
    console.log('• "pizza" - should find pizza coupon');
    console.log('• "coffee" - should find coffee coupon'); 
    console.log('• "burger" - should find BOGO burger deal');
    console.log('• "restaurant" - should find restaurant week deal');
    console.log('• "dessert" - should find free dessert offer');
  }
  
  return successCount > 0;
}

// Function to clean up test data
async function cleanupTestCoupons() {
  console.log('🧹 Cleaning up test coupons...');
  
  // This would need to be implemented based on your API
  console.log('💡 Manual cleanup: Go to business dashboard and delete test coupons');
  console.log('   Look for coupons with titles containing: "Pizza", "Coffee", "Burger", "Dessert", "Restaurant"');
}

// Make functions available globally
window.createTestSearchData = {
  create: createTestCoupons,
  cleanup: cleanupTestCoupons,
  testCoupons: testCoupons
};

console.log('\n📚 Available functions:');
console.log('• window.createTestSearchData.create() - Create test coupons');
console.log('• window.createTestSearchData.cleanup() - Cleanup instructions');
console.log('• window.createTestSearchData.testCoupons - View test data');

console.log('\n🚀 Ready to create test data!');
console.log('💡 To start, run: window.createTestSearchData.create()');

// Auto-run if on business page
if (typeof window !== 'undefined' && window.location.pathname.includes('/business/')) {
  console.log('🎯 Detected business page. Test data creation functions are ready.');
  console.log('💡 Run window.createTestSearchData.create() when ready to create test coupons.');
}