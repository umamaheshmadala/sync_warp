import { useQuery } from '@tanstack/react-query';
import { getBusinessList, getBusinessStats, getFilterOptions, getHardDeletedBusinesses, BusinessListParams } from '@/services/adminBusinessService';

export function useAdminBusinessList(params: BusinessListParams) {
    const { enabled = true, ...queryParams } = params;
    return useQuery({
        queryKey: ['admin-businesses', queryParams],
        queryFn: () => getBusinessList(queryParams),
        staleTime: 30000, // 30 seconds
        enabled,
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

export function useHardDeletedBusinesses(params: {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    enabled?: boolean;
}) {
    const { enabled = true, ...queryParams } = params;
    return useQuery({
        queryKey: ['admin-hard-deleted-businesses', queryParams],
        queryFn: () => getHardDeletedBusinesses(queryParams),
        staleTime: 30000,
        enabled,
    });
}
