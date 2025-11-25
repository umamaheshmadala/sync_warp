import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
    try {
        console.log('[birthday_reminders] Starting birthday check...');

        // Get today's date (month and day only)
        const today = new Date();
        const todayMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
        const todayDay = today.getDate();

        console.log(`[birthday_reminders] Checking for birthdays on ${todayMonth}/${todayDay}`);

        // Find users with birthdays today
        const { data: birthdayUsers, error: birthdayError } = await supabase
            .from('profiles')
            .select('id, full_name, date_of_birth')
            .not('date_of_birth', 'is', null);

        if (birthdayError) {
            console.error('[birthday_reminders] Error fetching users:', birthdayError);
            throw birthdayError;
        }

        // Filter users with birthdays today
        const todaysBirthdays = birthdayUsers?.filter(user => {
            if (!user.date_of_birth) return false;
            const birthDate = new Date(user.date_of_birth);
            return birthDate.getMonth() + 1 === todayMonth && birthDate.getDate() === todayDay;
        }) || [];

        console.log(`[birthday_reminders] Found ${todaysBirthdays.length} birthdays today`);

        if (todaysBirthdays.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No birthdays today', count: 0 }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // For each birthday user, notify their friends
        let totalNotificationsSent = 0;

        for (const birthdayUser of todaysBirthdays) {
            console.log(`[birthday_reminders] Processing birthday for ${birthdayUser.full_name}`);

            // Get friends of the birthday user
            const { data: friendships, error: friendsError } = await supabase
                .from('friendships')
                .select('user_id, friend_id')
                .or(`user_id.eq.${birthdayUser.id},friend_id.eq.${birthdayUser.id}`)
                .eq('status', 'active');

            if (friendsError) {
                console.error(`[birthday_reminders] Error fetching friends for ${birthdayUser.id}:`, friendsError);
                continue;
            }

            // Extract friend IDs (excluding the birthday user)
            const friendIds = friendships?.map(f =>
                f.user_id === birthdayUser.id ? f.friend_id : f.user_id
            ) || [];

            console.log(`[birthday_reminders] Found ${friendIds.length} friends to notify`);

            // Get Edge Function URL and service role key
            const { data: settings } = await supabase
                .from('app_settings')
                .select('key, value')
                .in('key', ['edge_function_url', 'service_role_key']);

            const edgeFunctionUrl = settings?.find(s => s.key === 'edge_function_url')?.value;
            const serviceRoleKey = settings?.find(s => s.key === 'service_role_key')?.value;

            if (!edgeFunctionUrl || !serviceRoleKey) {
                console.error('[birthday_reminders] Missing Edge Function configuration');
                continue;
            }

            // Send notification to each friend
            for (const friendId of friendIds) {
                try {
                    // Check if friend has birthday reminders enabled
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('notification_preferences')
                        .eq('id', friendId)
                        .single();

                    const prefs = profile?.notification_preferences || {};
                    const birthdayRemindersEnabled = prefs.birthday_reminders !== false;

                    if (!birthdayRemindersEnabled) {
                        console.log(`[birthday_reminders] Skipping ${friendId} - birthday reminders disabled`);
                        continue;
                    }

                    // Call send_push_notification Edge Function
                    await supabase.functions.invoke('send_push_notification', {
                        body: {
                            user_id: friendId,
                            notification_type: 'birthday_reminder',
                            title: '🎉 Birthday Today!',
                            body: `It's ${birthdayUser.full_name}'s birthday today! Send them a message!`,
                            data: {
                                type: 'birthday_reminder',
                                birthday_user_id: birthdayUser.id,
                                birthday_user_name: birthdayUser.full_name,
                                action_url: `/friends`
                            }
                        }
                    });

                    totalNotificationsSent++;
                    console.log(`[birthday_reminders] Sent notification to friend ${friendId}`);
                } catch (error) {
                    console.error(`[birthday_reminders] Error sending notification to ${friendId}:`, error);
                }
            }
        }

        console.log(`[birthday_reminders] Completed. Sent ${totalNotificationsSent} notifications`);

        return new Response(
            JSON.stringify({
                message: 'Birthday reminders sent',
                birthdays: todaysBirthdays.length,
                notifications_sent: totalNotificationsSent
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error: any) {
        console.error('[birthday_reminders] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
});
