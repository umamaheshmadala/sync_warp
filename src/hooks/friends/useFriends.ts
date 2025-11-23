import { useQuery } from '@tanstack/react-query';
import { friendsService } from '../../services/friendsService';
import { useAuthStore } from '../../store/authStore';

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
