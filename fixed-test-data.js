// fixed-test-data.js
// Corrected test data creation with all required fields

console.log('🎯 Creating Fixed Test Data...');

async function createFixedTestData() {
  if (!window.supabase) {
    console.log('❌ Supabase client not available');
    return false;
  }

  try {
    console.log('📝 Creating businesses with all required fields...');
    
    const now = new Date().toISOString();
    
    // Create businesses with all required fields
    const { data: businessData, error: businessError } = await window.supabase
      .from('businesses')
      .upsert([
        {
          id: 'test-biz-pizza',
          business_name: 'Pizza Palace',
          business_type: 'restaurant',
          description: 'Best pizza in town with amazing deals',
          address: '123 Pizza Street, Food City',
          phone: '+1234567890',
          email: 'contact@pizzapalace.com',
          website: 'https://pizzapalace.com',
          latitude: 40.7128,
          longitude: -74.0060,
          rating: 4.5,
          total_reviews: 125,
          is_verified: true,
          is_active: true,
          created_at: now,
          updated_at: now
        },
        {
          id: 'test-biz-coffee',
          business_name: 'Coffee Corner',
          business_type: 'cafe',
          description: 'Premium coffee and pastries for all occasions',
          address: '456 Coffee Ave, Bean Town',
          phone: '+1234567891',
          email: 'hello@coffeecorner.com',
          website: 'https://coffeecorner.com',
          latitude: 40.7589,
          longitude: -73.9851,
          rating: 4.3,
          total_reviews: 89,
          is_verified: true,
          is_active: true,
          created_at: now,
          updated_at: now
        },
        {
          id: 'test-biz-burger',
          business_name: 'Burger Hub',
          business_type: 'restaurant',
          description: 'Gourmet burgers and fast service',
          address: '789 Burger Blvd, Meat City',
          phone: '+1234567892',
          email: 'orders@burgerhub.com',
          website: 'https://burgerhub.com',
          latitude: 40.7505,
          longitude: -73.9934,
          rating: 4.7,
          total_reviews: 203,
          is_verified: true,
          is_active: true,
          created_at: now,
          updated_at: now
        }
      ], { onConflict: 'id' });

    if (businessError) {
      console.error('❌ Business creation error:', businessError);
      return false;
    }

    console.log('✅ Businesses created:', businessData?.length || 3);

    console.log('📝 Creating coupons with all required fields...');
    
    // Create coupons with all required fields
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    
    const { data: couponData, error: couponError } = await window.supabase
      .from('business_coupons')
      .upsert([
        {
          id: 'test-coupon-pizza-25',
          business_id: 'test-biz-pizza',
          title: '25% Off All Pizza Orders',
          description: 'Get 25% discount on all pizza orders over $20. Valid for dine-in and takeaway.',
          type: 'percentage',
          discount_value: 25,
          min_purchase_amount: 20.00,
          max_discount_amount: 50.00,
          usage_limit_per_user: 3,
          total_limit: 100,
          usage_count: 5,
          collection_count: 15,
          status: 'active',
          valid_from: now,
          valid_until: validUntil.toISOString(),
          is_public: true,
          target_audience: 'all_users',
          terms_conditions: 'Cannot be combined with other offers. Valid ID required.',
          created_at: now,
          updated_at: now
        },
        {
          id: 'test-coupon-coffee-5',
          business_id: 'test-biz-coffee',
          title: '$5 Off Coffee Orders',
          description: 'Save $5 on any coffee order over $15. Includes all specialty drinks.',
          type: 'fixed_amount',
          discount_value: 5.00,
          min_purchase_amount: 15.00,
          max_discount_amount: 5.00,
          usage_limit_per_user: 5,
          total_limit: 200,
          usage_count: 12,
          collection_count: 28,
          status: 'active',
          valid_from: now,
          valid_until: validUntil.toISOString(),
          is_public: true,
          target_audience: 'all_users',
          terms_conditions: 'Valid on all beverages and food items.',
          created_at: now,
          updated_at: now
        },
        {
          id: 'test-coupon-burger-bogo',
          business_id: 'test-biz-burger',
          title: 'Buy 2 Get 1 Free Burgers',
          description: 'Amazing BOGO deal on all burger varieties. Third burger must be of equal or lesser value.',
          type: 'buy_x_get_y',
          discount_value: 100,
          min_purchase_amount: 25.00,
          max_discount_amount: 20.00,
          usage_limit_per_user: 2,
          total_limit: 50,
          usage_count: 8,
          collection_count: 22,
          status: 'active',
          valid_from: now,
          valid_until: validUntil.toISOString(),
          is_public: true,
          target_audience: 'all_users',
          terms_conditions: 'Valid on burgers only. Free item must be equal or lesser value.',
          created_at: now,
          updated_at: now
        }
      ], { onConflict: 'id' });

    if (couponError) {
      console.error('❌ Coupon creation error:', couponError);
      return false;
    }

    console.log('✅ Coupons created:', couponData?.length || 3);
    console.log('🎉 Fixed test data creation completed!');
    console.log('');
    console.log('💡 Now test these searches:');
    console.log('   • "pizza" - should find: 25% Off All Pizza Orders');
    console.log('   • "coffee" - should find: $5 Off Coffee Orders');
    console.log('   • "burger" - should find: Buy 2 Get 1 Free Burgers');
    console.log('   • "restaurant" - should find: Pizza Palace & Burger Hub');
    console.log('   • "discount" - should find multiple results');
    console.log('');
    console.log('🔍 Quick test: ');
    console.log('   window.simpleSearchService.search({ q: "pizza" })');
    
    return true;

  } catch (error) {
    console.error('❌ Failed to create test data:', error);
    return false;
  }
}

// Run the function
createFixedTestData();

// Make available globally
window.createFixedTestData = createFixedTestData;