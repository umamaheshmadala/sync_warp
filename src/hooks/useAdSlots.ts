// src/hooks/useAdSlots.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { AdSlotData, Ad, OrganicContent } from '../types/ads';
import { getBusinessUrl } from '../utils/slugUtils';

// Cache key
const AD_SLOTS_KEY = 'adSlots';

// Mock data for demonstration when database is empty
const mockBusinesses = [
  {
    id: 'mock-1',
    title: '☕ Urban Coffee Roasters',
    description: 'Premium artisan coffee in your neighborhood. Rated 4.8/5 by locals.',
    cta_text: 'Discover Coffee',
    cta_url: '/search?category=cafe',
  },
  {
    id: 'mock-2',
    title: '🍰 Artisan Bakery',
    description: 'Fresh baked goods daily. Try our signature croissants!',
    cta_text: 'View Menu',
    cta_url: '/search?category=bakery',
  },
  {
    id: 'mock-3',
    title: '🏋️ FitLife Gym',
    description: 'State-of-the-art fitness center. First month 50% off!',
    cta_text: 'Join Now',
    cta_url: '/search?category=fitness',
  },
  {
    id: 'mock-4',
    title: '📚 Book Haven',
    description: 'Largest collection of books in the city. 20% off this week!',
    cta_text: 'Browse Books',
    cta_url: '/search?category=books',
  },
  {
    id: 'mock-5',
    title: '🍕 Pizza Paradise',
    description: 'Authentic Italian pizza. Buy 2 Get 1 Free every Friday!',
    cta_text: 'Order Now',
    cta_url: '/search?category=restaurant',
  },
  {
    id: 'mock-6',
    title: '💇 Style Studio',
    description: 'Premium salon services. New customer discount available!',
    cta_text: 'Book Appointment',
    cta_url: '/search?category=salon',
  },
];

function createMockOrganicContent(limit: number): OrganicContent[] {
  return mockBusinesses.slice(0, limit).map((business, index) => ({
    id: business.id,
    type: 'business' as const,
    title: business.title,
    description: business.description,
    image_url: undefined,
    cta_text: business.cta_text,
    cta_url: business.cta_url,
    priority: index,
  }));
}

async function fetchOrganicFallbacks(limit: number): Promise<OrganicContent[]> {
  try {
    // Fetch trending businesses or offers as organic content
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, business_name, description, logo_url, cover_image_url')
      .eq('status', 'active')
      .order('average_rating', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!businesses || businesses.length === 0) {
      return createMockOrganicContent(limit);
    }

    return businesses.map((business, index) => ({
      id: business.id,
      type: 'business' as const,
      title: business.business_name,
      description: business.description,
      image_url: business.logo_url || business.cover_image_url,
      cta_text: 'View Business',
      cta_url: getBusinessUrl(business.id, business.business_name),
      priority: index,
    }));
  } catch (error) {
    console.error('Error fetching organic fallbacks:', error);
    // Fallback to mock data for demonstration
    return createMockOrganicContent(limit);
  }
}

async function fetchAdSlotsData(city: string | undefined): Promise<AdSlotData[]> {
  try {
    // Fetch active ads for user's city
    const { data: ads, error } = await supabase
      .from('ads')
      .select('*')
      .eq('type', 'carousel')
      .eq('status', 'active')
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .order('priority', { ascending: false })
      .limit(6);

    if (error) throw error;

    const adSlots: AdSlotData[] = [];
    const totalSlots = 6;

    // Add paid ads first
    (ads || []).forEach((ad, index) => {
      adSlots.push({
        position: index + 1,
        content_type: 'paid_ad',
        ad: ad as Ad,
      });
    });

    // Fill remaining slots with organic content
    if (adSlots.length < totalSlots) {
      const organicContent = await fetchOrganicFallbacks(totalSlots - adSlots.length);
      organicContent.forEach((organic, index) => {
        adSlots.push({
          position: adSlots.length + index + 1,
          content_type: 'organic',
          organic,
        });
      });
    }

    return adSlots;
  } catch (error) {
    console.error('Error fetching ad slots:', error);

    // Fallback: create organic-only slots if ads table doesn't exist yet
    try {
      const organicContent = await fetchOrganicFallbacks(6);
      return organicContent.map((organic, index) => ({
        position: index + 1,
        content_type: 'organic',
        organic,
      }));
    } catch (fallbackError) {
      console.error('Error fetching organic fallbacks:', fallbackError);
      return [];
    }
  }
}

export function useAdSlots() {
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();

  // Use React Query with SWR pattern - shows cached data immediately while revalidating
  const { data: slots = [], isLoading: loading, refetch } = useQuery({
    queryKey: [AD_SLOTS_KEY, profile?.city],
    queryFn: () => fetchAdSlotsData(profile?.city),
    staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - cache retained
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnMount: true, // Refetch on mount if stale
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching
  });

  const trackImpression = async (adId: string) => {
    try {
      await supabase.rpc('track_ad_impression', { ad_id: adId });
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  };

  const trackClick = async (adId: string) => {
    try {
      await supabase.rpc('track_ad_click', { ad_id: adId });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  return {
    slots,
    loading,
    trackImpression,
    trackClick,
    refresh: refetch,
  };
}
