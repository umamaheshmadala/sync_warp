import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        const record = payload.record; // Webhook payload structure

        if (!record || !record.review_id) {
            console.error('Invalid webhook payload:', payload);
            return new Response(JSON.stringify({ error: 'Missing record or review_id' }), { status: 400, headers: corsHeaders });
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Fetch Review Details
        const { data: review, error: reviewError } = await supabase
            .from('business_reviews')
            .select('user_id, business_id')
            .eq('id', record.review_id)
            .single();

        if (reviewError || !review) {
            console.error('Review fetch error:', reviewError);
            return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404, headers: corsHeaders });
        }

        // Fetch Business Name
        const { data: business, error: bizError } = await supabase
            .from('businesses')
            .select('business_name')
            .eq('id', review.business_id)
            .single();

        const businessName = business?.business_name || 'Business';

        console.log(`Processing response notification for Review ${record.review_id} (User ${review.user_id})`);

        // Invoke Generic Push Function (FCM V1)
        const { data: pushData, error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: {
                userId: review.user_id,
                title: `${businessName} responded to your review`,
                body: record.response_text ? record.response_text.slice(0, 100) : 'Tap to view response',
                data: {
                    type: 'review_response',
                    reviewId: record.review_id,
                    businessId: review.business_id,
                    action_url: `/business/${review.business_id}/reviews#review-${record.review_id}` // Fixed Action URL
                }
            }
        });

        if (pushError) {
            console.error('Failed to invoke send-push-notification:', pushError);
            throw pushError;
        }

        console.log('Push delegation successful:', pushData);

        return new Response(JSON.stringify(pushData), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (err) {
        console.error('Edge Function Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
