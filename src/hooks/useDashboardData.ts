import { dashboardService } from '../services/dashboardService';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

export const useDashboardData = () => {
    const { user } = useAuthStore();
    const userId = user?.id;
    const isEnabled = !!userId;

    const statsQuery = useQuery({
        queryKey: ['dashboard', 'stats', userId],
        queryFn: () => dashboardService.getDashboardStats(userId!),
        enabled: isEnabled,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const businessesQuery = useQuery({
        queryKey: ['dashboard', 'businesses', userId],
        queryFn: () => dashboardService.getSpotlightBusinesses(3),
        enabled: isEnabled,
        staleTime: 1000 * 60 * 5,
    });

    const offersQuery = useQuery({
        queryKey: ['dashboard', 'offers', userId],
        queryFn: () => dashboardService.getHotOffers(6),
        enabled: isEnabled,
        staleTime: 1000 * 60 * 5,
    });

    const productsQuery = useQuery({
        queryKey: ['dashboard', 'products', userId],
        queryFn: () => dashboardService.getTrendingProducts(6),
        enabled: isEnabled,
        staleTime: 1000 * 60 * 5,
    });

    return {
        // Data
        statsData: statsQuery.data,
        businessesData: businessesQuery.data,
        offersData: offersQuery.data,
        productsData: productsQuery.data,

        // Loading states
        isLoadingStats: statsQuery.isLoading,
        isLoadingBusinesses: businessesQuery.isLoading,
        isLoadingOffers: offersQuery.isLoading,
        isLoadingProducts: productsQuery.isLoading,

        // Aggregate loading state (if needed for global spinner, though discouraged)
        isLoading: statsQuery.isLoading || businessesQuery.isLoading || offersQuery.isLoading || productsQuery.isLoading,

        // Refetch functions
        refetchStats: statsQuery.refetch,
        refetchBusinesses: businessesQuery.refetch,
        refetchOffers: offersQuery.refetch,
        refetchProducts: productsQuery.refetch,
        refetchAll: () => {
            statsQuery.refetch();
            businessesQuery.refetch();
            offersQuery.refetch();
            productsQuery.refetch();
        }
    };
};
