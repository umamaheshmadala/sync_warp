import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://ysxmgbblljoyebvugrfo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySeedMigration() {
  console.log('🚀 Applying seed migration...\n');

  try {
    // Step 1: Truncate table
    console.log('Step 1: Truncating user_profiles table...');
    const { error: truncateError } = await supabase.rpc('execute_sql', {
      query: 'TRUNCATE TABLE user_profiles CASCADE;'
    });
    
    if (truncateError) {
      console.log('Using direct delete instead...');
      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) throw deleteError;
    }
    
    console.log('✅ Table cleared\n');

    // Step 2: Read the SQL file
    console.log('Step 2: Reading seed SQL...');
    const sqlContent = fs.readFileSync('./supabase/migrations/20250113_seed_CORRECT.sql', 'utf8');
    console.log('✅ SQL file loaded\n');

    // Step 3: Execute via RPC (if available) or show instructions
    console.log('Step 3: Inserting 10,000 users...');
    console.log('');
    console.log('⚠️  Due to MCP limitations, please run the following in Supabase Dashboard:\n');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('1. Go to: https://supabase.com/dashboard/project/ysxmgbblljoyebvugrfo/sql');
    console.log('2. Copy and paste the contents of:');
    console.log('   supabase/migrations/20250113_seed_CORRECT.sql');
    console.log('3. Click "Run"');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Or use this shortcut link:');
    console.log('https://supabase.com/dashboard/project/ysxmgbblljoyebvugrfo/sql/new');
    console.log('');
    
    // Alternative: Insert via batch
    console.log('\nAlternative: Running batch insert via API...');
    const batchSize = 100;
    const totalUsers = 10000;
    let inserted = 0;

    for (let i = 0; i < totalUsers; i += batchSize) {
      const users = [];
      
      for (let j = 0; j < batchSize && (i + j) < totalUsers; j++) {
        const idx = i + j;
        const ageRange = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'][idx % 6];
        const rand = Math.random();
        
        users.push({
          age: 18 + Math.floor(Math.random() * 60),
          age_range: ageRange,
          gender: rand < 0.6 ? 'male' : rand < 0.95 ? 'female' : 'other',
          income_range: rand < 0.15 ? 'below_3lpa' : rand < 0.50 ? '3-5lpa' : rand < 0.85 ? '5-10lpa' : rand < 0.98 ? '10-20lpa' : 'above_20lpa',
          latitude: 16.5062 + (Math.random() - 0.5) * 0.36,
          longitude: 80.6480 + (Math.random() - 0.5) * 0.36,
          city: 'Vijayawada',
          state: 'Andhra Pradesh',
          postal_code: '52' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
          interests: ['food', 'shopping', 'entertainment', 'health', 'travel', 'education', 'services', 'sports']
            .sort(() => Math.random() - 0.5)
            .slice(0, 2 + Math.floor(Math.random() * 3)),
          purchase_history: [],
          total_purchases: Math.floor(Math.random() * 51),
          total_spent_cents: Math.floor(Math.random() * 10000000),
          is_driver: Math.random() < 0.2,
          driver_rating: Math.random() < 0.2 ? 4.0 + Math.random() : null,
          total_trips: Math.random() < 0.2 ? Math.floor(Math.random() * 500) : 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert(users);

      if (insertError) {
        console.error(`Error inserting batch ${i}-${i + batchSize}:`, insertError);
        throw insertError;
      }

      inserted += users.length;
      process.stdout.write(`\rInserted: ${inserted}/${totalUsers} users...`);
    }

    console.log('\n✅ All users inserted!\n');

    // Verify
    console.log('Verifying...');
    const { count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    console.log(`Total users in database: ${count}`);

    // Get distribution
    const { data: ageData } = await supabase
      .from('user_profiles')
      .select('age_range');
    
    const ageGroups = {};
    ageData?.forEach(row => {
      ageGroups[row.age_range] = (ageGroups[row.age_range] || 0) + 1;
    });

    console.log('\nAge Range Distribution:');
    Object.entries(ageGroups).sort().forEach(([range, count]) => {
      console.log(`  ${range}: ${count}`);
    });

    console.log('\n✅ Migration complete!');
    console.log('\n🎉 Refresh your browser and test the filters!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

applySeedMigration();
