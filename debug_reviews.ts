
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugReviews() {
    console.log('Fetching reviews for Tu1 Test Business 1...');

    // Get business ID first? Or just fetch all reviews
    const { data: reviews, error } = await supabase
        .from('business_reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching reviews:', error);
        return;
    }

    console.log('Found recent reviews:', reviews.length);
    reviews.forEach(r => {
        console.log(`Review ID: ${r.id}`);
        console.log('Keys:', Object.keys(r).join(', '));
        console.log(`Full Object:`, JSON.stringify(r, null, 2));
        console.log('-------------------');
    });
}

debugReviews();
