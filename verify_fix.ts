
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// MOCK SERVICE LOGIC for isolation testing
async function deleteReviewServiceMock(supabase: any, user: any, reviewId: string) {
    console.log(`[ServiceMock] Attempting soft delete for ${reviewId} as ${user.id}`);

    // 1. Update
    const { data, error: deleteError } = await supabase
        .from('business_reviews')
        .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user.id
        })
        .eq('id', reviewId)
        .select();

    if (deleteError) throw deleteError;

    // 2. Strict Check
    if (!data || data.length === 0) {
        throw new Error('Strict Check Failed: No rows updated');
    }

    // 3. Persistence Delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // 4. Persistence Check
    const { data: check } = await supabase
        .from('business_reviews')
        .select('deleted_at')
        .eq('id', reviewId)
        .single();

    if (!check || !check.deleted_at) {
        throw new Error('Persistence Check Failed: deleted_at is null');
    }

    console.log('[ServiceMock] Deletion Verified & Persisted ✅');
}

async function runTest() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Env Vars');

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔹 Logging in...');
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'testuser2@gmail.com',
        password: 'Testuser@1'
    });
    if (loginError) throw loginError;

    // 1. Create Test Review
    console.log('🔹 Creating test review...');
    const { data: review, error: createError } = await supabase
        .from('business_reviews')
        .insert({
            business_id: 'ac269130-cfb0-4c36-b5ad-34931cd19b50', // Valid Business ID
            user_id: user.id,
            review_text: 'VERIFY_FIX_TEST_' + Date.now(),
            recommendation: true,
            is_featured: false
        })
        .select()
        .single();

    if (createError) throw createError;
    console.log(`🔹 Created review: ${review.id}`);

    // 2. Perform Delete
    try {
        await deleteReviewServiceMock(supabase, user, review.id);
    } catch (e: any) {
        console.error('❌ Deletion Logic Failed:', e.message);
        process.exit(1);
    }

    // 3. Final External Verification
    const { data: finalCheck } = await supabase
        .from('business_reviews')
        .select('deleted_at')
        .eq('id', review.id)
        .single();

    console.log('🔹 Final DB State:', finalCheck);

    if (finalCheck?.deleted_at) {
        console.log('✅ TEST PASSED: Review is soft deleted.');
    } else {
        console.error('❌ TEST FAILED: Review is still active.');
        process.exit(1);
    }
}

runTest().catch(console.error);
