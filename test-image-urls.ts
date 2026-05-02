import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  const { data, error } = await supabase.rpc('get_trending_products_by_category', {
      p_l2_category_id: 'ba2e24d0-4cb5-45fd-9788-2921935fe2a5',
      p_limit: 10
  });

  if (error) {
    console.error('RPC Error:', error);
  } else {
    // Also fetch some without RPC
    const { data: prods } = await supabase.from('products').select('image_url, image_urls').limit(2);
    console.log('Trending image_url values:', data.map(d => typeof d.image_url + ': ' + JSON.stringify(d.image_url)));
    console.log('Raw products table:', prods);
  }
}

check();
