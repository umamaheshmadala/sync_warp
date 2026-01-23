
const { createClient } = require('@supabase/supabase-js');

// Constants from debug_simple.cjs
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyZW5mc2x0aXRhbnJvemJrb2ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwMTA4NCwiZXhwIjoyMDcwNDc3MDg0fQ.Fr3YEKHMNJUDWLshpk1E_bbRd5chXVAdiS5RBgSPkwE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const REVIEW_ID = 'test-review-id';
const BUSINESS_NAME = 'Debug Business';
const BUSINESS_ID = 'test-business-id';
// We need a valid user ID. I'll attempt to find testuser3 again.
const USER_EMAIL = 'testuser3@gmail.com';

async function run() {
    console.log('--- DEBUG NOTIFICATION START ---');
    console.log('Target User Email:', USER_EMAIL);

    // 1. Get User ID
    const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, notification_preferences')
        .eq('email', USER_EMAIL)
        .single();

    if (userError || !user) {
        console.error('❌ Could not find user:', userError);
        return;
    }
    const userId = user.id;
    console.log('✅ Found User ID:', userId);
    console.log('Current Preferences:', user.notification_preferences);

    // 2. Create In-App Notification
    console.log('🔔 Creating in-app notification...');
    const { data: notifData, error: notifError } = await supabase
        .from('favorite_notifications')
        .insert([{
            user_id: userId,
            type: 'review_response',
            title: 'Debug Notification',
            message: `${BUSINESS_NAME} has responded (Debug)`,
            data: {
                review_id: REVIEW_ID,
                business_name: BUSINESS_NAME,
                business_id: BUSINESS_ID,
                action_url: `/business/${BUSINESS_ID}/reviews#review-${REVIEW_ID}`
            },
            is_read: false,
        }])
        .select()
        .single();

    if (notifError) {
        console.error('❌ Error creating notification:', notifError);
    } else {
        console.log('✅ In-app notification created:', notifData.id);
    }

    // 3. Invoke Edge Function
    console.log('🚀 Invoking send-push-notification...');
    const { data: pushData, error: pushError } = await supabase.functions.invoke('send-push-notification', {
        body: {
            user_id: userId,
            title: `${BUSINESS_NAME} responded (Debug)`,
            body: `Tap to view the response (Debug)`,
            data: {
                type: 'review_response',
                review_id: REVIEW_ID,
                business_id: BUSINESS_ID,
                url: `/business/${BUSINESS_ID}/reviews#review-${REVIEW_ID}`
            }
        },
    });

    if (pushError) {
        console.error('❌ Push Function Error:', pushError);
    } else {
        console.log('✅ Push Function Result:', pushData);
    }

    console.log('--- DEBUG END ---');
}

run();
