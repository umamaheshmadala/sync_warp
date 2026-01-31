import { useQuery } from '@tanstack/react-query';
import { getBusinessList, getBusinessStats, getFilterOptions, BusinessListParams } from '@/services/adminBusinessService';

export function useAdminBusinessList(params: BusinessListParams) {
    return useQuery({
        queryKey: ['admin-businesses', params],
        queryFn: () => getBusinessList(params),
        staleTime: 30000, // 30 seconds
    });
}

export function useBusinessStats(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['admin-business-stats'],
        queryFn: getBusinessStats,
        staleTime: 60000, // 1 minute
        enabled: options?.enabled ?? true,
    });
}

export function useFilterOptions() {
    return useQuery({
        queryKey: ['admin-business-filter-options'],
        queryFn: getFilterOptions,
        staleTime: 300000, // 5 minutes
    });
}
