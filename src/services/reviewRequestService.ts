import { supabase } from '../lib/supabase';

export interface ReviewRequest {
    id: string;
    checkin_id: string;
    user_id: string;
    business_id: string;
    prompt_response: 'now' | 'later' | 'never' | null;
    reminder_sent_at: string | null;
    converted: boolean;
    created_at: string;
}

/**
 * Create a review request record after check-in
 */
export async function createReviewRequest(
    checkinId: string,
    businessId: string
): Promise<ReviewRequest> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('review_requests')
        .insert({
            checkin_id: checkinId,
            user_id: user.id,
            business_id: businessId,
            prompt_shown_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        // Duplicate - request already exists for this check-in
        if (error.code === '23505') {
            const { data: existing } = await supabase
                .from('review_requests')
                .select('*')
                .eq('checkin_id', checkinId)
                .single();
            return existing;
        }
        throw error;
    }

    return data;
}

/**
 * Record user's response to review prompt
 */
export async function recordRequestResponse(
    checkinId: string,
    response: 'now' | 'later' | 'never'
): Promise<void> {
    const { error } = await supabase
        .from('review_requests')
        .update({
            prompt_response: response,
            updated_at: new Date().toISOString()
        })
        .eq('checkin_id', checkinId);

    if (error) throw error;
}

/**
 * Check if user has a pending review request for this business
 */
export async function hasPendingRequest(businessId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data } = await supabase
        .from('review_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .eq('converted', false)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

    return !!data;
}

/**
 * Mark reminder as clicked (for analytics)
 */
export async function markReminderClicked(requestId: string): Promise<void> {
    await supabase
        .from('review_requests')
        .update({
            reminder_clicked_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
}
