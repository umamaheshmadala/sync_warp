
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Logging in as testuser1...');
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'testuser1@gmail.com',
        password: 'Testuser@1'
    });

    if (authError || !session) {
        console.error('Auth failed', authError);
        return;
    }

    console.log('Logged in. User ID:', session.user.id);

    console.log('Fetching review_report_counts...');
    const { data: viewData, error: viewError } = await supabase
        .from('review_report_counts')
        .select('*');

    if (viewError) {
        console.error('View fetch failed', viewError);
    } else {
        console.log('View Data:', JSON.stringify(viewData, null, 2));
    }

    console.log('Fetching review_reports table directly...');
    const { data: tableData, error: tableError } = await supabase
        .from('review_reports')
        .select('*')
        .eq('status', 'pending');

    if (tableError) {
        console.error('Table fetch failed', tableError);
    } else {
        console.log('Table Data (Pending):', JSON.stringify(tableData, null, 2));
    }

    console.log('Fetching business_reviews for review 6330983d-061c-40dc-b1bb-ea32753c0ce9...');
    const { data: reviewData, error: reviewError } = await supabase
        .from('business_reviews')
        .select('*')
        .eq('id', '6330983d-061c-40dc-b1bb-ea32753c0ce9');

    if (reviewError) {
        console.error('Review fetch failed', reviewError);
    } else {
        console.log('Review Data:', JSON.stringify(reviewData, null, 2));
    }
}

main();
