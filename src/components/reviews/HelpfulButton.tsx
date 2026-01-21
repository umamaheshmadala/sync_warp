import { ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useHelpfulVote } from '@/hooks/useHelpfulVote';
import { getReviewVoters, Voter } from '@/services/helpfulVoteService';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface HelpfulButtonProps {
    reviewId: string;
    reviewAuthorId: string;
    initialCount?: number;
}

export function HelpfulButton({ reviewId, reviewAuthorId, initialCount = 0 }: HelpfulButtonProps) {
    const { count, hasVoted, isVoting, toggleVote, canVote, isOwnReview } = useHelpfulVote(reviewId, reviewAuthorId);
    const [voters, setVoters] = useState<Voter[]>([]);
    const [votersLoading, setVotersLoading] = useState(false);

    const handleShowVoters = async () => {
        if (count === 0) return;

        setVotersLoading(true);
        try {
            const voterList = await getReviewVoters(reviewId);
            setVoters(voterList);
        } catch (error) {
            console.error('Failed to load voters', error);
        } finally {
            setVotersLoading(false);
        }
    };

    // Don't render if own review
    if (isOwnReview) return null;

    return (
        <div className="flex items-center gap-2">
            <Button
                variant={hasVoted ? 'default' : 'outline'}
                size="sm"
                onClick={toggleVote}
                disabled={isVoting || !canVote}
                className={cn(
                    'gap-1.5 h-8',
                    hasVoted && 'bg-blue-600 text-white hover:bg-blue-700'
                )}
            >
                <ThumbsUp className={cn(
                    'w-3.5 h-3.5',
                    hasVoted && 'fill-current'
                )} />
                Helpful
            </Button>

            {/* Vote count with voter list dropdown */}
            {count > 0 ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            onClick={handleShowVoters}
                            className="text-xs text-gray-500 hover:text-blue-600 hover:underline transition-colors focus:outline-none"
                        >
                            {count === 1
                                ? '1 person found this helpful'
                                : `${count} people found this helpful`}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 p-0" align="start">
                        <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                            <h4 className="font-semibold text-sm">Helpful Votes</h4>
                        </div>
                        {votersLoading ? (
                            <div className="p-4 text-center text-xs text-gray-500">Loading...</div>
                        ) : (
                            <div className="max-h-60 overflow-y-auto p-2">
                                {voters.length > 0 ? (
                                    <div className="space-y-1">
                                        {voters.map(voter => (
                                            <div key={voter.user_id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                <Avatar className="w-6 h-6">
                                                    <AvatarImage src={voter.avatar_url || undefined} />
                                                    <AvatarFallback className="text-[10px]">{voter.full_name?.[0] || '?'}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{voter.full_name}</p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {formatDistanceToNow(new Date(voter.voted_at), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {count > 10 && (
                                            <p className="text-xs text-center text-gray-400 py-2">
                                                +{count - 10} more
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-xs text-gray-500">No voters found</div>
                                )}
                            </div>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <span className="text-xs text-gray-400">
                    Be the first to find this helpful
                </span>
            )}
        </div>
    );
}
