import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  const { data: prods } = await supabase.from('products').select('id, name, image_urls, images, image_url').not('name', 'is', null).limit(10);
  const out = JSON.stringify(prods, null, 2);
  fs.writeFileSync('db-dump.txt', out);
}

check();
