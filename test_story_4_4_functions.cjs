// Test Story 4.4 Database Functions
// This script tests the newly created database functions

const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with actual credentials from .env.example
const supabase = createClient(
  'https://ysxmgbblljoyebvugrfo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI'
);

async function testStory44Functions() {
  console.log('🚀 Testing Story 4.4 Database Functions...\n');

  // Test 1: Test nearby_businesses function
  console.log('📍 Testing nearby_businesses function...');
  try {
    const { data, error } = await supabase.rpc('nearby_businesses', {
      lat: 37.7749,  // San Francisco coordinates for example
      lng: -122.4194,
      radius_km: 10,
      result_limit: 5
    });

    if (error) {
      console.error('❌ nearby_businesses error:', error);
    } else {
      console.log(`✅ nearby_businesses returned ${data.length} results`);
      if (data.length > 0) {
        console.log('Sample result:', data[0]);
      }
    }
  } catch (err) {
    console.error('❌ nearby_businesses exception:', err.message);
  }

  console.log('\n');

  // Test 2: Test get_trending_search_terms function
  console.log('📈 Testing get_trending_search_terms function...');
  try {
    const { data, error } = await supabase.rpc('get_trending_search_terms', {
      days_back: 7,
      term_limit: 5
    });

    if (error) {
      console.error('❌ get_trending_search_terms error:', error);
    } else {
      console.log(`✅ get_trending_search_terms returned ${data.length} results`);
      if (data.length > 0) {
        console.log('Sample trending terms:', data);
      } else {
        console.log('ℹ️  No trending terms found (expected if no search history exists)');
      }
    }
  } catch (err) {
    console.error('❌ get_trending_search_terms exception:', err.message);
  }

  console.log('\n');

  // Test 3: Test get_business_search_suggestions function
  console.log('💡 Testing get_business_search_suggestions function...');
  try {
    const { data, error } = await supabase.rpc('get_business_search_suggestions', {
      search_input: 'rest',
      suggestion_limit: 5
    });

    if (error) {
      console.error('❌ get_business_search_suggestions error:', error);
    } else {
      console.log(`✅ get_business_search_suggestions returned ${data.length} results`);
      if (data.length > 0) {
        console.log('Sample suggestions:', data);
      } else {
        console.log('ℹ️  No suggestions found (expected if no matching businesses exist)');
      }
    }
  } catch (err) {
    console.error('❌ get_business_search_suggestions exception:', err.message);
  }

  console.log('\n');

  // Test 4: Test business_search_view
  console.log('👁️  Testing business_search_view...');
  try {
    const { data, error } = await supabase
      .from('business_search_view')
      .select('*')
      .limit(3);

    if (error) {
      console.error('❌ business_search_view error:', error);
    } else {
      console.log(`✅ business_search_view returned ${data.length} results`);
      if (data.length > 0) {
        console.log('Sample business with computed fields:', {
          name: data[0].name,
          category: data[0].category,
          avg_rating: data[0].avg_rating,
          review_count: data[0].review_count,
          active_offers_count: data[0].active_offers_count,
          is_open_now: data[0].is_open_now
        });
      }
    }
  } catch (err) {
    console.error('❌ business_search_view exception:', err.message);
  }

  console.log('\n');

  // Test 5: Test regular business query to ensure nothing is broken
  console.log('🏢 Testing regular businesses query...');
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, category, status')
      .eq('status', 'active')
      .limit(3);

    if (error) {
      console.error('❌ businesses query error:', error);
    } else {
      console.log(`✅ Regular businesses query returned ${data.length} results`);
      if (data.length > 0) {
        console.log('Sample businesses:', data.map(b => ({ name: b.name, category: b.category })));
      }
    }
  } catch (err) {
    console.error('❌ businesses query exception:', err.message);
  }

  console.log('\n🎉 Story 4.4 function testing completed!');
}

// Run the tests
testStory44Functions().catch(console.error);