// Test script to verify Supabase connection
// Run this after completing the setup: node test-supabase-connection.js

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('🔍 Testing Supabase Connection...\n')

// Check if environment variables exist
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing environment variables!')
  console.log('Make sure your .env file contains:')
  console.log('  VITE_SUPABASE_URL=your-project-url')
  console.log('  VITE_SUPABASE_ANON_KEY=your-anon-key')
  process.exit(1)
}

console.log('✅ Environment variables found')
console.log(`📍 URL: ${supabaseUrl}`)
console.log(`🔑 Key: ${supabaseKey.substring(0, 20)}...`)

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

// Test connection by querying a table
async function testConnection() {
  try {
    console.log('\n🔗 Testing database connection...')
    
    // Try to query the profiles table (should exist after schema setup)
    const { data, error } = await supabase
      .from('profiles')
      .select('count(*)', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Database Error:', error.message)
      
      if (error.message.includes('relation "profiles" does not exist')) {
        console.log('\n💡 This means the database schema was not applied.')
        console.log('   Follow Step 4 in SUPABASE_SETUP_GUIDE.md to apply the schema.')
      }
      
      return false
    }
    
    // Success - even if data is null (empty table is fine)
    if (error === null) {
      console.log('✅ Database connection successful!')
      console.log('✅ Tables exist and are accessible')
      return true
    }
    
    console.log('✅ Database connection successful!')
    console.log('✅ Tables exist and are accessible')
    return true
    
  } catch (err) {
    console.error('❌ Connection Error:', err.message)
    
    if (err.message.includes('Invalid API key')) {
      console.log('\n💡 This means your API key is incorrect.')
      console.log('   Double-check your .env file values.')
    }
    
    return false
  }
}

// Run the test
testConnection().then((success) => {
  console.log('\n' + '='.repeat(50))
  
  if (success) {
    console.log('🎉 SUPABASE SETUP SUCCESSFUL!')
    console.log('✅ You can now proceed with authentication development')
    console.log('✅ Story 1.6 is COMPLETE')
  } else {
    console.log('🔴 SUPABASE SETUP FAILED')
    console.log('❌ Please review the setup steps and try again')
    console.log('❌ Story 1.6 is still BLOCKED')
  }
  
  console.log('='.repeat(50))
})