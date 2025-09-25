// debug-search-direct.js
// Direct test of search service without UI to isolate the issue
// Run this from the project root: node debug-search-direct.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysxmgbblljoyebvugrfo.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY5MjkxNTYsImV4cCI6MjA0MjUwNTE1Nn0.AlM-shvLCJxh25-O6LtirGlh7iuUON5e4YJQJPaOT6A'
);

console.log('🔧 Direct Search Service Debug Test');
console.log('=====================================');

async function testDirectSearch() {
  console.log('\n📝 Testing browse mode (empty query) directly...');
  
  try {
    const startTime = Date.now();
    
    // Mimic the exact simpleSearchService logic
    const searchTerm = '';
    const hasSearchTerm = searchTerm.length > 0;
    
    console.log('🔍 Search mode:', hasSearchTerm ? 'SEARCH' : 'BROWSE', 'term:', searchTerm || '[EMPTY]');
    
    // Step 1: Get coupons (browse mode - all public active)
    let couponQuery = supabase
      .from('business_coupons')
      .select('*')
      .eq('status', 'active')
      .eq('is_public', true)
      .limit(10);
    
    // Add date filter
    const now = new Date().toISOString();
    couponQuery = couponQuery.gt('valid_until', now);
    console.log('🔍 Applied date filter - coupons valid after:', now);
    
    const { data: couponData, error: couponError } = await couponQuery;
    
    if (couponError) {
      console.error('❌ Coupon query error:', couponError);
      return;
    }
    
    console.log('✓ Initial coupon query returned:', couponData?.length || 0, 'coupons');
    if (couponData && couponData.length > 0) {
      console.log('📋 Coupon details:');
      couponData.forEach((coupon, index) => {
        console.log(`   ${index + 1}. "${coupon.title}" (ID: ${coupon.id.slice(0, 8)}...)`);
      });
    }
    
    // Step 2: Filter by business status (the problematic part)
    let finalCoupons = [];
    if (couponData && couponData.length > 0) {
      const businessIds = [...new Set(couponData.map(c => c.business_id))];
      console.log('🏢 Checking business status for IDs:', businessIds.map(id => id.slice(0, 8) + '...'));
      
      const { data: activeBusinesses, error: businessError } = await supabase
        .from('businesses')
        .select('id, business_name, status')
        .in('id', businessIds)
        .eq('status', 'active');
        
      if (businessError) {
        console.error('❌ Business query error:', businessError);
        return;
      }
      
      console.log('✓ Active businesses found:', activeBusinesses?.length || 0);
      if (activeBusinesses && activeBusinesses.length > 0) {
        console.log('🏢 Active businesses:');
        activeBusinesses.forEach((business, index) => {
          console.log(`   ${index + 1}. "${business.business_name}" (${business.status})`);
        });
      }
      
      const activeBusinessIds = new Set(activeBusinesses?.map(b => b.id) || []);
      finalCoupons = couponData.filter(coupon => 
        activeBusinessIds.has(coupon.business_id)
      );
      
      console.log('🔍 Coupons after business filtering:', finalCoupons.length);
      console.log('📊 Filter breakdown:');
      console.log(`   - Initial coupons: ${couponData.length}`);
      console.log(`   - Active businesses: ${activeBusinesses?.length || 0}`);
      console.log(`   - Final filtered coupons: ${finalCoupons.length}`);
    } else {
      finalCoupons = [];
    }
    
    const searchTime = Date.now() - startTime;
    
    console.log('\n📊 FINAL RESULTS:');
    console.log(`   - Coupons: ${finalCoupons.length}`);
    console.log(`   - Search time: ${searchTime}ms`);
    
    if (finalCoupons.length === 0) {
      console.log('❌ ISSUE: No coupons returned from browse mode!');
      console.log('💡 Expected: 6 public active coupons from database');
    } else if (finalCoupons.length !== 6) {
      console.log(`⚠️ PARTIAL ISSUE: Expected 6 coupons, got ${finalCoupons.length}`);
    } else {
      console.log('✅ SUCCESS: Correct number of coupons returned');
    }
    
    return finalCoupons;
    
  } catch (error) {
    console.error('❌ Direct search test failed:', error);
  }
}

async function testDatabaseDirect() {
  console.log('\n📝 Testing database directly (raw queries)...');
  
  try {
    // Test 1: Count all coupons
    const { count: totalCoupons } = await supabase
      .from('business_coupons')
      .select('*', { count: 'exact', head: true });
    console.log(`📊 Total coupons in database: ${totalCoupons}`);
    
    // Test 2: Count public active coupons
    const { count: publicActiveCoupons } = await supabase
      .from('business_coupons')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_public', true);
    console.log(`📊 Public active coupons: ${publicActiveCoupons}`);
    
    // Test 3: Count valid (non-expired) coupons
    const now = new Date().toISOString();
    const { count: validCoupons } = await supabase
      .from('business_coupons')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_public', true)
      .gt('valid_until', now);
    console.log(`📊 Valid coupons (not expired): ${validCoupons}`);
    
    // Test 4: Count active businesses
    const { count: activeBusinesses } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    console.log(`📊 Active businesses: ${activeBusinesses}`);
    
    // Test 5: Get actual coupon data with business join
    const { data: couponsWithBusiness, error: joinError } = await supabase
      .from('business_coupons')
      .select(`
        id,
        title,
        status,
        is_public,
        valid_until,
        businesses (
          id,
          business_name,
          status
        )
      `)
      .eq('status', 'active')
      .eq('is_public', true)
      .gt('valid_until', now)
      .limit(10);
      
    if (joinError) {
      console.error('❌ JOIN query error:', joinError);
    } else {
      console.log(`📊 Coupons with business data: ${couponsWithBusiness?.length || 0}`);
      
      if (couponsWithBusiness && couponsWithBusiness.length > 0) {
        console.log('📋 Full coupon details:');
        couponsWithBusiness.forEach((coupon, index) => {
          const businessStatus = coupon.businesses?.status || 'unknown';
          const businessName = coupon.businesses?.business_name || 'unknown';
          console.log(`   ${index + 1}. "${coupon.title}" from "${businessName}" (${businessStatus})`);
        });
        
        // Filter to only active businesses
        const filteredForActiveBusiness = couponsWithBusiness.filter(
          c => c.businesses && c.businesses.status === 'active'
        );
        console.log(`📊 After business status filter: ${filteredForActiveBusiness.length} coupons`);
        
        if (filteredForActiveBusiness.length !== validCoupons) {
          console.log('⚠️ MISMATCH: JOIN approach gives different result than separate queries!');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Database direct test failed:', error);
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting direct search debugging...\n');
  
  await testDatabaseDirect();
  await testDirectSearch();
  
  console.log('\n🎯 DEBUGGING COMPLETE');
  console.log('=====================');
  console.log('💡 If the results show 0 coupons from browse mode but >0 from database,');
  console.log('   then the issue is in the business filtering logic of simpleSearchService.');
  console.log('💡 If database queries also return 0, then the issue is with the data or RLS policies.');
}

runAllTests();