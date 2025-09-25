// simpleSearchService.ts
// Simplified search service for testing Story 4.4
// This version avoids complex joins and focuses on basic functionality

import { supabase } from '../lib/supabase';

export interface SimpleSearchQuery {
  q: string;
  limit?: number;
  offset?: number;
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
          
        // Now filter by business status using a separate query
        if (couponData && couponData.length > 0) {
          const businessIds = [...new Set(couponData.map(c => c.business_id))];
          console.log('🔍 [simpleSearchService] Unique business IDs from coupons:', businessIds);
          
          const { data: activeBusinesses, error: businessFilterError } = await supabase
            .from('businesses')
            .select('id, business_name, status')
            .in('id', businessIds)
            .eq('status', 'active');
            
          if (businessFilterError) {
            console.error('❌ [simpleSearchService] Business filter error:', businessFilterError);
          }
            
          console.log('🔍 [simpleSearchService] Active businesses found:', activeBusinesses?.length || 0);
          if (activeBusinesses) {
            activeBusinesses.forEach(b => {
              console.log(`   - ${b.business_name} (${b.id.slice(0, 8)}...) - ${b.status}`);
            });
          }
            
          const activeBusinessIds = new Set(activeBusinesses?.map(b => b.id) || []);
          const filteredCoupons = couponData.filter(coupon => {
            const isIncluded = activeBusinessIds.has(coupon.business_id);
            if (!isIncluded) {
              console.log(`⚠️ [simpleSearchService] Filtering out coupon "${coupon.title}" - business not active`);
            }
            return isIncluded;
          });
          
          console.log(`🔍 [simpleSearchService] Filtering: ${couponData.length} → ${filteredCoupons.length} coupons`);
          
          // Don't modify the original array, assign the filtered array
          coupons = filteredCoupons;
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

        // Build business query - either search or browse
        let businessQuery = supabase
          .from('businesses')
          .select('*')
          .eq('status', 'active')
          .limit(query.limit || 10);
          
        // Add search criteria if we have a search term
        if (hasSearchTerm) {
          businessQuery = businessQuery.or(`business_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,business_type.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
          console.log('🔍 [simpleSearchService] Applied business search filter for term:', searchTerm);
        } else {
          console.log('🔍 [simpleSearchService] Browse mode - fetching all active businesses');
        }
        
        const { data: businessData, error: businessError } = await businessQuery;

        if (businessError) {
          console.error('❌ [simpleSearchService] Business search error:', businessError);
        } else {
          businesses = businessData || [];
          console.log('✓ [simpleSearchService] Found businesses:', businesses.length, businesses.map(b => b.business_name));
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
  async getSuggestions(term: string): Promise<string[]> {
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

      const suggestions = [];
      
      // Add coupon titles and relevant terms
      if (couponSuggestions) {
        couponSuggestions.forEach(coupon => {
          if (coupon.title.toLowerCase().includes(term.toLowerCase())) {
            suggestions.push(coupon.title);
          }
          // Add coupon type as suggestion (e.g., "percentage", "fixed_amount")
          if (coupon.type && coupon.type.toLowerCase().includes(term.toLowerCase())) {
            suggestions.push(coupon.type.replace('_', ' '));
          }
        });
      }
      
      // Add business names and types
      if (businessSuggestions) {
        businessSuggestions.forEach(business => {
          if (business.business_name.toLowerCase().includes(term.toLowerCase())) {
            suggestions.push(business.business_name);
          }
          if (business.business_type && business.business_type.toLowerCase().includes(term.toLowerCase())) {
            suggestions.push(business.business_type);
          }
          if (business.city && business.city.toLowerCase().includes(term.toLowerCase())) {
            suggestions.push(business.city);
          }
        });
      }

      // Remove duplicates and return max 5 suggestions
      const uniqueSuggestions = [...new Set(suggestions)];
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