
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProducts() {
    // 1. Find the business 'TU1 test business 1'
    const { data: businesses, error: businessError } = await supabase
        .from('businesses')
        .select('id, business_name, user_id')
        .ilike('business_name', '%test business 1%');

    if (businessError) {
        console.error('Error finding business:', businessError);
        return;
    }

    if (!businesses || businesses.length === 0) {
        console.log('No business found matching "test business 1"');
        return;
    }

    console.log(`Found ${businesses.length} businesses.`);

    for (const business of businesses) {
        console.log(`\n--------------------------------------------------`);
        console.log(`Inspecting Business: ${business.business_name} (ID: ${business.id})`);

        // 2. Fetch products for this business
        const { data: products, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', business.id);

        if (productError) {
            console.error('Error fetching products:', productError);
            continue;
        }

        console.log(`Found ${products?.length || 0} products.`);

        if (products && products.length > 0) {
            products.filter(p => p.tags && Array.isArray(p.tags) && p.tags.includes('featured')).forEach(p => {
                console.log(`\nProduct: ${p.name} (ID: ${p.id})`);
                console.log(`- Status: ${p.status}`);
                console.log(`- Is Available (DB Column): ${p.is_available}`);
                console.log(`- Is Featured (DB Column): ${p.is_featured}`);
                console.log(`- Tags: ${JSON.stringify(p.tags)}`);
                console.log(`- Images (JSONB):`, JSON.stringify(p.images));
                console.log(`- Image URL (Legacy): ${p.image_url}`);
                console.log(`- Image URLs (Legacy Array): ${JSON.stringify(p.image_urls)}`);

                // Debug the filter logic
                const hasFeaturedTag = p.tags && Array.isArray(p.tags) && p.tags.includes('featured');
                // In FeaturedProducts.tsx we check p.is_available. Let's see if that matches DB column or if types are misleading.
                // If the types say is_available is boolean, access it.
                console.log(`- Filter Logic Check:`);
                console.log(`  - Has 'featured' tag? ${hasFeaturedTag}`);
            });
        }
    }
}

inspectProducts();
