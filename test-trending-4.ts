import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  fs.writeFileSync('db-dump.txt', 'Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('products').select('id, name, images').limit(10);
  if (error) {
    fs.writeFileSync('db-dump.txt', JSON.stringify({ error }, null, 2));
  } else {
    fs.writeFileSync('db-dump.txt', JSON.stringify(data, null, 2));
  }
}

check();
