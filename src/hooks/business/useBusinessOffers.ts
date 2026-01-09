import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface Offer {
    id: string;
    business_id: string;
    title: string;
    description: string;
    offer_type: 'percentage' | 'fixed' | 'bogo' | 'free_item' | 'special';
    discount_value?: number;
    discount_percentage?: number;
    original_price?: number;
    discounted_price?: number;
    min_purchase_amount?: number;
    max_discount_amount?: number;
    terms_conditions?: string;
    image_url?: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    usage_limit?: number;
    times_used: number;
    created_at: string;
    updated_at: string;
}

interface UseBusinessOffersOptions {
    compact?: boolean;
    enabled?: boolean;
}

/**
 * Hook to fetch business offers with SWR caching.
 * Shows cached data immediately, then refetches in background when stale.
 * 
 * @param businessId - The business UUID
 * @param options.compact - If true, limit to 5 offers (for Overview tab)
 */
export function useBusinessOffers(
    businessId: string | undefined,
    options: UseBusinessOffersOptions = {}
) {
    const { compact = false, enabled = true } = options;

    return useQuery({
        queryKey: ['business-offers', businessId, compact],
        queryFn: async (): Promise<{ offers: Offer[]; totalCount: number }> => {
            if (!businessId) {
                throw new Error('Business ID is required');
            }

            const now = new Date().toISOString();

            // Get total count first
            const { count, error: countError } = await supabase
                .from('offers')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', businessId)
                .eq('is_active', true)
                .lte('start_date', now)
                .gte('end_date', now);

            if (countError) throw countError;

            // Fetch offers with optional limit
            let query = supabase
                .from('offers')
                .select('*')
                .eq('business_id', businessId)
                .eq('is_active', true)
                .lte('start_date', now)
                .gte('end_date', now)
                .order('created_at', { ascending: false });

            if (compact) {
                query = query.limit(5);
            }

            const { data, error } = await query;

            if (error) throw error;

            return {
                offers: data || [],
                totalCount: count || 0,
            };
        },
        enabled: enabled && !!businessId,
        // Use global defaults from queryClient (staleTime: 30min, gcTime: 24hr)
    });
}
