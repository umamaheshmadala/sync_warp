import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

interface RecentActivityFeedProps {
    userId: string;
}

interface ActivityItem {
    id: string;
    activity_type: string;
    related_user_id: string | null;
    related_username: string | null;
    related_avatar: string | null;
    related_full_name: string | null;
    metadata: Record<string, any>;
    created_at: string;
}

// Format time as short format (e.g., "22m", "5h", "2d")
const formatShortTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffSeconds < 60) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks < 4) return `${diffWeeks}w`;
    return `${Math.floor(diffDays / 30)}mo`;
};

// Map activity types to user-friendly descriptions
const getActivityDescription = (activity: ActivityItem): string => {
    const name = activity.related_full_name || activity.related_username || 'a user';
    const dealInfo = activity.metadata?.deal_title || 'a deal';

    switch (activity.activity_type) {
        // Current activity types from friend_activities schema
        case 'friend_added':
            return `Became friends with ${name}`;
        case 'friend_joined':
            return `${name} joined SynC`;
        case 'deal_liked':
            return `Liked "${dealInfo}"`;
        case 'deal_saved':
            return `Saved "${dealInfo}"`;
        case 'deal_shared':
            return `Shared "${dealInfo}"`;
        // Legacy activity types from notifications integration
        case 'sent_friend_request':
            return `Sent friend request to ${name}`;
        case 'received_friend_request':
            return `Received request from ${name}`;
        case 'accepted_friend_request':
            return `Became friends with ${name}`;
        case 'rejected_friend_request':
            return `Declined request from ${name}`;
        case 'cancelled_friend_request':
            return `Cancelled request to ${name}`;
        case 'removed_friend':
            return `Unfriended ${name}`;
        case 'started_following':
            return `Started following ${name}`;
        case 'stopped_following':
            return `Unfollowed ${name}`;
        case 'blocked_user':
            return `Blocked ${name}`;
        case 'unblocked_user':
            return `Unblocked ${name}`;
        default:
            // Show readable format for unknown types
            return activity.activity_type?.replace(/_/g, ' ') || 'Activity';
    }
};

export function RecentActivityFeed({ userId }: RecentActivityFeedProps) {
    const { data: activities, isLoading } = useQuery<ActivityItem[]>({
        queryKey: ['user-activity-feed', userId],
        queryFn: async () => {
            // Query activities for the specific user (the friend whose profile we're viewing)
            const { data, error } = await supabase
                .from('friend_activities')
                .select(`
                    id,
                    activity_type,
                    related_user_id,
                    metadata,
                    created_at
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) {
                console.error('Error fetching activity feed:', error);
                return [];
            }

            console.log('[ActivityFeed] Raw data from DB:', data);

            // Fetch profile info for related users
            if (data && data.length > 0) {
                const relatedUserIds = data
                    .map(a => a.related_user_id)
                    .filter((id): id is string => id !== null);

                if (relatedUserIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, username, full_name, avatar_url')
                        .in('id', relatedUserIds);

                    const profileMap = new Map(
                        profiles?.map(p => [p.id, p]) || []
                    );

                    return data.map(activity => ({
                        ...activity,
                        related_username: profileMap.get(activity.related_user_id)?.username || null,
                        related_full_name: profileMap.get(activity.related_user_id)?.full_name || null,
                        related_avatar: profileMap.get(activity.related_user_id)?.avatar_url || null,
                    }));
                }
            }

            return data?.map(activity => ({
                ...activity,
                related_username: null,
                related_full_name: null,
                related_avatar: null,
            })) || [];
        },
        enabled: !!userId,
        staleTime: 30000, // Cache for 30 seconds
    });

    if (isLoading) {
        return (
            <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent Activity</h3>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!activities || activities.length === 0) {
        return (
            <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent Activity</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
            </div>
        );
    }

    return (
        <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent Activity</h3>
            <div className="space-y-2">
                {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                            {getActivityDescription(activity)}
                        </p>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                            {formatShortTime(activity.created_at)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}


