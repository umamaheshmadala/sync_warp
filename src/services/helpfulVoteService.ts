import { supabase } from '../lib/supabase';

export interface HelpfulVote {
    id: string;
    review_id: string;
    user_id: string;
    created_at: string;
}

export interface Voter {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    voted_at: string;
}

/**
 * Toggle helpful vote on a review
 * Returns true if now voted, false if vote removed
 */
export async function toggleHelpfulVote(reviewId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('You must be logged in to vote');
    }

    // Check if already voted
    const { data: existingVote } = await supabase
        .from('review_helpful_votes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (existingVote) {
        // Remove vote
        const { error } = await supabase
            .from('review_helpful_votes')
            .delete()
            .eq('id', existingVote.id);

        if (error) throw error;
        return false;
    } else {
        // Add vote
        const { error } = await supabase
            .from('review_helpful_votes')
            .insert({
                review_id: reviewId,
                user_id: user.id
            });

        if (error) {
            if (error.message.includes('own review') || error.message.includes('prevent_self_vote')) {
                throw new Error('You cannot vote on your own review');
            }
            throw error;
        }
        return true;
    }
}

/**
 * Get helpful vote count for a review
 */
export async function getHelpfulCount(reviewId: string): Promise<number> {
    const { count, error } = await supabase
        .from('review_helpful_votes')
        .select('*', { count: 'exact', head: true })
        .eq('review_id', reviewId);

    if (error) throw error;
    return count || 0;
}

/**
 * Check if current user has voted on a review
 */
export async function hasUserVoted(reviewId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data } = await supabase
        .from('review_helpful_votes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', user.id)
        .maybeSingle();

    return !!data;
}

/**
 * Get list of voters for a review
 */
export async function getReviewVoters(reviewId: string, limit = 10): Promise<Voter[]> {
    const { data, error } = await supabase
        .rpc('get_review_voters', {
            p_review_id: reviewId,
            p_limit: limit
        });

    if (error) throw error;
    return data || [];
}

/**
 * Subscribe to vote changes for a review
 */
export function subscribeToVotes(
    reviewId: string,
    callback: (newCount: number) => void
) {
    const channel = supabase
        .channel(`votes:${reviewId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'review_helpful_votes',
                filter: `review_id=eq.${reviewId}`
            },
            async () => {
                // Refetch count on any change
                const count = await getHelpfulCount(reviewId);
                callback(count);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
