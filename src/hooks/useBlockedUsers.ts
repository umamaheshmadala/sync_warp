import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBlockedUsers, unblockUser, type BlockedUser } from '@/services/blockService';
import { toast } from 'react-hot-toast';

export function useBlockedUsers() {
    const queryClient = useQueryClient();

    const {
        data: blockedUsers = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ['blockedUsers'],
        queryFn: () => getBlockedUsers(),
    });

    const { mutate: unblockUserMutation, isPending: isUnblocking } = useMutation({
        mutationFn: async (userId: string) => {
            return unblockUser(userId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
            // Also invalidate friends/requests queries as unblocking might affect them (though usually it doesn't restore friendship)
            queryClient.invalidateQueries({ queryKey: ['friends'] });
            toast.success('User unblocked successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to unblock user');
        },
    });

    return {
        blockedUsers,
        isLoading,
        error,
        unblockUser: unblockUserMutation,
        isUnblocking,
    };
}
