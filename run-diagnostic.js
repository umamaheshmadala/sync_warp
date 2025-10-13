// Run diagnostic SQL queries via Supabase client
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysxmgbblljoyebvugrfo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
  console.log('🧪 Running Diagnostic Tests\n');

  // Test 1: Basic user stats
  console.log('📊 Test 1: User Profile Statistics');
  const { data: stats, error: statsError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        COUNT(*) as total_users,
        COUNT(DISTINCT age_range) as unique_ages,
        COUNT(DISTINCT gender) as unique_genders,
        COUNT(*) FILTER (WHERE is_driver = TRUE) as drivers,
        COUNT(*) FILTER (WHERE latitude IS NULL) as null_locations
      FROM user_profiles;
    `
  });
  
  if (statsError) {
    console.error('Using direct query instead...');
    const { count } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
    console.log(`Total users: ${count}`);
  } else {
    console.log(stats);
  }

  // Test 2: Age range distribution
  console.log('\n📊 Test 2: Age Range Distribution');
  const { data: ageData } = await supabase
    .from('user_profiles')
    .select('age_range');
  
  const ageGroups = {};
  ageData?.forEach(row => {
    ageGroups[row.age_range] = (ageGroups[row.age_range] || 0) + 1;
  });
  console.log(ageGroups);

  // Test 3: Gender distribution
  console.log('\n📊 Test 3: Gender Distribution');
  const { data: genderData } = await supabase
    .from('user_profiles')
    .select('gender');
  
  const genderGroups = {};
  genderData?.forEach(row => {
    genderGroups[row.gender] = (genderGroups[row.gender] || 0) + 1;
  });
  console.log(genderGroups);

  // Test 4: Test the reach calculation function with age filter
  console.log('\n🎯 Test 4: Demographics Filter (Age 25-45)');
  const { data: test4, error: error4 } = await supabase.rpc('calculate_campaign_reach', {
    p_targeting_rules: {
      demographics: {
        ageRanges: ['25-45']
      }
    },
    p_debug: true
  });
  
  if (error4) {
    console.error('Error:', error4.message);
  } else {
    console.log('Result:', JSON.stringify(test4, null, 2));
  }

  // Test 5: Gender filter
  console.log('\n🎯 Test 5: Demographics Filter (Male)');
  const { data: test5, error: error5 } = await supabase.rpc('calculate_campaign_reach', {
    p_targeting_rules: {
      demographics: {
        gender: ['male']
      }
    },
    p_debug: true
  });
  
  if (error5) {
    console.error('Error:', error5.message);
  } else {
    console.log('Result:', JSON.stringify(test5, null, 2));
  }

  // Test 6: Location filter
  console.log('\n🎯 Test 6: Location Filter (3km radius)');
  const { data: test6, error: error6 } = await supabase.rpc('calculate_campaign_reach', {
    p_targeting_rules: {
      location: {
        lat: 16.5062,
        lng: 80.6480,
        radiusKm: 3
      }
    },
    p_debug: true
  });
  
  if (error6) {
    console.error('Error:', error6.message);
  } else {
    console.log('Result:', JSON.stringify(test6, null, 2));
  }

  // Test 7: Behavior filter (drivers)
  console.log('\n🎯 Test 7: Behavior Filter (Drivers Only)');
  const { data: test7, error: error7 } = await supabase.rpc('calculate_campaign_reach', {
    p_targeting_rules: {
      behavior: {
        isDriver: true
      }
    },
    p_debug: true
  });
  
  if (error7) {
    console.error('Error:', error7.message);
  } else {
    console.log('Result:', JSON.stringify(test7, null, 2));
  }

  // Test 8: Combined filters
  console.log('\n🎯 Test 8: Combined Filters');
  const { data: test8, error: error8 } = await supabase.rpc('calculate_campaign_reach', {
    p_targeting_rules: {
      demographics: {
        ageRanges: ['25-45'],
        gender: ['male']
      },
      location: {
        lat: 16.5062,
        lng: 80.6480,
        radiusKm: 5
      },
      behavior: {
        isDriver: true
      }
    },
    p_debug: true
  });
  
  if (error8) {
    console.error('Error:', error8.message);
  } else {
    console.log('Result:', JSON.stringify(test8, null, 2));
  }

  console.log('\n✅ Diagnostic tests complete!');
}

runDiagnostics().catch(console.error);
