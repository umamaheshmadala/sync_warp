import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { EngagementEvent } from '../types/engagement';

interface UseBusinessEngagementReturn {
    events: EngagementEvent[];
    isLoading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
    hasMore: boolean;
    loadMore: () => Promise<void>;
}

export function useBusinessEngagement(businessId: string, limit = 50): UseBusinessEngagementReturn {
    const [events, setEvents] = useState<EngagementEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const fetchEvents = async (reset = false) => {
        if (!businessId) return;

        try {
            if (reset) {
                setIsLoading(true);
            }

            const currentOffset = reset ? 0 : offset;

            const { data, error } = await supabase
                .rpc('get_business_engagement_log', {
                    p_business_id: businessId,
                    p_limit: limit,
                    p_offset: currentOffset
                });

            if (error) throw error;

            if (data) {
                if (reset) {
                    setEvents(data);
                    setOffset(limit);
                } else {
                    setEvents(prev => [...prev, ...data]);
                    setOffset(prev => prev + limit);
                }

                // If we got fewer items than limit, we reached the end
                if (data.length < limit) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }
            }
        } catch (err) {
            console.error('Error fetching engagement logs:', err);
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents(true);
    }, [businessId]);

    const refresh = async () => {
        await fetchEvents(true);
    };

    const loadMore = async () => {
        if (!isLoading && hasMore) {
            await fetchEvents(false);
        }
    };

    return { events, isLoading, error, refresh, hasMore, loadMore };
}
