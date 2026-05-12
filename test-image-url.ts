import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  const { data: categories } = await supabase.from('categories').select('id, name');
  
  for (const cat of categories || []) {
    const { data } = await supabase.rpc('get_trending_products_by_category', {
        p_l2_category_id: cat.id,
        p_limit: 5
    });
    
    if (data && data.length > 0) {
      console.log(`Found data in category ${cat.name}:`);
      data.forEach(p => {
         console.log(`Product: ${p.product_name}`);
         console.log(`image_url type: ${typeof p.image_url}`);
         console.log(`image_url value:`, p.image_url);
         console.log('---');
      });
      break;
    }
  }
}

check();
