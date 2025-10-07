/**
 * Schema Fixes Verification Script
 * Run this in browser console at http://localhost:5173/dashboard
 * 
 * This will test all the fixed endpoints and report any errors
 */

console.log('🔍 Starting Schema Fixes Verification...\n');

const SUPABASE_URL = 'https://ysxmgbblljoyebvugrfo.supabase.co';
const TEST_USER_ID = '6fb5eaeb-89ef-4eb0-b156-5b0d012ea4f3'; // Your user ID from the error logs

// Get auth token from localStorage
const supabaseAuth = localStorage.getItem('sb-ysxmgbblljoyebvugrfo-auth-token');
let token = null;

if (supabaseAuth) {
  try {
    const authData = JSON.parse(supabaseAuth);
    token = authData?.access_token;
  } catch (e) {
    console.error('❌ Could not parse auth token:', e);
  }
}

if (!token) {
  console.error('❌ No auth token found. Please log in first.');
} else {
  console.log('✅ Auth token found\n');
  runTests();
}

async function runTests() {
  const headers = {
    'apikey': 'YOUR_ANON_KEY', // Will use from window
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const tests = [
    {
      name: 'Test 1: Notifications with sender relationship',
      url: `${SUPABASE_URL}/rest/v1/notifications?select=*,sender:sender_id(id,full_name,avatar_url)&user_id=eq.${TEST_USER_ID}&order=created_at.desc&limit=5`,
      expectedStatus: 200
    },
    {
      name: 'Test 2: Businesses with owner relationship',
      url: `${SUPABASE_URL}/rest/v1/businesses?select=*,owner:profiles!fk_businesses_user_id(id,full_name,avatar_url)&status=eq.active&limit=5`,
      expectedStatus: 200
    },
    {
      name: 'Test 3: Businesses with correct columns',
      url: `${SUPABASE_URL}/rest/v1/businesses?select=id,business_name,description,logo_url,cover_image_url,status,average_rating&status=eq.active&limit=5`,
      expectedStatus: 200
    }
  ];

  for (const test of tests) {
    console.log(`\n📋 ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const response = await fetch(test.url, { headers });
      const status = response.status;
      
      if (status === test.expectedStatus) {
        console.log(`   ✅ SUCCESS: ${status}`);
        const data = await response.json();
        console.log(`   📊 Returned ${data.length} rows`);
        if (data.length > 0) {
          console.log(`   📝 Sample data:`, data[0]);
        }
      } else {
        console.log(`   ❌ FAILED: Expected ${test.expectedStatus}, got ${status}`);
        const errorData = await response.json();
        console.error(`   Error:`, errorData);
      }
    } catch (error) {
      console.error(`   ❌ ERROR:`, error);
    }
  }

  console.log('\n\n🎯 Verification Complete!');
  console.log('If all tests passed with ✅, the schema fixes are working correctly.');
  console.log('If any tests failed with ❌, check the error messages above.');
}

console.log('\n📝 Instructions:');
console.log('1. Make sure you are logged in');
console.log('2. Open http://localhost:5173/dashboard');
console.log('3. Open browser DevTools (F12)');
console.log('4. Go to Console tab');
console.log('5. Copy and paste this entire script');
console.log('6. Press Enter to run');
console.log('\n⏳ Waiting for you to run the script...');
