import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
    toggleHelpfulVote,
    getHelpfulCount,
    hasUserVoted,
    subscribeToVotes
} from '@/services/helpfulVoteService';
import { toast } from 'sonner';

export function useHelpfulVote(reviewId: string, reviewAuthorId: string) {
    const user = useAuthStore(state => state.user);
    const [count, setCount] = useState(0);
    const [hasVoted, setHasVoted] = useState(false);
    const [isVoting, setIsVoting] = useState(false);

    const isOwnReview = user?.id === reviewAuthorId;
    const canVote = !!user && !isOwnReview;

    // Fetch initial state
    useEffect(() => {
        const fetchState = async () => {
            try {
                const [voteCount, voted] = await Promise.all([
                    getHelpfulCount(reviewId),
                    user ? hasUserVoted(reviewId) : false
                ]);
                setCount(voteCount);
                setHasVoted(voted);
            } catch (error) {
                console.error('Error fetching vote state:', error);
            }
        };

        fetchState();
    }, [reviewId, user]);

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
