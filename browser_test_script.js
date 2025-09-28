// Browser Console Test Script for Story 4.4 Features
// Copy and paste this into your browser console (F12) when the app is loaded
// This will test the localStorage favorites functionality

console.log('🧪 Starting Story 4.4 Browser Console Tests...\n');

// Test 1: LocalStorage Favorites
console.log('📱 Testing localStorage favorites...');

try {
  // Clear any existing favorites
  localStorage.removeItem('sync_favorites');
  console.log('✅ Cleared existing favorites');

  // Test adding a business favorite
  const testBusiness = {
    id: 'test-business-123',
    type: 'business',
    timestamp: Date.now()
  };

  const favorites = [testBusiness];
  localStorage.setItem('sync_favorites', JSON.stringify(favorites));
  console.log('✅ Added test business to favorites');

  // Test reading favorites
  const stored = JSON.parse(localStorage.getItem('sync_favorites') || '[]');
  console.log('✅ Read favorites from localStorage:', stored);

  // Test adding a coupon favorite
  const testCoupon = {
    id: 'test-coupon-456',
    type: 'coupon', 
    timestamp: Date.now()
  };

  favorites.push(testCoupon);
  localStorage.setItem('sync_favorites', JSON.stringify(favorites));
  console.log('✅ Added test coupon to favorites');

  console.log('📊 Final favorites count:', favorites.length);
  console.log('📋 Business favorites:', favorites.filter(f => f.type === 'business').length);
  console.log('🏷️ Coupon favorites:', favorites.filter(f => f.type === 'coupon').length);

} catch (error) {
  console.error('❌ localStorage favorites test failed:', error);
}

// Test 2: Check for React components in window
console.log('\n🔧 Testing React environment...');

if (typeof React !== 'undefined') {
  console.log('✅ React is loaded');
} else {
  console.log('⚠️ React not found in global scope (may be bundled)');
}

// Test 3: Check current route
console.log('\n🛣️ Testing current route...');
console.log('📍 Current URL:', window.location.href);
console.log('📍 Current pathname:', window.location.pathname);

// Test 4: Check for common UI elements
console.log('\n🎨 Testing UI elements...');

const elementsToCheck = [
  { name: 'Navigation menu', selector: 'nav' },
  { name: 'Heart icons (SimpleSaveButton)', selector: '[aria-label*="favorite"], [title*="favorite"]' },
  { name: 'Search inputs', selector: 'input[type="search"], input[placeholder*="search"]' },
  { name: 'Filter buttons', selector: 'button[aria-label*="filter"], button:contains("Filter")' }
];

elementsToCheck.forEach(element => {
  const found = document.querySelectorAll(element.selector);
  if (found.length > 0) {
    console.log(`✅ ${element.name}: ${found.length} found`);
  } else {
    console.log(`⚠️ ${element.name}: none found (may not be on this page)`);
  }
});

// Test 5: Test route navigation (if React Router is available)
console.log('\n🧭 Testing route navigation...');

const testRoutes = [
  '/favorites',
  '/search/advanced',
  '/discovery',
  '/categories',
  '/trending'
];

console.log('📋 Story 4.4 routes to test manually:');
testRoutes.forEach(route => {
  console.log(`  - ${window.location.origin}${route}`);
});

// Test 6: Check for console errors
console.log('\n🚨 Monitoring for errors...');
console.log('ℹ️  Watch console for any errors as you navigate');
console.log('✅ Expected: Warnings about database functions');
console.log('❌ Unexpected: Component crashes or 404s for favorites tables');

// Completion message
console.log('\n🎉 Console tests completed!');
console.log('📖 Next: Follow the manual testing guide in QUICK_TEST_CHECKLIST.md');
console.log('🧪 Navigate to the Story 4.4 routes and test functionality');

// Helper function for manual testing
window.testFavorites = function() {
  const stored = JSON.parse(localStorage.getItem('sync_favorites') || '[]');
  console.log('📊 Current favorites:', stored);
  return stored;
};

window.clearTestFavorites = function() {
  localStorage.removeItem('sync_favorites');
  console.log('🗑️ Test favorites cleared');
};

console.log('\n🛠️ Helper functions available:');
console.log('  - testFavorites() - View current favorites');  
console.log('  - clearTestFavorites() - Clear test favorites');
console.log('\nReady for manual testing! 🚀');