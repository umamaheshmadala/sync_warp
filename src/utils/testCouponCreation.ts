// testCouponCreation.ts - Debug utility for coupon creation issues

import { supabase } from '../lib/supabase';

export const testCouponCreation = async () => {
  console.log('🔍 Testing coupon creation prerequisites...');
  
  try {
    // Test 1: Check if business_coupons table exists and structure
    console.log('📋 Testing business_coupons table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('business_coupons')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ business_coupons table error:', tableError);
      return { success: false, error: 'Table structure issue', details: tableError };
    }
    
    console.log('✅ business_coupons table accessible');
    
    // Test 2: Check businesses table
    console.log('📋 Testing businesses table...');
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id, user_id, business_name')
      .limit(1);
      
    if (businessError) {
      console.error('❌ businesses table error:', businessError);
      return { success: false, error: 'Businesses table issue', details: businessError };
    }
    
    console.log('✅ businesses table accessible');
    console.log('📊 Sample business data:', businessData?.[0]);
    
    // Test 3: Check current user authentication
    console.log('👤 Testing user authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Authentication error:', authError);
      return { success: false, error: 'Auth issue', details: authError };
    }
    
    if (!user) {
      console.error('❌ No authenticated user');
      return { success: false, error: 'No user', details: 'User not logged in' };
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Test 4: Check if user owns any businesses
    console.log('🏢 Testing business ownership...');
    const { data: ownedBusinesses, error: ownedError } = await supabase
      .from('businesses')
      .select('id, business_name')
      .eq('user_id', user.id);
      
    if (ownedError) {
      console.error('❌ Business ownership check error:', ownedError);
      return { success: false, error: 'Business ownership error', details: ownedError };
    }
    
    console.log('✅ Owned businesses:', ownedBusinesses);
    
    if (!ownedBusinesses || ownedBusinesses.length === 0) {
      console.warn('⚠️ User has no businesses');
      return { success: false, error: 'No businesses', details: 'User owns no businesses' };
    }
    
    // Test 5: Try a minimal coupon insert to check required fields
    const testBusiness = ownedBusinesses[0];
    console.log('🧪 Testing minimal coupon creation...');
    
    const testCouponData = {
      business_id: testBusiness.id,
      title: 'Test Coupon - DELETE ME',
      description: 'This is a test coupon for debugging purposes',
      type: 'percentage',
      discount_type: 'percentage', // Add required discount_type field
      discount_value: 10,
      coupon_code: `TEST${Date.now()}`,
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      target_audience: 'all_users',
      per_user_limit: 1,
      total_limit: null,
      min_purchase_amount: null,
      max_discount_amount: null, // Add this field
      terms_conditions: 'Test terms and conditions for debugging',
      is_public: true, // Add this field
      status: 'draft',
      created_by: user.id
    };
    
    console.log('📤 Attempting to insert test coupon:', testCouponData);
    
    const { data: testResult, error: testInsertError } = await supabase
      .from('business_coupons')
      .insert([testCouponData])
      .select()
      .single();
    
    if (testInsertError) {
      console.error('❌ Test coupon insert failed:', testInsertError);
      console.error('Error details:', {
        code: testInsertError.code,
        message: testInsertError.message,
        details: testInsertError.details,
        hint: testInsertError.hint
      });
      return { 
        success: false, 
        error: 'Insert failed', 
        details: testInsertError,
        testData: testCouponData 
      };
    }
    
    console.log('✅ Test coupon created successfully:', testResult);
    
    // Clean up - delete the test coupon
    console.log('🧹 Cleaning up test coupon...');
    const { error: deleteError } = await supabase
      .from('business_coupons')
      .delete()
      .eq('id', testResult.id);
      
    if (deleteError) {
      console.warn('⚠️ Could not delete test coupon:', deleteError);
    } else {
      console.log('✅ Test coupon cleaned up');
    }
    
    return { 
      success: true, 
      message: 'All tests passed',
      userInfo: {
        id: user.id,
        email: user.email
      },
      businessInfo: {
        count: ownedBusinesses.length,
        businesses: ownedBusinesses
      }
    };
    
  } catch (error) {
    console.error('💥 Unexpected error during testing:', error);
    return { success: false, error: 'Unexpected error', details: error };
  }
};

// Helper function to run from browser console
export const runCouponTest = () => {
  testCouponCreation().then(result => {
    console.log('🏁 Test completed:', result);
  });
};

// Add to window for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).testCouponCreation = testCouponCreation;
  (window as any).runCouponTest = runCouponTest;
}