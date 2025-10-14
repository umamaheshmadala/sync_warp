// Apply Story 5.2 Review System Migration
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Applying Story 5.2 Review System Migration...\n');

  try {
    // Read the FIXED migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20251001143956_create_review_system_enhanced_FIXED.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log(`📏 Size: ${migrationSQL.length} characters`);
    console.log(`📝 Lines: ${migrationSQL.split('\n').length}\n`);

    // Execute the migration
    console.log('⏳ Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // Try alternative method - split into statements
      console.log('⚠️  RPC method failed, trying direct execution...\n');
      
      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`📋 Found ${statements.length} SQL statements\n`);

      let successCount = 0;
      let errors = [];

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        
        // Skip comments
        if (statement.trim().startsWith('--')) continue;

        try {
          console.log(`[${i + 1}/${statements.length}] Executing...`);
          
          // Use PostgreSQL REST API directly
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ query: statement })
          });

          if (!response.ok) {
            const errorText = await response.text();
            errors.push({ statement: i + 1, error: errorText });
          } else {
            successCount++;
          }
        } catch (err) {
          errors.push({ statement: i + 1, error: err.message });
        }
      }

      console.log(`\n✅ Successfully executed: ${successCount} statements`);
      if (errors.length > 0) {
        console.log(`❌ Failed: ${errors.length} statements\n`);
        errors.forEach(({ statement, error }) => {
          console.error(`   Statement ${statement}: ${error}`);
        });
      }

      if (successCount === 0) {
        throw new Error('All statements failed');
      }
    } else {
      console.log('✅ Migration executed successfully!\n');
    }

    // Verify the migration
    console.log('🔍 Verifying migration...\n');

    // Check tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['business_reviews', 'business_review_responses']);

    if (!tablesError && tables) {
      console.log(`✅ Tables created: ${tables.length}/2`);
      tables.forEach(t => console.log(`   - ${t.table_name}`));
    }

    // Check view
    const { data: views, error: viewsError } = await supabase
      .from('information_schema.views')
      .select('table_name')
      .eq('table_name', 'business_reviews_with_details')
      .single();

    if (!viewsError && views) {
      console.log(`✅ View created: business_reviews_with_details`);
    }

    // Check function
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', 'get_business_review_stats')
      .single();

    if (!functionsError && functions) {
      console.log(`✅ Function created: get_business_review_stats`);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Hard refresh your browser (Ctrl+Shift+R)');
    console.log('   2. Navigate to a business profile');
    console.log('   3. Click the "Reviews" tab');
    console.log('   4. Should show "No Reviews Yet" instead of an error\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n📝 Manual application required:');
    console.error('   1. Go to: https://supabase.com/dashboard');
    console.error('   2. Open SQL Editor');
    console.error('   3. Copy contents of: supabase/migrations/20251001143956_create_review_system_enhanced_FIXED.sql');
    console.error('   4. Paste and run in SQL Editor\n');
    process.exit(1);
  }
}

// Run the migration
applyMigration();
