import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { parseBusinessIdentifier } from '../../utils/slugUtils';

// Business type matching BusinessProfile
export interface Business {
    id: string;
    user_id: string;
    business_name: string;
    business_type: string;
    description: string;
    business_email?: string;
    business_phone?: string;
    address: string;
    city: string;
    state: string;
    postal_code?: string;
    country: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
    logo_url?: string;
    cover_image_url?: string;
    gallery_images?: string[];
    operating_hours?: Record<string, { open: string; close: string; closed?: boolean }>;
    tags?: string[];
    status: 'pending' | 'active' | 'suspended';
    verified: boolean;
    verified_at?: string;
    website_url?: string;
    social_media: Record<string, string>;
    average_rating: number;
    total_reviews: number;
    total_checkins: number;
    created_at: string;
    updated_at: string;
    claim_status?: string;
    phone_verified?: boolean;
    recommendation_badge?: 'recommended' | 'highly_recommended' | 'very_highly_recommended' | null;
    recommendation_percentage?: number;
    approved_review_count?: number;
    follower_count?: number;
    has_pending_edits?: boolean;
}

export interface BusinessCategory {
    id: string;
    name: string;
    display_name: string;
    description?: string;
    icon_name?: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

interface UseBusinessProfileOptions {
    enabled?: boolean;
}

/**
 * Hook to fetch business profile data with SWR caching.
 * Shows cached data immediately, then refetches in background when stale.
 */
export function useBusinessProfile(
    businessIdOrSlug: string | undefined,
    options: UseBusinessProfileOptions = {}
) {
    const { enabled = true } = options;

    // Parse the business ID from slug
    const parsedBusinessId = businessIdOrSlug
        ? parseBusinessIdentifier(businessIdOrSlug)
        : undefined;

    return useQuery({
        queryKey: ['business', parsedBusinessId],
        queryFn: async (): Promise<Business> => {
            if (!parsedBusinessId) {
                throw new Error('Invalid business identifier');
            }

            let businessData: Business | undefined;

            // If it's 8 chars (short ID), use prefix match
            if (parsedBusinessId.length === 8) {
                const { data: allBusinesses, error: fetchError } = await supabase
                    .from('businesses')
                    .select('*');

                if (fetchError) throw fetchError;

                businessData = allBusinesses?.find(b =>
                    b.id.toLowerCase().startsWith(parsedBusinessId.toLowerCase())
                );

                if (!businessData) {
                    throw new Error('Business not found');
                }
            } else {
                // Full UUID - direct lookup
                const { data, error } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('id', parsedBusinessId)
                    .single();

                if (error) throw error;
                businessData = data;
            }

            if (businessData) {
                // Fetch follower count
                const { count: followerCount } = await supabase
                    .from('business_followers')
                    .select('*', { count: 'exact', head: true })
                    .eq('business_id', businessData.id)
                    .eq('is_active', true);

                businessData.follower_count = followerCount || 0;
            }

            return businessData;
        },
        enabled: enabled && !!parsedBusinessId,
        // Use global defaults from queryClient (staleTime: 30min, gcTime: 24hr)
    });
}

/**
 * Hook to fetch business categories with SWR caching.
 */
export function useBusinessCategories(enabled = true) {
    return useQuery({
        queryKey: ['business-categories'],
        queryFn: async (): Promise<BusinessCategory[]> => {
            const { data, error } = await supabase
                .from('business_categories')
                .select('*')
                .eq('is_active', true)
                .order('sort_order');

            if (error) throw error;
            return data || [];
        },
        enabled,
        // Categories rarely change, cache for longer
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}
