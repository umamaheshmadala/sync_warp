
import { notifyUserReviewResponse } from '../src/services/favoriteNotificationService';
import { supabase } from '../src/lib/supabase';

// Mock data
const TEST_REVIEW_ID = 'test-review-id';
const TEST_USER_ID = 'test-user-id'; // Need a real user ID ideally, or mock
const TEST_BUSINESS_ID = 'test-business-id';
const TEST_BUSINESS_NAME = 'Test Business';

// We need a real user ID to test DB constraints if any
// Let's try to fetch a real user first
async function runTest() {
    console.log('🧪 Starting Notification Test...');

    // 1. Get a real user to send to (testuser3)
    const { data: user } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', 'testuser3@gmail.com')
        .single();

    if (!user) {
        console.error('❌ Could not find testuser3');
        return;
    }

    console.log(`👤 Found test user: ${user.id} (${user.email})`);

    // 2. Call the function
    console.log('🚀 Calling notifyUserReviewResponse...');
    await notifyUserReviewResponse(
        TEST_REVIEW_ID,
        user.id,
        TEST_BUSINESS_NAME,
        TEST_BUSINESS_ID
    );

    console.log('✅ Test function finished.');
}

runTest().catch(console.error);
