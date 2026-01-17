/**
 * useShareAnalytics Hook
 * 
 * React hook for fetching share analytics data for entities and businesses
 * Prepares for Story 10.1.10: Business Owner Share Dashboard
 * 
 * @story 10.1.9
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ShareStats } from '@/types/sharing';

export interface EntityShareAnalytics extends ShareStats {
    entityType: string;
    entityId: string;
}

export interface BusinessShareAnalytics {
    totalShares: number;
    sharesThisWeek: number;
    sharesThisMonth: number;
    clickThroughRate: number;
    conversionRate: number;
    methodBreakdown: Record<string, number>;
    dailyShares: Array<{ date: string; count: number }>;
    topSharedItems: Array<{
        entityId: string;
        entityType: string;
        title: string;
        shares: number;
        clicks: number;
        ctr: number;
    }>;
    recentShares: Array<{
        id: string;
        entityType: string;
        entityId: string;
        method: string;
        createdAt: string;
        clicks: number;
    }>;
}

/**
 * Get share analytics for a specific entity (product, offer, storefront)
 */
export function useEntityShareAnalytics(
    entityType: string,
    entityId: string,
    options?: { enabled?: boolean; fromDate?: Date; toDate?: Date }
) {
    const { enabled = true, fromDate, toDate } = options || {};

    return useQuery({
        queryKey: ['share-analytics', entityType, entityId, fromDate?.toISOString(), toDate?.toISOString()],
        queryFn: async (): Promise<EntityShareAnalytics> => {
            const { data, error } = await supabase.rpc('get_share_analytics', {
                p_entity_type: entityType,
                p_entity_id: entityId,
                p_from_date: fromDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                p_to_date: toDate?.toISOString() || new Date().toISOString(),
            });

            if (error) throw error;

            return {
                ...data,
                entityType,
                entityId,
            };
        },
        enabled: enabled && !!entityId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Get aggregated share analytics for a business (all products, offers, storefront)
 */
export function useBusinessShareAnalytics(
    businessId: string,
    options?: { enabled?: boolean }
) {
    const { enabled = true } = options || {};

    return useQuery({
        queryKey: ['business-share-analytics', businessId],
        queryFn: async (): Promise<BusinessShareAnalytics> => {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            // Get all share events for this business's entities
            const { data: shareEvents, error: eventsError } = await supabase
                .from('share_events')
                .select(`
          id,
          entity_type,
          entity_id,
          share_method,
          created_at,
          share_clicks_unified (id),
          share_conversions (id)
        `)
                .or(`entity_id.eq.${businessId},entity_type.eq.product,entity_type.eq.offer`)
                .gte('created_at', monthAgo.toISOString())
                .order('created_at', { ascending: false });

            if (eventsError) {
                // Fallback: Get storefront shares only
                const { data: storefrontShares, error: storeError } = await supabase
                    .from('share_events')
                    .select(`
            id,
            entity_type,
            entity_id,
            share_method,
            created_at,
            share_clicks_unified (id),
            share_conversions (id)
          `)
                    .eq('entity_type', 'storefront')
                    .eq('entity_id', businessId)
                    .gte('created_at', monthAgo.toISOString())
                    .order('created_at', { ascending: false });

                if (storeError) throw storeError;

                return processShareEvents(storefrontShares || [], now, weekAgo, monthAgo);
            }

            return processShareEvents(shareEvents || [], now, weekAgo, monthAgo);
        },
        enabled: enabled && !!businessId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Process share events into analytics summary
 */
function processShareEvents(
    events: Array<{
        id: string;
        entity_type: string;
        entity_id: string;
        share_method: string;
        created_at: string;
        share_clicks_unified: Array<{ id: string }>;
        share_conversions: Array<{ id: string }>;
    }>,
    now: Date,
    weekAgo: Date,
    monthAgo: Date
): BusinessShareAnalytics {
    const totalShares = events.length;

    const sharesThisWeek = events.filter(e => new Date(e.created_at) >= weekAgo).length;
    const sharesThisMonth = events.filter(e => new Date(e.created_at) >= monthAgo).length;

    const totalClicks = events.reduce((sum, e) => sum + (e.share_clicks_unified?.length || 0), 0);
    const totalConversions = events.reduce((sum, e) => sum + (e.share_conversions?.length || 0), 0);

    const clickThroughRate = totalShares > 0 ? (totalClicks / totalShares) * 100 : 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Method breakdown
    const methodBreakdown: Record<string, number> = {};
    events.forEach(e => {
        methodBreakdown[e.share_method] = (methodBreakdown[e.share_method] || 0) + 1;
    });

    // Daily shares
    const dailyMap: Record<string, number> = {};
    events.forEach(e => {
        const date = new Date(e.created_at).toISOString().split('T')[0];
        dailyMap[date] = (dailyMap[date] || 0) + 1;
    });
    const dailyShares = Object.entries(dailyMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Top shared items
    const itemMap: Record<string, {
        shares: number;
        clicks: number;
        entityType: string;
    }> = {};
    events.forEach(e => {
        const key = `${e.entity_type}:${e.entity_id}`;
        if (!itemMap[key]) {
            itemMap[key] = { shares: 0, clicks: 0, entityType: e.entity_type };
        }
        itemMap[key].shares++;
        itemMap[key].clicks += e.share_clicks_unified?.length || 0;
    });
    const topSharedItems = Object.entries(itemMap)
        .map(([key, data]) => {
            const [entityType, entityId] = key.split(':');
            return {
                entityId,
                entityType,
                title: `${entityType} ${entityId.substring(0, 8)}`, // Placeholder - would need entity lookup
                shares: data.shares,
                clicks: data.clicks,
                ctr: data.shares > 0 ? (data.clicks / data.shares) * 100 : 0,
            };
        })
        .sort((a, b) => b.shares - a.shares)
        .slice(0, 10);

    // Recent shares
    const recentShares = events.slice(0, 20).map(e => ({
        id: e.id,
        entityType: e.entity_type,
        entityId: e.entity_id,
        method: e.share_method,
        createdAt: e.created_at,
        clicks: e.share_clicks_unified?.length || 0,
    }));

    return {
        totalShares,
        sharesThisWeek,
        sharesThisMonth,
        clickThroughRate: Math.round(clickThroughRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        methodBreakdown,
        dailyShares,
        topSharedItems,
        recentShares,
    };
}

export default useEntityShareAnalytics;
