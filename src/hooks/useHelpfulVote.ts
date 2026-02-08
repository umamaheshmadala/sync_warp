import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
    toggleHelpfulVote,
    getHelpfulCount,
    hasUserVoted,
    subscribeToVotes
} from '@/services/helpfulVoteService';
import { toast } from 'sonner';

export function useHelpfulVote(reviewId: string, reviewAuthorId: string, initialCount = 0, initialHasVoted = false) {
    const user = useAuthStore(state => state.user);
    const [count, setCount] = useState(initialCount);
    const [hasVoted, setHasVoted] = useState(initialHasVoted);
    const [isVoting, setIsVoting] = useState(false);

    const isOwnReview = user?.id === reviewAuthorId;
    const canVote = !!user && !isOwnReview;

    // Fetch initial state only if not provided or if we want to ensure freshness (optional)
    // To solve performance issue, we SKIP fetch if we believe initial values are good.
    // However, if initial values are defaults (0/false), we might still want to fetch?
    // But ReviewCard passes fetched values. If they are genuinely 0/false, we shouldn't re-fetch.
    // So we can remove the initial fetch effect entirely and rely on props + subscription.

    // Update state if props change (e.g. parent revalidates)
    useEffect(() => {
        setCount(initialCount);
        setHasVoted(initialHasVoted);
    }, [initialCount, initialHasVoted]);

    // Subscribe to real-time updates
    useEffect(() => {
        const unsubscribe = subscribeToVotes(reviewId, (newCount) => {
            setCount(newCount);
        });

        return unsubscribe;
    }, [reviewId]);

    const toggleVote = useCallback(async () => {
        if (!canVote) {
            if (!user) {
                toast.error('Please log in to vote');
            } else if (isOwnReview) {
                toast.error('You cannot vote on your own review');
            }
            return;
        }

        setIsVoting(true);

        try {
            const nowVoted = await toggleHelpfulVote(reviewId);
            setHasVoted(nowVoted);
            setCount(prev => nowVoted ? prev + 1 : prev - 1);

            toast.success(nowVoted ? 'Marked as helpful' : 'Vote removed');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to vote');
        } finally {
            setIsVoting(false);
        }
    }, [reviewId, canVote, user, isOwnReview]);

    return {
        count,
        hasVoted,
        isVoting,
        toggleVote,
        canVote,
        isOwnReview
    };
}
