// inject-test-data.js
// Console script to inject test data directly via Supabase client

console.log('🎯 Injecting Test Data for Search Testing');

async function injectTestData() {
  // Check if supabase client is available
  if (typeof window === 'undefined' || !window.supabase) {
    console.log('❌ Supabase client not available');
    console.log('💡 Make sure you\'re on a page with Supabase loaded');
    return false;
  }

  const supabase = window.supabase;

  try {
    console.log('📝 Creating test businesses...');
    
    // Insert test businesses
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .upsert([
        {
          id: 'test-business-pizza',
          business_name: 'Pizza Palace',
          business_type: 'restaurant',
          description: 'Best pizza in town with amazing deals',
          address: '123 Pizza Street',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'test-business-coffee',
          business_name: 'Coffee Corner',
          business_type: 'cafe',
          description: 'Premium coffee and pastries',
          address: '456 Coffee Ave',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'test-business-burger',
          business_name: 'Burger Hub',
          business_type: 'restaurant',
          description: 'Gourmet burgers and fast service',
          address: '789 Burger Blvd',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'id' });

    if (businessError) {
      console.error('❌ Error creating businesses:', businessError);
      return false;
    }

    console.log('✅ Test businesses created:', businessData?.length || 3);

    console.log('📝 Creating test coupons...');

    // Insert test coupons
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30); // 30 days from now

    const { data: couponData, error: couponError } = await supabase
      .from('business_coupons')
      .upsert([
        {
          id: 'test-coupon-pizza-1',
          business_id: 'test-business-pizza',
          title: '25% Off Pizza Orders',
          description: 'Get 25% discount on all pizza orders over $20',
          type: 'percentage',
          discount_value: 25,
          min_purchase_amount: 20,
          status: 'active',
          valid_from: new Date().toISOString(),
          valid_until: validUntil.toISOString(),
          is_public: true,
          target_audience: 'all_users',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'test-coupon-coffee-1',
          business_id: 'test-business-coffee',
          title: '$5 Off Coffee Orders',
          description: 'Save $5 on any coffee order over $15',
          type: 'fixed_amount',
          discount_value: 5,
          min_purchase_amount: 15,
          status: 'active',
          valid_from: new Date().toISOString(),
          valid_until: validUntil.toISOString(),
          is_public: true,
          target_audience: 'all_users',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'test-coupon-burger-1',
          business_id: 'test-business-burger',
          title: 'Buy 2 Get 1 Free Burgers',
          description: 'Amazing BOGO deal on all burger varieties',
          type: 'buy_x_get_y',
          discount_value: 100,
          min_purchase_amount: 25,
          status: 'active',
          valid_from: new Date().toISOString(),
          valid_until: validUntil.toISOString(),
          is_public: true,
          target_audience: 'all_users',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'id' });

    if (couponError) {
      console.error('❌ Error creating coupons:', couponError);
      return false;
    }

    console.log('✅ Test coupons created:', couponData?.length || 3);

    console.log('🎉 Test data injection completed!');
    console.log('💡 Now try searching for:');
    console.log('   • "pizza" - should find pizza coupon');
    console.log('   • "coffee" - should find coffee coupon');
    console.log('   • "burger" - should find burger coupon');
    console.log('   • "restaurant" - should find pizza and burger businesses');

    return true;

  } catch (error) {
    console.error('❌ Failed to inject test data:', error);
    return false;
  }
}

// Auto-run if supabase is available
if (typeof window !== 'undefined' && window.supabase) {
  console.log('🔍 Supabase client found - injecting test data...');
  injectTestData();
} else {
  console.log('⏳ Supabase client not found. Manual run available:');
  console.log('   injectTestData()');
}

// Make function available globally
window.injectTestData = injectTestData;