import { useQuery } from '@tanstack/react-query';
import { getBusinessDetails, getBusinessAuditHistory } from '@/services/adminBusinessService';

export function useBusinessDetails(businessId: string | null) {
    return useQuery({
        queryKey: ['admin-business-details', businessId],
        queryFn: () => getBusinessDetails(businessId!),
        enabled: !!businessId,
    });
}

export function useBusinessAuditHistory(businessId: string | null) {
    return useQuery({
        queryKey: ['admin-business-audit', businessId],
        queryFn: () => getBusinessAuditHistory(businessId!),
        enabled: !!businessId,
    });
}
