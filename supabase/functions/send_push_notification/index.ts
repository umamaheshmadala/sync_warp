import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface NotificationRequest {
    user_id: string;
    notification_type: string;
    title: string;
    body: string;
    data?: Record<string, string>;
}

Deno.serve(async (req) => {
    try {
        const {
            user_id,
            notification_type,
            title,
            body,
            data = {},
        }: NotificationRequest = await req.json();

        console.log('[send_push_notification] Request received:', {
            user_id,
            notification_type,
            title,
        });

        // Get user's device tokens
        const { data: tokens, error: tokensError } = await supabase
            .from('push_tokens')
            .select('token, platform')
            .eq('user_id', user_id)
            .eq('is_active', true);

        if (tokensError) {
            console.error('[send_push_notification] Error fetching tokens:', tokensError);
            throw tokensError;
        }

        if (!tokens || tokens.length === 0) {
            console.log('[send_push_notification] No active tokens found for user:', user_id);
            return new Response(
                JSON.stringify({ error: 'No active tokens found for user' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[send_push_notification] Found ${tokens.length} active tokens`);

        // TODO: Send notifications via Firebase Admin SDK
        // For now, just log to notification_log table
        const results = await Promise.allSettled(
            tokens.map(async ({ token, platform }: any) => {
                try {
                    // Log the notification
                    await supabase.from('notification_log').insert({
                        user_id,
                        notification_type,
                        title,
                        body,
                        data,
                        platform,
                        delivered: false, // Will be true when FCM is integrated
                        error: 'Firebase Admin SDK not configured yet',
                    });

                    console.log(`[send_push_notification] Logged notification for ${platform} device`);
                    return { success: true, platform };
                } catch (error) {
                    console.error(`[send_push_notification] Error logging notification:`, error);
                    throw error;
                }
            })
        );

        const successful = results.filter((r: any) => r.status === 'fulfilled').length;
        const failed = results.filter((r: any) => r.status === 'rejected').length;

        console.log(`[send_push_notification] Results: ${successful} logged, ${failed} failed`);

        return new Response(
            JSON.stringify({
                sent: successful,
                failed,
                total: tokens.length,
                note: 'Notifications logged. Firebase Admin SDK integration pending.',
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error: any) {
        console.error('[send_push_notification] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
});
