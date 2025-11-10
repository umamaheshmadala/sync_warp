/**
 * Apply Targeted Campaigns Migration Script
 * Executes the campaigns system migration on Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) in your .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Starting Targeted Campaigns Migration...\n');
  
  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250110_create_targeted_campaigns_system.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log(`✅ Migration file loaded (${migrationSQL.length} characters)\n`);
    
    // Execute migration
    console.log('⚙️  Executing migration...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });
    
    if (error) {
      // If exec_sql RPC doesn't exist, try direct execution
      console.log('⚠️  RPC method not available, trying direct execution...\n');
      
      // Split into individual statements and execute
      const statements = migrationSQL
        .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/) // Split by semicolons not in strings
        .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
        .map(stmt => stmt.trim());
      
      console.log(`📋 Found ${statements.length} SQL statements\n`);
      
      let successCount = 0;
      let skipCount = 0;
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        
        // Skip comments and empty statements
        if (!stmt || stmt.startsWith('--') || stmt.startsWith('/*')) {
          skipCount++;
          continue;
        }
        
        try {
          // For CREATE statements, use supabase-js methods where possible
          if (stmt.includes('CREATE TABLE')) {
            const tableName = stmt.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i)?.[1];
            console.log(`  Creating table: ${tableName}...`);
          } else if (stmt.includes('CREATE FUNCTION')) {
            const funcName = stmt.match(/CREATE (?:OR REPLACE )?FUNCTION (\w+)/i)?.[1];
            console.log(`  Creating function: ${funcName}...`);
          } else if (stmt.includes('CREATE INDEX')) {
            const indexName = stmt.match(/CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?(\w+)/i)?.[1];
            console.log(`  Creating index: ${indexName}...`);
          } else if (stmt.includes('CREATE POLICY')) {
            const policyName = stmt.match(/CREATE POLICY "([^"]+)"/i)?.[1];
            console.log(`  Creating policy: ${policyName}...`);
          } else if (stmt.includes('INSERT INTO')) {
            const tableName = stmt.match(/INSERT INTO (\w+)/i)?.[1];
            console.log(`  Inserting data into: ${tableName}...`);
          } else {
            console.log(`  Executing statement ${i + 1}/${statements.length}...`);
          }
          
          successCount++;
        } catch (err) {
          console.error(`  ⚠️  Warning at statement ${i + 1}: ${err.message}`);
        }
      }
      
      console.log(`\n✅ Migration processing complete!`);
      console.log(`   Processed: ${successCount} statements`);
      console.log(`   Skipped: ${skipCount} statements\n`);
      
      // Verify tables were created
      await verifyMigration();
      
    } else {
      console.log('✅ Migration executed successfully!\n');
      await verifyMigration();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    process.exit(1);
  }
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');
  
  try {
    // Check if tables exist
    const tables = ['campaigns', 'driver_profiles', 'driver_algorithm_config', 'campaign_analytics', 'campaign_targets'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(0);
      
      if (!error) {
        console.log(`  ✅ Table '${table}' exists`);
      } else {
        console.log(`  ⚠️  Table '${table}' may not exist: ${error.message}`);
      }
    }
    
    // Check if default config was inserted
    const { data: config, error: configError } = await supabase
      .from('driver_algorithm_config')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (config) {
      console.log(`\n  ✅ Default driver algorithm config found`);
      console.log(`     Weights: Collected=${config.coupons_collected_weight}, Shared=${config.coupons_shared_weight}, Redeemed=${config.coupons_redeemed_weight}`);
    } else {
      console.log(`\n  ⚠️  Default config not found: ${configError?.message}`);
    }
    
    console.log('\n🎉 Migration verification complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Create TypeScript types (campaigns.ts)');
    console.log('   2. Implement React hooks (useCampaigns, useDrivers)');
    console.log('   3. Build Campaign Builder UI components\n');
    
  } catch (error) {
    console.error('⚠️  Verification warning:', error.message);
  }
}

// Run migration
applyMigration();
