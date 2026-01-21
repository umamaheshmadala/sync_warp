import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as admin from 'https://esm.sh/firebase-admin@11.11.0/app'
import { getMessaging } from 'https://esm.sh/firebase-admin@11.11.0/messaging'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Call RPC to get pending reminders
        const { data: reminders, error: fetchError } = await supabaseClient
            .rpc('get_pending_review_reminders')

        if (fetchError) throw fetchError

        if (!reminders || reminders.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No pending reminders' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Firebase Admin (Mock for now if no creds, but structure provided)
        // You would typically need service account JSON in ENV variable
        const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')

        // Process reminders
        const results = []

        for (const reminder of reminders) {
            try {
                // Send Push Notification
                if (fcmServerKey) {
                    const payload = {
                        notification: {
                            title: `How was ${reminder.business_name}?`,
                            body: 'Tap to share your experience!',
                        },
                        data: {
                            type: 'review_reminder',
                            businessId: reminder.business_id,
                            requestId: reminder.request_id,
                            click_action: 'FLUTTER_NOTIFICATION_CLICK' // Or appropriate action
                        },
                        to: reminder.push_token
                    };

                    await fetch('https://fcm.googleapis.com/fcm/send', {
                        method: 'POST',
                        headers: {
                            'Authorization': `key=${fcmServerKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                } else {
                    console.log(`[Mock Send] To: ${reminder.push_token}, Body: How was ${reminder.business_name}?`)
                }

                // Update record
                const { error: updateError } = await supabaseClient
                    .from('review_requests')
                    .update({ reminder_sent_at: new Date().toISOString() })
                    .eq('id', reminder.request_id)

                if (updateError) {
                    console.error('Failed to update request:', updateError)
                    results.push({ id: reminder.request_id, status: 'failed_update', error: updateError })
                } else {
                    results.push({ id: reminder.request_id, status: 'sent' })
                }

            } catch (err) {
                console.error('Error processing reminder:', err)
                results.push({ id: reminder.request_id, status: 'error', error: err })
            }
        }

        return new Response(
            JSON.stringify({ success: true, processed: results.length, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
