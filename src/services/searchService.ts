// searchService.ts
// Comprehensive search service for coupons, businesses, and deals
// Handles filtering, sorting, pagination, and search analytics

import { supabase } from '../lib/supabase';
import { 
  Coupon,
  CouponFilters,
  CouponSortBy,
  CouponStatus,
  CouponType,
  DiscountType,
  TargetAudience
} from '../types/coupon';

// Search-specific types
export interface SearchQuery {
  q: string; // Main search term
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in km
  };
  filters: SearchFilters;
  sort: SearchSort;
  pagination: SearchPagination;
}

export interface SearchFilters {
  // Business & Location
  businessName?: string;
  location?: string;
  distance?: number; // in km
  
  // Coupon Type & Value
  couponTypes?: CouponType[];
  discountTypes?: DiscountType[];
  minDiscountValue?: number;
  maxDiscountValue?: number;
  minPurchaseAmount?: number;
  maxPurchaseAmount?: number;
  
  // Availability & Status
  status?: CouponStatus[];
  availableOnly?: boolean; // Has remaining uses
  validOnly?: boolean; // Not expired
  
  // Time & Date
  validUntil?: {
    start?: string;
    end?: string;
  };
  createdAfter?: string;
  
  // Target Audience
  targetAudience?: TargetAudience[];
  isPublic?: boolean;
  
  // Categories & Tags
  categories?: string[];
  tags?: string[];
  
  // User Context
  excludeCollected?: boolean; // Exclude coupons user already has
  excludeUsed?: boolean; // Exclude coupons user already used
}

export interface SearchSort {
  field: SearchSortField;
  order: 'asc' | 'desc';
}

export type SearchSortField = 
  | 'relevance'
  | 'discount_value'
  | 'created_at'
  | 'valid_until'
  | 'usage_count'
  | 'collection_count'
  | 'distance'
  | 'business_name';

export interface SearchPagination {
  page: number;
  limit: number;
}

export interface SearchResult {
  coupons: SearchCoupon[];
  businesses: SearchBusiness[];
  totalCoupons: number;
  totalBusinesses: number;
  facets: SearchFacets;
  suggestions: SearchSuggestion[];
  searchTime: number;
  hasMore: boolean;
}

export interface SearchCoupon extends Coupon {
  // Search-specific extensions
  relevanceScore: number;
  distance?: number; // distance from user
  business: {
    id: string;
    business_name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    business_type?: string;
    rating?: number;
  };
  isCollected?: boolean; // by current user
  isUsed?: boolean; // by current user
  remainingUses?: number;
  highlightedTitle?: string; // with search terms highlighted
  highlightedDescription?: string;
}

export interface SearchBusiness {
  id: string;
  business_name: string;
  business_type?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  activeCouponsCount: number;
  distance?: number;
  relevanceScore: number;
  highlightedName?: string;
}

export interface SearchFacets {
  couponTypes: { type: CouponType; count: number }[];
  discountRanges: { range: string; count: number }[];
  businessTypes: { type: string; count: number }[];
  locations: { location: string; count: number }[];
  validityRanges: { range: string; count: number }[];
}

export interface SearchSuggestion {
  text: string;
  type: 'coupon' | 'business' | 'category' | 'location';
  count: number;
}

// Cache management for search
interface SearchCacheEntry {
  data: SearchResult;
  timestamp: number;
  ttl: number;
}

class SearchService {
  private cache = new Map<string, SearchCacheEntry>();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly SEARCH_ANALYTICS_ENABLED = true;

  /**
   * Main search method - searches both coupons and businesses
   */
  async search(query: SearchQuery, userId?: string): Promise<SearchResult> {
    const startTime = Date.now();
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(query, userId);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached, searchTime: Date.now() - startTime };
    }

    try {
      // Perform parallel searches
      const [couponsResult, businessesResult, facetsResult, suggestionsResult] = await Promise.all([
        this.searchCoupons(query, userId),
        this.searchBusinesses(query, userId),
        this.generateFacets(query),
        this.generateSuggestions(query.q)
      ]);

      const result: SearchResult = {
        coupons: couponsResult.coupons,
        businesses: businessesResult.businesses,
        totalCoupons: couponsResult.total,
        totalBusinesses: businessesResult.total,
        facets: facetsResult,
        suggestions: suggestionsResult,
        searchTime: Date.now() - startTime,
        hasMore: couponsResult.hasMore || businessesResult.hasMore
      };

      // Cache the result
      this.setCache(cacheKey, result);

      // Track search analytics
      if (this.SEARCH_ANALYTICS_ENABLED) {
        this.trackSearchAnalytics(query, result, userId);
      }

      return result;
    } catch (error) {
      console.error('Search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Search coupons with advanced filtering
   */
  private async searchCoupons(
    query: SearchQuery, 
    userId?: string
  ): Promise<{ coupons: SearchCoupon[]; total: number; hasMore: boolean }> {
    let supabaseQuery = supabase
      .from('business_coupons')
      .select(`
        *,
        businesses!inner(
          id, business_name, business_type, description, address, 
          latitude, longitude, rating
        )
      `);

    // Apply text search
    if (query.q) {
      const searchTerm = query.q.trim();
      supabaseQuery = supabaseQuery.or(
        `title.ilike.%${searchTerm}%,` +
        `description.ilike.%${searchTerm}%,` +
        `businesses.business_name.ilike.%${searchTerm}%,` +
        `businesses.description.ilike.%${searchTerm}%`
      );
    }

    // Apply filters
    supabaseQuery = this.applyCouponFilters(supabaseQuery, query.filters);

    // Apply location filtering if provided
    if (query.location) {
      supabaseQuery = this.applyLocationFilter(supabaseQuery, query.location);
    }

    // Count total results
    const { count: totalCount } = await supabaseQuery
      .select('*', { count: 'exact', head: true });

    // Apply sorting
    supabaseQuery = this.applyCouponSort(supabaseQuery, query.sort);

    // Apply pagination
    const offset = (query.pagination.page - 1) * query.pagination.limit;
    supabaseQuery = supabaseQuery
      .range(offset, offset + query.pagination.limit - 1);

    const { data: couponsData, error } = await supabaseQuery;

    if (error) throw error;

    // Enhance results with search-specific data
    const coupons = await this.enhanceCouponResults(
      couponsData || [], 
      query, 
      userId
    );

    return {
      coupons,
      total: totalCount || 0,
      hasMore: (offset + query.pagination.limit) < (totalCount || 0)
    };
  }

  /**
   * Search businesses
   */
  private async searchBusinesses(
    query: SearchQuery, 
    userId?: string
  ): Promise<{ businesses: SearchBusiness[]; total: number; hasMore: boolean }> {
    let supabaseQuery = supabase
      .from('businesses')
      .select(`
        *,
        business_coupons!inner(status, valid_until)
      `);

    // Apply text search
    if (query.q) {
      const searchTerm = query.q.trim();
      supabaseQuery = supabaseQuery.or(
        `business_name.ilike.%${searchTerm}%,` +
        `description.ilike.%${searchTerm}%,` +
        `business_type.ilike.%${searchTerm}%,` +
        `address.ilike.%${searchTerm}%`
      );
    }

    // Only businesses with active coupons
    supabaseQuery = supabaseQuery
      .eq('business_coupons.status', 'active')
      .gte('business_coupons.valid_until', new Date().toISOString());

    // Apply location filtering
    if (query.location) {
      supabaseQuery = this.applyLocationFilter(supabaseQuery, query.location);
    }

    // Count and paginate
    const { count: totalCount } = await supabaseQuery
      .select('*', { count: 'exact', head: true });

    const offset = (query.pagination.page - 1) * query.pagination.limit;
    supabaseQuery = supabaseQuery
      .range(offset, offset + query.pagination.limit - 1);

    const { data: businessData, error } = await supabaseQuery;

    if (error) throw error;

    // Enhance results
    const businesses = await this.enhanceBusinessResults(
      businessData || [], 
      query
    );

    return {
      businesses,
      total: totalCount || 0,
      hasMore: (offset + query.pagination.limit) < (totalCount || 0)
    };
  }

  /**
   * Apply coupon-specific filters to the query
   */
  private applyCouponFilters(query: any, filters: SearchFilters): any {
    // Status filter
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    } else if (filters.validOnly) {
      query = query.eq('status', 'active');
    }

    // Coupon type filters
    if (filters.couponTypes && filters.couponTypes.length > 0) {
      query = query.in('type', filters.couponTypes);
    }

    // Discount type filters
    if (filters.discountTypes && filters.discountTypes.length > 0) {
      query = query.in('discount_type', filters.discountTypes);
    }

    // Discount value range
    if (filters.minDiscountValue !== undefined) {
      query = query.gte('discount_value', filters.minDiscountValue);
    }
    if (filters.maxDiscountValue !== undefined) {
      query = query.lte('discount_value', filters.maxDiscountValue);
    }

    // Purchase amount range
    if (filters.minPurchaseAmount !== undefined) {
      query = query.gte('min_purchase_amount', filters.minPurchaseAmount);
    }
    if (filters.maxPurchaseAmount !== undefined) {
      query = query.lte('min_purchase_amount', filters.maxPurchaseAmount);
    }

    // Validity range
    if (filters.validUntil?.start) {
      query = query.gte('valid_until', filters.validUntil.start);
    }
    if (filters.validUntil?.end) {
      query = query.lte('valid_until', filters.validUntil.end);
    }

    // Valid only (not expired)
    if (filters.validOnly) {
      query = query.gte('valid_until', new Date().toISOString());
    }

    // Public only
    if (filters.isPublic !== undefined) {
      query = query.eq('is_public', filters.isPublic);
    }

    // Target audience
    if (filters.targetAudience && filters.targetAudience.length > 0) {
      query = query.in('target_audience', filters.targetAudience);
    }

    // Business name filter
    if (filters.businessName) {
      query = query.ilike('businesses.business_name', `%${filters.businessName}%`);
    }

    return query;
  }

  /**
   * Apply location-based filtering
   */
  private applyLocationFilter(query: any, location: SearchQuery['location']): any {
    if (!location) return query;

    // Using PostGIS extensions for distance calculations
    // This assumes we have latitude and longitude columns on businesses
    const { latitude, longitude, radius } = location;
    
    return query.rpc('businesses_within_radius', {
      lat: latitude,
      lng: longitude,
      radius_km: radius
    });
  }

  /**
   * Apply sorting to coupon query
   */
  private applyCouponSort(query: any, sort: SearchSort): any {
    switch (sort.field) {
      case 'discount_value':
        return query.order('discount_value', { ascending: sort.order === 'asc' });
      case 'created_at':
        return query.order('created_at', { ascending: sort.order === 'asc' });
      case 'valid_until':
        return query.order('valid_until', { ascending: sort.order === 'asc' });
      case 'usage_count':
        return query.order('usage_count', { ascending: sort.order === 'asc' });
      case 'collection_count':
        return query.order('collection_count', { ascending: sort.order === 'asc' });
      case 'business_name':
        return query.order('businesses(business_name)', { ascending: sort.order === 'asc' });
      case 'relevance':
      default:
        // For relevance, we'll use a combination of factors
        return query
          .order('collection_count', { ascending: false })
          .order('created_at', { ascending: false });
    }
  }

  /**
   * Enhance coupon results with search-specific data
   */
  private async enhanceCouponResults(
    coupons: any[], 
    query: SearchQuery, 
    userId?: string
  ): Promise<SearchCoupon[]> {
    const enhancedCoupons: SearchCoupon[] = [];

    for (const coupon of coupons) {
      let isCollected = false;
      let isUsed = false;

      // Check if user has collected/used this coupon
      if (userId) {
        const { data: collection } = await supabase
          .from('user_coupon_collections')
          .select('status, times_used')
          .eq('user_id', userId)
          .eq('coupon_id', coupon.id)
          .maybeSingle();

        isCollected = !!collection;
        isUsed = collection && collection.times_used > 0;
      }

      // Calculate remaining uses
      const remainingUses = coupon.total_limit 
        ? Math.max(0, coupon.total_limit - coupon.usage_count)
        : null;

      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(coupon, query);

      // Highlight search terms in title and description
      const { highlightedTitle, highlightedDescription } = this.highlightSearchTerms(
        coupon.title,
        coupon.description,
        query.q
      );

      enhancedCoupons.push({
        ...coupon,
        business: coupon.businesses,
        relevanceScore,
        isCollected,
        isUsed,
        remainingUses,
        highlightedTitle,
        highlightedDescription,
        distance: undefined // Would be calculated if location provided
      });
    }

    return enhancedCoupons;
  }

  /**
   * Enhance business results with search-specific data
   */
  private async enhanceBusinessResults(
    businesses: any[], 
    query: SearchQuery
  ): Promise<SearchBusiness[]> {
    return businesses.map(business => {
      // Count active coupons for this business
      const activeCoupons = business.business_coupons?.filter(
        (c: any) => c.status === 'active' && new Date(c.valid_until) > new Date()
      ) || [];

      const relevanceScore = this.calculateBusinessRelevanceScore(business, query);

      const { highlightedName } = this.highlightSearchTerms(
        business.business_name,
        '',
        query.q
      );

      return {
        id: business.id,
        business_name: business.business_name,
        business_type: business.business_type,
        description: business.description,
        address: business.address,
        latitude: business.latitude,
        longitude: business.longitude,
        rating: business.rating,
        activeCouponsCount: activeCoupons.length,
        relevanceScore,
        highlightedName,
        distance: undefined // Would be calculated if location provided
      };
    });
  }

  /**
   * Generate search facets for filtering
   */
  private async generateFacets(query: SearchQuery): Promise<SearchFacets> {
    // This would involve complex aggregation queries
    // For now, returning empty facets - would be implemented based on specific requirements
    return {
      couponTypes: [],
      discountRanges: [],
      businessTypes: [],
      locations: [],
      validityRanges: []
    };
  }

  /**
   * Generate search suggestions
   */
  private async generateSuggestions(searchTerm: string): Promise<SearchSuggestion[]> {
    if (!searchTerm || searchTerm.length < 2) return [];

    try {
      // Get popular search terms (this would be from a search_analytics table)
      const suggestions: SearchSuggestion[] = [];

      // Add coupon title suggestions
      const { data: couponSuggestions } = await supabase
        .from('business_coupons')
        .select('title')
        .ilike('title', `%${searchTerm}%`)
        .eq('status', 'active')
        .limit(5);

      couponSuggestions?.forEach(coupon => {
        suggestions.push({
          text: coupon.title,
          type: 'coupon',
          count: 1
        });
      });

      // Add business name suggestions
      const { data: businessSuggestions } = await supabase
        .from('businesses')
        .select('business_name')
        .ilike('business_name', `%${searchTerm}%`)
        .limit(5);

      businessSuggestions?.forEach(business => {
        suggestions.push({
          text: business.business_name,
          type: 'business',
          count: 1
        });
      });

      return suggestions;
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Calculate relevance score for a coupon
   */
  private calculateRelevanceScore(coupon: any, query: SearchQuery): number {
    let score = 0;

    // Text relevance
    if (query.q) {
      const searchTerm = query.q.toLowerCase();
      const title = coupon.title.toLowerCase();
      const description = coupon.description.toLowerCase();

      if (title.includes(searchTerm)) score += 10;
      if (description.includes(searchTerm)) score += 5;
      if (coupon.businesses?.business_name?.toLowerCase().includes(searchTerm)) score += 7;
    }

    // Popularity factors
    score += coupon.collection_count * 0.1;
    score += coupon.usage_count * 0.2;

    // Recency factor
    const daysOld = Math.floor(
      (Date.now() - new Date(coupon.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    score += Math.max(0, 30 - daysOld) * 0.1;

    // Discount value factor
    if (coupon.discount_value) {
      score += Math.min(coupon.discount_value, 100) * 0.05;
    }

    return Math.round(score * 100) / 100;
  }

  /**
   * Calculate relevance score for a business
   */
  private calculateBusinessRelevanceScore(business: any, query: SearchQuery): number {
    let score = 0;

    // Text relevance
    if (query.q) {
      const searchTerm = query.q.toLowerCase();
      const name = business.business_name.toLowerCase();
      const description = (business.description || '').toLowerCase();

      if (name.includes(searchTerm)) score += 10;
      if (description.includes(searchTerm)) score += 5;
    }

    // Active coupons count
    const activeCoupons = business.business_coupons?.length || 0;
    score += activeCoupons * 2;

    // Rating factor
    if (business.rating) {
      score += business.rating * 2;
    }

    return Math.round(score * 100) / 100;
  }

  /**
   * Highlight search terms in text
   */
  private highlightSearchTerms(
    title: string, 
    description: string, 
    searchTerm?: string
  ): { highlightedTitle?: string; highlightedDescription?: string } {
    if (!searchTerm) {
      return { highlightedTitle: title, highlightedDescription: description };
    }

    const regex = new RegExp(`(${searchTerm})`, 'gi');
    
    return {
      highlightedTitle: title.replace(regex, '<mark>$1</mark>'),
      highlightedDescription: description.replace(regex, '<mark>$1</mark>')
    };
  }

  /**
   * Track search analytics
   */
  private async trackSearchAnalytics(
    query: SearchQuery, 
    result: SearchResult, 
    userId?: string
  ): Promise<void> {
    try {
      await supabase.from('search_analytics').insert([{
        user_id: userId,
        search_query: query.q,
        filters: JSON.stringify(query.filters),
        results_count: result.totalCoupons + result.totalBusinesses,
        search_time_ms: result.searchTime,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error tracking search analytics:', error);
    }
  }

  /**
   * Cache management
   */
  private generateCacheKey(query: SearchQuery, userId?: string): string {
    return `search_${JSON.stringify(query)}_${userId || 'anonymous'}`;
  }

  private getFromCache(key: string): SearchResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache(key: string, data: SearchResult): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.DEFAULT_CACHE_TTL
    });
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get popular search terms
   */
  async getPopularSearchTerms(limit: number = 10): Promise<string[]> {
    try {
      const { data } = await supabase
        .from('search_analytics')
        .select('search_query')
        .not('search_query', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(limit * 3); // Get more to dedupe

      if (!data) return [];

      // Count occurrences and return top terms
      const termCounts = new Map<string, number>();
      data.forEach(entry => {
        if (entry.search_query && entry.search_query.length > 1) {
          const term = entry.search_query.toLowerCase();
          termCounts.set(term, (termCounts.get(term) || 0) + 1);
        }
      });

      return Array.from(termCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([term]) => term);
    } catch (error) {
      console.error('Error getting popular search terms:', error);
      return [];
    }
  }
}

// Export singleton instance
export const searchService = new SearchService();
export default searchService;