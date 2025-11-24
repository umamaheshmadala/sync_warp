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

// Firebase Admin SDK setup
const getFirebaseApp = async () => {
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

    if (!serviceAccountJson) {
        console.warn('[send_push_notification] Firebase service account not configured');
        return null;
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountJson);

        // Import Firebase Admin SDK
        const { initializeApp, cert, getApps } = await import('npm:firebase-admin@12.0.0/app');
        const { getMessaging } = await import('npm:firebase-admin@12.0.0/messaging');

        // Initialize Firebase if not already initialized
        if (getApps().length === 0) {
            initializeApp({
                credential: cert(serviceAccount),
            });
            console.log('[send_push_notification] Firebase Admin SDK initialized');
        }

        return getMessaging();
    } catch (error) {
        console.error('[send_push_notification] Firebase initialization error:', error);
        return null;
    }
};

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

        // Get Firebase messaging instance
        const messaging = await getFirebaseApp();
        const firebaseEnabled = messaging !== null;

        // Send notifications
        const results = await Promise.allSettled(
            tokens.map(async ({ token, platform }: any) => {
                let delivered = false;
                let error_msg = null;

                try {
                    if (firebaseEnabled && messaging) {
                        // Send via Firebase Admin SDK
                        const message: any = {
                            token,
                            notification: {
                                title,
                                body,
                            },
                            data: {
                                ...data,
                                notification_type,
                                user_id,
                            },
                        };

                        // Platform-specific configuration
                        if (platform === 'android') {
                            message.android = {
                                priority: 'high',
                                notification: {
                                    sound: 'default',
                                    channelId: 'friend_notifications',
                                },
                            };
                        } else if (platform === 'ios') {
                            message.apns = {
                                payload: {
                                    aps: {
                                        sound: 'default',
                                        badge: 1,
                                    },
                                },
                            };
                        }

                        await messaging.send(message);
                        delivered = true;
                        console.log(`[send_push_notification] Sent to ${platform} device via FCM`);
                    } else {
                        error_msg = 'Firebase Admin SDK not configured';
                        console.log(`[send_push_notification] Firebase not configured, logging only`);
                    }

                    // Log the notification
                    await supabase.from('notification_log').insert({
                        user_id,
                        notification_type,
                        title,
                        body,
                        data,
                        platform,
                        delivered,
                        error: error_msg,
                    });

                    return { success: true, platform, delivered };
                } catch (error: any) {
                    console.error(`[send_push_notification] Error sending to ${platform}:`, error);

                    // Check if token is invalid
                    if (error.code === 'messaging/invalid-registration-token' ||
                        error.code === 'messaging/registration-token-not-registered') {
                        // Mark token as inactive
                        await supabase
                            .from('push_tokens')
                            .update({ is_active: false })
                            .eq('token', token);
                        console.log(`[send_push_notification] Marked token as inactive: ${token}`);
                    }

                    // Log failed notification
                    await supabase.from('notification_log').insert({
                        user_id,
                        notification_type,
                        title,
                        body,
                        data,
                        platform,
                        delivered: false,
                        error: error.message || 'Unknown error',
                    });

                    throw error;
                }
            })
        );

        const successful = results.filter((r: any) => r.status === 'fulfilled').length;
        const failed = results.filter((r: any) => r.status === 'rejected').length;
        const actuallyDelivered = results
            .filter((r: any) => r.status === 'fulfilled')
            .filter((r: any) => r.value.delivered).length;

        console.log(`[send_push_notification] Results: ${successful} sent, ${failed} failed, ${actuallyDelivered} delivered`);

        return new Response(
            JSON.stringify({
                sent: successful,
                failed,
                delivered: actuallyDelivered,
                total: tokens.length,
                firebase_enabled: firebaseEnabled,
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
