
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkState() {
    console.log('🔍 Checking DB State...');

    // Login as testuser2 to match RLS
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'testuser2@gmail.com',
        password: 'Testuser@1'
    });

    if (loginError) {
        console.error('Login failed:', loginError);
        return;
    }
    console.log('User ID:', user.id);

    const { data: reviews, error } = await supabase
        .from('business_reviews')
        .select('id, review_text, deleted_at, user_id, created_at')
        .eq('user_id', user.id);

    if (error) {
        console.error('Fetch error:', error);
    } else {
        console.log('Found', reviews.length, 'reviews for user.');
        reviews.forEach(r => {
            console.log(`[${r.id}] Created: ${r.created_at} | Deleted: ${r.deleted_at} | Text: ${r.review_text?.substring(0, 20)}...`);
        });
    }
}

checkState();
