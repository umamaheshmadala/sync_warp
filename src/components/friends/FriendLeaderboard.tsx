import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import {
    getFriendLeaderboard,
    getBadgeForCount,
    getRankColor,
    type TimeRange
} from '../../services/friendLeaderboardService';

/**
 * Friend Leaderboard Component
 * 
 * Displays a gamified leaderboard ranking friends by the number of deals (offers) they've found.
 * Features:
 * - Time range filtering (week, month, all time)
 * - Rank medals for top 3 (🥇🥈🥉)
 * - Achievement badges (Hunter, Expert, Legend)
 * - Click to navigate to friend's profile
 * - Loading skeleton and empty state
 * 
 * Future expansion: Multi-metric display for business driver identification
 */
export function FriendLeaderboard() {
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const navigate = useNavigate();

    const { data: leaderboard, isLoading } = useQuery({
        queryKey: ['friend-leaderboard', timeRange],
        queryFn: () => getFriendLeaderboard(timeRange),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Trophy className="mr-2 h-5 w-5" />
                        Top Deal Hunters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                        <Trophy className="mr-2 h-5 w-5" />
                        Top Deal Hunters
                    </CardTitle>
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Time Range Filters */}
                <div className="flex space-x-2 mt-4">
                    <Button
                        size="sm"
                        variant={timeRange === 'week' ? 'default' : 'outline'}
                        onClick={() => setTimeRange('week')}
                    >
                        This Week
                    </Button>
                    <Button
                        size="sm"
                        variant={timeRange === 'month' ? 'default' : 'outline'}
                        onClick={() => setTimeRange('month')}
                    >
                        This Month
                    </Button>
                    <Button
                        size="sm"
                        variant={timeRange === 'all' ? 'default' : 'outline'}
                        onClick={() => setTimeRange('all')}
                    >
                        All Time
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {!leaderboard || leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No deal hunters yet</p>
                        <p className="text-sm">Be the first to find deals!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {leaderboard.map((friend, index) => {
                            const rank = index + 1;
                            const badge = getBadgeForCount(friend.deal_count);

                            return (
                                <div
                                    key={friend.user_id}
                                    onClick={() => navigate(`/profile/${friend.user_id}`)}
                                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                                >
                                    {/* Rank */}
                                    <div className={`text-lg font-bold w-8 text-center ${getRankColor(rank)}`}>
                                        {rank <= 3 ? (
                                            <span className="text-2xl">
                                                {rank === 1 && '🥇'}
                                                {rank === 2 && '🥈'}
                                                {rank === 3 && '🥉'}
                                            </span>
                                        ) : (
                                            rank
                                        )}
                                    </div>

                                    {/* Avatar */}
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={friend.avatar_url} />
                                        <AvatarFallback>
                                            {friend.full_name?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* Name & Stats */}
                                    <div className="flex-1">
                                        <div className="font-medium">{friend.full_name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {friend.deal_count} {friend.deal_count === 1 ? 'deal' : 'deals'} found
                                        </div>
                                    </div>

                                    {/* Badge */}
                                    {badge && (
                                        <div className="text-right">
                                            <div className="text-2xl">{badge.emoji}</div>
                                            <div className={`text-xs font-medium ${badge.color}`}>
                                                {badge.title}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
