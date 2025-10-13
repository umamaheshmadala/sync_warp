import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysxmgbblljoyebvugrfo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('🔍 Checking user_profiles table structure...\n');
  
  // Get a sample row to see column names
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Column names:');
    Object.keys(data[0]).forEach(col => {
      console.log(`  - ${col}`);
    });
    console.log('\nSample row:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('Table is empty');
  }
}

checkTableStructure().catch(console.error);
