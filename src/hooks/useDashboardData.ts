import { dashboardService } from '../services/dashboardService';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

export const fetchDashboardData = async (userId: string) => {
    if (!userId) return null;

    const [statsData, businessesData, offersData, productsData] = await Promise.all([
        dashboardService.getDashboardStats(userId),
        dashboardService.getSpotlightBusinesses(3),
        dashboardService.getHotOffers(2),
        dashboardService.getTrendingProducts(3),
    ]);

    return { statsData, businessesData, offersData, productsData };
};

export const useDashboardData = () => {
    const { user } = useAuthStore();

    return useQuery({
        queryKey: ['dashboard', user?.id],
        queryFn: () => fetchDashboardData(user!.id),
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
        placeholderData: (previousData) => previousData,
    });
};
