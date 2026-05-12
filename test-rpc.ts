import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  const { data: trending } = await supabase.rpc('get_trending_products_by_category', {
      p_l2_category_id: null,
      p_limit: 10
  });
  
  // Actually p_l2_category_id is required in the RPC? Let's check products table directly
  const { data: prods } = await supabase.from('products').select('id, name, image_urls, image_url').not('image_urls', 'is', null).limit(5);
  console.log("Products:", JSON.stringify(prods, null, 2));
}

check();
