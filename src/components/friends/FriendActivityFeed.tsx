import { useInfiniteQuery } from '@tanstack/react-query';
import { UserPlus, Heart, Tag, Share2, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { FriendActivity } from '@/types/friends';
import { useRealtimeActivities } from '@/hooks/useRealtimeActivities';

const ACTIVITY_ICONS = {
    friend_added: UserPlus,
    friend_joined: UserPlus,
    deal_liked: Heart,
    deal_saved: Tag,
    deal_shared: Share2,
} as const;

const ACTIVITY_COLORS = {
    friend_added: 'text-blue-500 bg-blue-50',
    friend_joined: 'text-green-500 bg-green-50',
    deal_liked: 'text-red-500 bg-red-50',
    deal_saved: 'text-green-500 bg-green-50',
    deal_shared: 'text-purple-500 bg-purple-50',
} as const;

export function FriendActivityFeed() {
    const navigate = useNavigate();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['friend-activities'],
        queryFn: async ({ pageParam = 0 }) => {
            const { data, error } = await supabase.rpc('get_friend_activities', {
                page_limit: 20,
                page_offset: pageParam,
            });

            if (error) throw error;
            return data as FriendActivity[];
        },
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < 20) return undefined;
            return allPages.length * 20;
        },
        initialPageParam: 0,
        staleTime: 1000 * 60, // 1 minute
    });

    // Add real-time updates
    useRealtimeActivities();

    const activities = data?.pages.flat() ?? [];

    const getActivityText = (activity: FriendActivity): string => {
        switch (activity.activity_type) {
            case 'friend_added':
                return `is now friends with ${activity.related_user_full_name}`;
            case 'friend_joined':
                return 'joined SynC';
            case 'deal_liked':
                return `liked ${activity.metadata.deal_title || 'a deal'}`;
            case 'deal_saved':
                return `saved ${activity.metadata.deal_title || 'a deal'}`;
            case 'deal_shared':
                return `shared ${activity.metadata.deal_title || 'a deal'}`;
            default:
                return 'had an activity';
        }
    };

    const handleActivityClick = (activity: FriendActivity) => {
        if (activity.activity_type === 'friend_added' && activity.related_user_id) {
            navigate(`/profile/${activity.related_user_id}`);
        } else if (activity.related_deal_id) {
            navigate(`/deals/${activity.related_deal_id}`);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-bold">Friend Activity</h2>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-start space-x-3 p-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-bold">Friend Activity</h2>
                <div className="p-6 text-center">
                    <p className="text-muted-foreground mb-4">Failed to load activities</p>
                    <Button onClick={() => refetch()}>Try Again</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Friend Activity</h2>
                <Button variant="ghost" size="sm" onClick={() => refetch()}>
                    Refresh
                </Button>
            </div>

            {activities.length === 0 ? (
                <div className="p-8 text-center border rounded-lg bg-muted/20">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="font-semibold text-lg mb-1">No recent activity</h3>
                    <p className="text-sm text-muted-foreground">
                        When your friends are active, you'll see it here
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {activities.map((activity) => {
                        const Icon = ACTIVITY_ICONS[activity.activity_type];
                        const colorClass = ACTIVITY_COLORS[activity.activity_type];

                        return (
                            <div
                                key={activity.id}
                                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => handleActivityClick(activity)}
                            >
                                <div className={`p-2 rounded-full ${colorClass}`}>
                                    <Icon className="h-4 w-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm">
                                        <span className="font-medium">{activity.user_full_name}</span>{' '}
                                        <span className="text-muted-foreground">
                                            {getActivityText(activity)}
                                        </span>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {formatDistanceToNow(new Date(activity.created_at), {
                                            addSuffix: true,
                                        })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {hasNextPage && (
                        <div className="pt-4 text-center">
                            <Button
                                variant="outline"
                                onClick={() => fetchNextPage()}
                                disabled={isFetchingNextPage}
                            >
                                {isFetchingNextPage ? 'Loading...' : 'Load More'}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
