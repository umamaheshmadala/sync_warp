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

    return useQuery({
        queryKey: ['friends', user?.id],
        queryFn: () => friendsService.getFriends(user!.id),
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: true,
    });
}
