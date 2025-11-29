import { useQuery } from '@tanstack/react-query';
import { friendsService } from '../../services/friendsService';
import { useAuthStore } from '../../store/authStore';

/**
 * React Query hook to fetch and manage the current user's friends list.
 * 
 * This hook automatically fetches the friends list for the authenticated user
 * and provides loading states, error handling, and automatic refetching capabilities.
 * The data is cached for 5 minutes and refetches when the window regains focus.
 * 
 * @returns UseQueryResult containing friends data, loading state, and error information
 * 
 * @example
 * ```typescript
 * import { useFriends } from '@/hooks/friends/useFriends';
 * 
 * function FriendsList() {
 *   const { data, isLoading, error, refetch } = useFriends();
 * 
 *   if (isLoading) return <Skeleton count={5} />;
 *   if (error) return <ErrorMessage error={error} onRetry={refetch} />;
 * 
 *   const friends = data?.data || [];
 *   
 *   return (
 *     <div>
 *       <h2>My Friends ({friends.length})</h2>
 *       {friends.map(friend => (
 *         <FriendCard key={friend.id} friend={friend} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @see {@link friendsService.getFriends} for the underlying service function
 * @see {@link Friend} for the structure of friend objects
 */
export function useFriends() {
    const user = useAuthStore(state => state.user);

    const query = useQuery({
        queryKey: ['friends', user?.id],
        queryFn: async () => {
            console.log('🔍 useFriends: Fetching friends for user:', user?.id);
            const result = await friendsService.getFriends(user!.id);
            console.log('🔍 useFriends: Service returned:', result);
            console.log('🔍 useFriends: Friends data:', result?.data);
            console.log('🔍 useFriends: Friends count:', result?.data?.length);
            return result;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false, // Disable auto-refresh
    });

    console.log('🔍 useFriends: Query result:', query.data);
    console.log('🔍 useFriends: Is loading:', query.isLoading);
    console.log('🔍 useFriends: Error:', query.error);

    return query;
}
