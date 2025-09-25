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
   * Simple search that works without complex joins
   */
  async search(query: SimpleSearchQuery): Promise<SimpleSearchResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Starting simple search for:', query.q);
      
      // Search coupons first (simpler query)
      let coupons: any[] = [];
      let businesses: any[] = [];
      
      if (query.q && query.q.trim()) {
        // Search in coupons table (include both active and draft coupons)
        const { data: couponData, error: couponError } = await supabase
          .from('business_coupons')
          .select('*')
          .or(`title.ilike.%${query.q}%,description.ilike.%${query.q}%`)
          .in('status', ['active', 'draft'])
          .limit(query.limit || 10);

        if (couponError) {
          console.error('Coupon search error:', couponError);
        } else {
          coupons = couponData || [];
          console.log('✓ Found coupons:', coupons.length);
        }

        // Search in businesses table
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .or(`business_name.ilike.%${query.q}%,description.ilike.%${query.q}%`)
          .limit(query.limit || 10);

        if (businessError) {
          console.error('Business search error:', businessError);
        } else {
          businesses = businessData || [];
          console.log('✓ Found businesses:', businesses.length);
        }
      }

      const result: SimpleSearchResult = {
        coupons: coupons,
        businesses: businesses,
        totalResults: coupons.length + businesses.length,
        searchTime: Date.now() - startTime,
        hasMore: false
      };

      console.log('✅ Simple search completed:', result);
      return result;

    } catch (error) {
      console.error('Simple search failed:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(term: string): Promise<string[]> {
    if (!term || term.length < 2) return [];

    try {
      // Get coupon title suggestions (include both active and draft)
      const { data: couponSuggestions } = await supabase
        .from('business_coupons')
        .select('title')
        .ilike('title', `%${term}%`)
        .in('status', ['active', 'draft'])
        .limit(3);

      // Get business name suggestions  
      const { data: businessSuggestions } = await supabase
        .from('businesses')
        .select('business_name')
        .ilike('business_name', `%${term}%`)
        .limit(3);

      const suggestions = [
        ...(couponSuggestions?.map(c => c.title) || []),
        ...(businessSuggestions?.map(b => b.business_name) || [])
      ];

      return suggestions.slice(0, 5); // Return max 5 suggestions

    } catch (error) {
      console.error('Suggestions error:', error);
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