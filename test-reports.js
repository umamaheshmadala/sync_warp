import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('product_reports')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error querying product_reports:', error);
  } else {
    console.log('product_reports query successful:', data);
  }
}

check();
