import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: trending } = await supabase.rpc('get_trending_products_by_category', {
      p_l2_category_id: 'ba2e24d0-4cb5-45fd-9788-2921935fe2a5',
      p_limit: 10
  });
  // fallback if l2_category is empty, let's just query any
  const { data } = await supabase.rpc('get_trending_products_by_category', {
      p_l2_category_id: '80df5bbf-b930-4e36-b530-ab5bd60cdb0d', // dummy
      p_limit: 10
  });
  
  // Actually let's just create a dummy query to see what it's returning
  const out = JSON.stringify({ trending, data }, null, 2);
  fs.writeFileSync('db-dump.txt', out);
}

check();
