// simpleSearchService.ts
// Simplified search service for testing Story 4.4
// This version avoids complex joins and focuses on basic functionality

import { supabase } from '../lib/supabase';
import { calculateDistance } from '../utils/locationUtils';

export interface SimpleSearchQuery {
  q: string;
  limit?: number;
  offset?: number;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
}

export interface SimpleSearchResult {
  coupons: any[];
  businesses: any[];
  totalResults: number;
  searchTime: number;
  hasMore: boolean;
}

class SimpleSearchService {
  /**
   * Enhanced search that works across all text fields
   * Now supports both search queries and browse mode (empty query)
   */
  async search(query: SimpleSearchQuery): Promise<SimpleSearchResult> {
    const startTime = Date.now();

    try {
      console.log('🔍 [simpleSearchService] Starting enhanced search for:', JSON.stringify(query));

      // Search coupons and businesses
      let coupons: any[] = [];
      let businesses: any[] = [];

      const searchTerm = query.q ? query.q.trim() : '';
      const hasSearchTerm = searchTerm.length > 0;

      console.log('🔍 [simpleSearchService] Search mode:', hasSearchTerm ? 'SEARCH' : 'BROWSE', 'term:', searchTerm);

      // Either search with term or browse all (if no term provided)
      if (hasSearchTerm || !hasSearchTerm) { // Always proceed

        // Build coupon query - either search or browse
        let couponQuery = supabase
          .from('business_coupons')
          .select('*')
          .eq('status', 'active')
          .eq('is_public', true)
          .limit(query.limit || 10);

        // Add search criteria if we have a search term
        if (hasSearchTerm) {
          couponQuery = couponQuery.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%`);
          console.log('🔍 [simpleSearchService] Applied search filter for term:', searchTerm);
        } else {
          console.log('🔍 [simpleSearchService] Browse mode - fetching all public active coupons');
        }

        // Add date filter to ensure coupons are still valid
        const now = new Date().toISOString();
        couponQuery = couponQuery.gt('valid_until', now);
        console.log('🔍 [simpleSearchService] Applied date filter - coupons valid after:', now);

        const { data: couponData, error: couponError } = await couponQuery;

        // Now filter by business status and get real location data
        if (couponData && couponData.length > 0) {
          const businessIds = [...new Set(couponData.map(c => c.business_id))];
          console.log('🔍 [simpleSearchService] Unique business IDs from coupons:', businessIds);

          const { data: activeBusinesses, error: businessFilterError } = await supabase
            .from('businesses')
            .select('id, business_name, status, latitude, longitude, address, city, state')
            .in('id', businessIds)
            .eq('status', 'active');

          if (businessFilterError) {
            console.error('❌ [simpleSearchService] Business filter error:', businessFilterError);
          }

          console.log('🔍 [simpleSearchService] Active businesses found:', activeBusinesses?.length || 0);
          if (activeBusinesses) {
            activeBusinesses.forEach(b => {
              console.log(`   - ${b.business_name} (${b.id.slice(0, 8)}...) - ${b.status} - Coords: ${b.latitude}, ${b.longitude}`);
            });
          }

          // Create a business data map for efficient lookup
          const businessMap = new Map();
          activeBusinesses?.forEach(business => {
            businessMap.set(business.id, business);
          });

          const activeBusinessIds = new Set(activeBusinesses?.map(b => b.id) || []);
          const filteredCoupons = couponData.filter(coupon => {
            const isIncluded = activeBusinessIds.has(coupon.business_id);
            if (!isIncluded) {
              console.log(`⚠️ [simpleSearchService] Filtering out coupon "${coupon.title}" - business not active`);
            }
            return isIncluded;
          });

          console.log(`🔍 [simpleSearchService] Filtering: ${couponData.length} → ${filteredCoupons.length} coupons`);

          // Use real business location data
          coupons = filteredCoupons.map((coupon) => {
            const businessData = businessMap.get(coupon.business_id);
            const businessName = businessData?.business_name || 'Unknown Business';
            return {
              ...coupon,
              // Add business_name at top level for easy access
              business_name: businessName,
              // Use real business location data from database
              business: {
                id: coupon.business_id,
                business_name: businessName,
                latitude: businessData?.latitude || null,
                longitude: businessData?.longitude || null,
                address: businessData?.address || null,
                city: businessData?.city || null,
                state: businessData?.state || null,
              }
            };
          });

          // Apply location-based filtering if location is provided
          if (query.location) {
            console.log('🌍 [simpleSearchService] Applying location filter:', query.location);
            const radiusInMeters = query.location.radius * 1000; // Convert km to meters

            coupons = coupons.filter(coupon => {
              if (!coupon.business.latitude || !coupon.business.longitude) {
                console.log(`⚠️ [simpleSearchService] Coupon "${coupon.title}" has no location data - excluding from location search`);
                return false;
              }

              const distance = calculateDistance(
                { latitude: query.location.latitude, longitude: query.location.longitude },
                { latitude: coupon.business.latitude, longitude: coupon.business.longitude }
              );

              const isWithinRadius = distance <= radiusInMeters;
              if (!isWithinRadius) {
                console.log(`📍 [simpleSearchService] Coupon "${coupon.title}" is ${(distance / 1000).toFixed(1)}km away - outside ${query.location.radius}km radius`);
              } else {
                console.log(`📍 [simpleSearchService] Coupon "${coupon.title}" is ${(distance / 1000).toFixed(1)}km away - within range`);
              }

              return isWithinRadius;
            });

            console.log(`🌍 [simpleSearchService] Location filtering: ${filteredCoupons.length} → ${coupons.length} coupons within ${query.location.radius}km`);
          }
        } else {
          coupons = couponData || [];
        }

        if (couponError) {
          console.error('❌ [simpleSearchService] Coupon search error:', couponError);
          coupons = [];
        } else {
          console.log('✓ [simpleSearchService] Initial coupon query returned:', couponData?.length || 0);
          if (couponData && couponData.length > 0) {
            console.log('✓ [simpleSearchService] Initial coupon details:');
            couponData.forEach((coupon, index) => {
              console.log(`   ${index + 1}. "${coupon.title}" (${coupon.id.slice(0, 8)}...) - Business: ${coupon.business_id.slice(0, 8)}...`);
            });
          }
          // Don't set coupons here - it will be set after business filtering
        }

        // Build business query - prioritize category matching for coupon terms
        let businessQuery = supabase
          .from('businesses')
          .select('*')
          .eq('status', 'active')
          .limit(query.limit || 10);

        // Add search criteria if we have a search term
        if (hasSearchTerm) {
          // Enhanced search that includes coupon-term to business-category matching
          const foodRelatedTerms = ['pizza', 'burger', 'food', 'restaurant', 'cafe', 'coffee', 'dining', 'meal', 'lunch', 'dinner', 'breakfast'];
          const shoppingTerms = ['discount', 'sale', 'shop', 'store', 'buy', 'purchase', 'clothing', 'fashion'];
          const serviceTerms = ['service', 'repair', 'maintenance', 'cleaning', 'beauty', 'salon', 'spa'];

          let categoryFilter = '';
          if (foodRelatedTerms.some(term => searchTerm.toLowerCase().includes(term))) {
            categoryFilter = "or(business_type.ilike.%restaurant%,business_type.ilike.%food%,business_type.ilike.%cafe%,business_type.ilike.%dining%)";
          } else if (shoppingTerms.some(term => searchTerm.toLowerCase().includes(term))) {
            categoryFilter = "or(business_type.ilike.%retail%,business_type.ilike.%shop%,business_type.ilike.%store%)";
          } else if (serviceTerms.some(term => searchTerm.toLowerCase().includes(term))) {
            categoryFilter = "or(business_type.ilike.%service%,business_type.ilike.%beauty%,business_type.ilike.%salon%)";
          }

          if (categoryFilter) {
            // First try category matching
            businessQuery = businessQuery.or(`business_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,${categoryFilter}`);
          } else {
            // Standard text search
            businessQuery = businessQuery.or(`business_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,business_type.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
          }
          console.log('🔍 [simpleSearchService] Applied enhanced business search filter for term:', searchTerm);
        } else {
          console.log('🔍 [simpleSearchService] Browse mode - fetching all active businesses');
        }

        const { data: businessData, error: businessError } = await businessQuery;

        if (businessError) {
          console.error('❌ [simpleSearchService] Business search error:', businessError);
        } else {
          // Use real coordinates and calculate active coupon counts
          businesses = await Promise.all((businessData || []).map(async (business) => {
            // Get active coupon count for this business
            const { count: activeCouponsCount } = await supabase
              .from('business_coupons')
              .select('id', { count: 'exact', head: true })
              .eq('business_id', business.id)
              .eq('status', 'active')
              .gt('valid_until', new Date().toISOString());

            return {
              ...business,
              // Use real coordinates from database (already included in business data)
              activeCouponsCount: activeCouponsCount || 0,
            };
          }));
          console.log('\u2713 [simpleSearchService] Found businesses with real coordinates:', businesses.length);
          businesses.forEach(b => {
            console.log(`   - ${b.business_name} (${b.activeCouponsCount} coupons) - Coords: ${b.latitude}, ${b.longitude}`);
          });

          // Apply location-based filtering to businesses if location is provided
          if (query.location) {
            console.log('\ud83c\udf0d [simpleSearchService] Applying location filter to businesses:', query.location);
            const radiusInMeters = query.location.radius * 1000; // Convert km to meters
            const originalBusinessCount = businesses.length;

            businesses = businesses.filter(business => {
              if (!business.latitude || !business.longitude) {
                console.log(`\u26a0\ufe0f [simpleSearchService] Business "${business.business_name}" has no location data - excluding from location search`);
                return false;
              }

              const distance = calculateDistance(
                { latitude: query.location.latitude, longitude: query.location.longitude },
                { latitude: business.latitude, longitude: business.longitude }
              );

              const isWithinRadius = distance <= radiusInMeters;
              if (!isWithinRadius) {
                console.log(`\ud83d\udccd [simpleSearchService] Business "${business.business_name}" is ${(distance / 1000).toFixed(1)}km away - outside ${query.location.radius}km radius`);
              } else {
                console.log(`\ud83d\udccd [simpleSearchService] Business "${business.business_name}" is ${(distance / 1000).toFixed(1)}km away - within range`);
              }

              return isWithinRadius;
            });

            console.log(`\ud83c\udf0d [simpleSearchService] Location filtering: ${originalBusinessCount} \u2192 ${businesses.length} businesses within ${query.location.radius}km`);
          }
        }
      }

      const result: SimpleSearchResult = {
        coupons: coupons,
        businesses: businesses,
        totalResults: coupons.length + businesses.length,
        searchTime: Date.now() - startTime,
        hasMore: false
      };

      console.log('✅ [simpleSearchService] Search completed:', {
        query: query.q,
        couponsFound: result.coupons.length,
        businessesFound: result.businesses.length,
        totalResults: result.totalResults,
        searchTime: result.searchTime + 'ms'
      });
      return result;

    } catch (error) {
      console.error('Simple search failed:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Get enhanced search suggestions across all fields
   */
  async getSuggestions(term: string): Promise<{ text: string, type: 'business' | 'coupon' }[]> {
    if (!term || term.length < 2) return [];

    try {
      console.log('🔍 [simpleSearchService] Getting suggestions for:', term);

      // Get coupon suggestions from multiple fields
      const { data: couponSuggestions } = await supabase
        .from('business_coupons')
        .select('title, description, type')
        .or(`title.ilike.%${term}%,description.ilike.%${term}%,type.ilike.%${term}%`)
        .eq('status', 'active')
        .eq('is_public', true)
        .limit(3);

      // Get business suggestions from multiple fields
      const { data: businessSuggestions } = await supabase
        .from('businesses')
        .select('business_name, business_type, city')
        .or(`business_name.ilike.%${term}%,business_type.ilike.%${term}%,city.ilike.%${term}%`)
        .eq('status', 'active')
        .limit(3);

      // Add unique suggestions with proper type
      const suggestionMap = new Map<string, { text: string, type: 'business' | 'coupon' }>();

      // Add coupon titles and relevant terms first
      if (couponSuggestions) {
        couponSuggestions.forEach(coupon => {
          if (coupon.title.toLowerCase().includes(term.toLowerCase())) {
            suggestionMap.set(coupon.title, { text: coupon.title, type: 'coupon' });
          }
        });
      }

      // Add business names and types
      if (businessSuggestions) {
        businessSuggestions.forEach(business => {
          if (business.business_name.toLowerCase().includes(term.toLowerCase())) {
            suggestionMap.set(business.business_name, { text: business.business_name, type: 'business' });
          }
          if (business.city && business.city.toLowerCase().includes(term.toLowerCase())) {
            suggestionMap.set(business.city, { text: business.city, type: 'business' });
          }
        });
      }

      // Return max 5 suggestions
      const uniqueSuggestions = Array.from(suggestionMap.values());
      console.log('✅ [simpleSearchService] Generated suggestions:', uniqueSuggestions);

      return uniqueSuggestions.slice(0, 5);

    } catch (error) {
      console.error('❌ [simpleSearchService] Suggestions error:', error);
      return [];
    }
  }

  /**
   * Clear any caches (placeholder)
   */
  clearCache(): void {
    console.log('Cache cleared');
  }
}

// Export singleton
export const simpleSearchService = new SimpleSearchService();
export default simpleSearchService;