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
  city?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  review_count?: number;
  follower_count?: number;
  logo_url?: string;
  cover_image_url?: string;
  activeCouponsCount: number;
  distance?: number;
  relevanceScore: number;
  highlightedName?: string;
  recommendation_badge?: 'recommended' | 'highly_recommended' | 'very_highly_recommended' | null;
  recommendation_percentage?: number;
  approved_review_count?: number;
  claim_status?: string;
  activeOffersCount?: number;
  phone_verified?: boolean;
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
  id?: string;
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
        businesses(
          id, business_name, business_type, description, address, 
          latitude, longitude
        )
      `, { count: 'exact' });

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

    // Count handled in main query execution

    // Apply sorting
    supabaseQuery = this.applyCouponSort(supabaseQuery, query.sort);

    // Apply pagination
    const offset = (query.pagination.page - 1) * query.pagination.limit;
    supabaseQuery = supabaseQuery
      .range(offset, offset + query.pagination.limit - 1);

    const { data: couponsData, count: totalCount, error } = await supabaseQuery;

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
        business_coupons(status, valid_until)
      `, { count: 'exact' });

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

    // Filter businesses that have active coupons (we'll filter this in post-processing)
    // Note: We can't directly filter by related table fields in this way
    // Instead, we'll filter the results after fetching

    // Apply location filtering
    if (query.location) {
      supabaseQuery = this.applyLocationFilter(supabaseQuery, query.location);
    }

    // Count handled in main query execution

    const offset = (query.pagination.page - 1) * query.pagination.limit;
    supabaseQuery = supabaseQuery
      .range(offset, offset + query.pagination.limit - 1);

    const { data: businessData, count: totalCount, error } = await supabaseQuery;

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
   * Apply location-based filtering using nearby_businesses function
   */
  private applyLocationFilter(query: any, location: SearchQuery['location']): any {
    if (!location) return query;

    // Use the nearby_businesses function for precise distance calculation
    const { latitude, longitude, radius } = location;

    return query.rpc('nearby_businesses', {
      lat: latitude,
      lng: longitude,
      radius_km: radius,
      result_limit: 100 // Adjust based on needs
    });
  }

  /**
   * Get nearby businesses directly using the database function
   */
  async getNearbyBusinesses(
    latitude: number,
    longitude: number,
    radius: number = 10,
    limit: number = 20
  ) {
    try {
      const { data, error } = await supabase.rpc('nearby_businesses', {
        lat: latitude,
        lng: longitude,
        radius_km: radius,
        result_limit: limit
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching nearby businesses:', error);
      return [];
    }
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

      // Debug: Log business data structure
      console.log('🔍 [SearchService] Enhancing coupon:', {
        couponId: coupon.id,
        couponTitle: coupon.title,
        businesses_field: coupon.businesses,
        businesses_type: typeof coupon.businesses,
        businesses_isArray: Array.isArray(coupon.businesses)
      });

      // Extract business - handle both object and potential array formats
      const businessData = Array.isArray(coupon.businesses)
        ? coupon.businesses[0]
        : coupon.businesses;

      enhancedCoupons.push({
        ...coupon,
        business: businessData,
        business_name: businessData?.business_name, // Add direct field as fallback
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
   * Get live follower count for a business
   */
  private async getBusinessFollowerCount(businessId: string): Promise<number> {
    try {
      const { count } = await supabase
        .from('business_followers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('is_active', true);
      return count || 0;
    } catch (error) {
      console.error('Error fetching follower count:', error);
      return 0;
    }
  }

  /**
   * Get active offers count for a business from the 'offers' table
   */
  private async getBusinessActiveOffersCount(businessId: string): Promise<number> {
    try {
      const now = new Date().toISOString();
      console.log('🔍 [SearchService] Fetching active offers for business:', businessId);

      // Note: offers table uses valid_from/valid_until columns and status field
      const { count, error } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'active')
        .lte('valid_from', now)
        .gte('valid_until', now);

      if (error) {
        console.error('❌ [SearchService] Error fetching active offers:', error);
        throw error;
      }

      console.log('✅ [SearchService] Active offers count for', businessId, ':', count);
      return count || 0;
    } catch (error) {
      console.error('Error fetching active offers count:', error);
      return 0;
    }
  }

  /**
   * Guidance: activeOffersCount is from the new 'offers' table.
   * activeCouponsCount is from the old 'business_coupons' table.
   */

  /**
   * Enhance business results with search-specific data
   */
  private async enhanceBusinessResults(
    businesses: any[],
    query: SearchQuery
  ): Promise<SearchBusiness[]> {
    // Fetch follower counts and active offers counts in parallel
    const followerCountPromises = businesses.map(b => this.getBusinessFollowerCount(b.id));
    const activeOffersCountPromises = businesses.map(b => this.getBusinessActiveOffersCount(b.id));

    const [followerCounts, activeOffersCounts] = await Promise.all([
      Promise.all(followerCountPromises),
      Promise.all(activeOffersCountPromises)
    ]);

    return businesses.map((business, index) => {
      // Count active coupons for this business
      const activeCoupons = business.business_coupons?.filter(
        (c: any) => c.status === 'active' && new Date(c.valid_until) > new Date()
      ) || [];

      const relevanceScore = this.calculateBusinessRelevanceScore(business, query);

      const { highlightedTitle: highlightedName } = this.highlightSearchTerms(
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
        city: business.city,
        latitude: business.latitude,
        longitude: business.longitude,
        rating: business.rating,
        review_count: business.review_count,
        follower_count: followerCounts[index], // Use live count from business_followers
        logo_url: business.logo_url,
        cover_image_url: business.cover_image_url,
        activeCouponsCount: activeCoupons.length,
        activeOffersCount: activeOffersCounts[index],
        relevanceScore,
        highlightedName,
        distance: undefined, // Would be calculated if location provided
        recommendation_badge: business.recommendation_badge,
        recommendation_percentage: business.recommendation_percentage,
        approved_review_count: business.approved_review_count,
        claim_status: business.claim_status,
        phone_verified: business.phone_verified
      };
    }).map((result, index) => {
      console.log('📊 [SearchService] Business result:', {
        name: result.business_name,
        activeCouponsCount: result.activeCouponsCount,
        activeOffersCount: result.activeOffersCount,
        total: (result.activeCouponsCount || 0) + (result.activeOffersCount || 0)
      });
      return result;
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
   * Generate search suggestions using database function
   */
  private async generateSuggestions(searchTerm: string): Promise<SearchSuggestion[]> {
    if (!searchTerm || searchTerm.length < 2) return [];

    try {
      // Use the get_business_search_suggestions function for better results
      const { data: dbSuggestions, error } = await supabase.rpc('get_business_search_suggestions', {
        search_input: searchTerm,
        suggestion_limit: 8
      });

      if (error) {
        console.error('Error calling search suggestions function:', error);
        // Fallback to basic suggestions
        return await this.getBasicSuggestions(searchTerm);
      }

      // Convert database results to SearchSuggestion format
      const suggestions: SearchSuggestion[] = [];

      dbSuggestions?.forEach((suggestion: any) => {
        suggestions.push({
          text: suggestion.suggestion_text,
          type: suggestion.suggestion_type === 'business' ? 'business' : 'category',
          count: suggestion.match_count || 1,
          id: suggestion.id
        });
      });

      return suggestions;
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return await this.getBasicSuggestions(searchTerm);
    }
  }

  /**
   * Fallback method for basic suggestions
   */
  private async getBasicSuggestions(searchTerm: string): Promise<SearchSuggestion[]> {
    try {
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
      console.error('Error generating basic suggestions:', error);
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
   * Track search analytics in the database
   */
  private async trackSearchAnalytics(
    query: SearchQuery,
    result: SearchResult,
    userId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('search_analytics')
        .insert({
          user_id: userId || null,
          search_term: query.q,
          filters: JSON.stringify(query.filters),
          results_count: result.totalCoupons + result.totalBusinesses,
          response_time_ms: result.searchTime,
          location: query.location ? {
            latitude: query.location.latitude,
            longitude: query.location.longitude,
            radius: query.location.radius
          } : null
        });

      if (error) {
        console.error('Error tracking search analytics:', error);
        // Don't throw error - analytics failure shouldn't break search
      }
    } catch (error) {
      console.error('Error in search analytics tracking:', error);
      // Don't throw error - analytics failure shouldn't break search
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
   * Get trending search terms using database function
   */
  async getTrendingSearchTerms(daysBack: number = 7, limit: number = 10) {
    // Temporarily disabled: search_analytics table doesn't exist yet
    // Once the table is created, uncomment the RPC call below
    return this.getFallbackTrendingTerms();

    /* Original RPC call - disabled to prevent 400 errors
    try {
      const { data, error } = await supabase.rpc('get_trending_search_terms', {
        days_back: daysBack,
        term_limit: limit
      });

      if (error) {
        // Function doesn't exist - return fallback trending terms
        if (error.code === 'PGRST202') {
          return this.getFallbackTrendingTerms();
        }
        console.warn('Error fetching trending search terms:', error.message);
        return this.getFallbackTrendingTerms();
      }

      return data || this.getFallbackTrendingTerms();
    } catch (error) {
      console.warn('Error getting trending search terms:', error);
      return this.getFallbackTrendingTerms();
    }
    */
  }

  /**
   * Fallback trending terms when database function is not available
   */
  private getFallbackTrendingTerms(): string[] {
    return [
      'Restaurants near me',
      'Coffee shops',
      'Weekend deals',
      'Electronics sale',
      'Fashion offers',
      'Grocery stores',
      'Beauty salons',
      'Gyms and fitness',
      'Pizza delivery',
      'Fast food'
    ];
  }

  /**
   * Get popular search terms (legacy method - kept for compatibility)
   */
  async getPopularSearchTerms(limit: number = 10): Promise<string[]> {
    const trending = await this.getTrendingSearchTerms(7, limit);
    // Handle both object array and string array
    if (trending.length > 0 && typeof trending[0] === 'object') {
      return trending.slice(0, limit).map((item: any) => item.search_term || item);
    }
    return trending.slice(0, limit);
  }
}

// Export singleton instance
export const searchService = new SearchService();

/**
 * Friend Search Filters
 * Story 9.2.4: Search Filters & Advanced Search
 */
export interface FriendSearchFilters {
  location?: {
    lat: number;
    lng: number;
    radius: 5 | 10 | 25 | 50; // km
  };
  hasMutualFriends?: boolean;
  sharedInterests?: string[]; // deal category IDs
  limit?: number;
  offset?: number;
}

export interface FriendSearchResult {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  location: string | null;
  mutual_friends_count: number;
  distance_km: number | null;
  relevance_score: number;
}

/**
 * Search users with filters
 * Story 9.2.4
 */
export async function searchUsersWithFilters(
  query: string,
  filters: FriendSearchFilters = {}
): Promise<FriendSearchResult[]> {
  if (!query || query.trim().length < 2) {
    throw new Error('Search query must be at least 2 characters');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('search_users_with_filters', {
    search_query: query.trim(),
    current_user_id: user.id,
    filter_location_lat: filters.location?.lat || null,
    filter_location_lng: filters.location?.lng || null,
    filter_location_radius_km: filters.location?.radius || null,
    filter_require_mutual_friends: filters.hasMutualFriends || false,
    filter_shared_interests: filters.sharedInterests || [],
    limit_count: filters.limit || 20,
    offset_count: filters.offset || 0,
  });

  if (error) {
    console.error('Filtered search error:', error);
    throw new Error('Failed to search with filters. Please try again.');
  }

  return data || [];
}

/**
 * Save filters to localStorage
 */
export function saveSearchFilters(filters: FriendSearchFilters): void {
  try {
    localStorage.setItem('friend_search_filters', JSON.stringify(filters));
  } catch (error) {
    console.error('Failed to save search filters:', error);
  }
}

/**
 * Load filters from localStorage
 */
export function loadSearchFilters(): FriendSearchFilters {
  try {
    const saved = localStorage.getItem('friend_search_filters');
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to load search filters:', error);
    return {};
  }
}

/**
 * Clear saved filters
 */
export function clearSearchFilters(): void {
  try {
    localStorage.removeItem('friend_search_filters');
  } catch (error) {
    console.error('Failed to clear search filters:', error);
  }
}

/**
 * Performance Optimization
 * Story 9.2.5: Search Performance Optimization
 */

// Search result caching TTL (30 seconds)
export const SEARCH_CACHE_TTL = 30000;

/**
 * Search users with client-side caching and performance monitoring
 * Story 9.2.5
 */
export async function searchUsers(
  query: string,
  options: { limit?: number; offset?: number } = {}
): Promise<FriendSearchResult[]> {
  if (!query || query.trim().length < 2) {
    throw new Error('Search query must be at least 2 characters');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Use optimized search function (now using GIN full-text index)
  const { data, error } = await supabase.rpc('search_users', {
    search_query: query.trim(),
    current_user_id: user.id,
    limit_count: options.limit || 20,
    offset_count: options.offset || 0,
  });

  if (error) {
    console.error('Search error:', error);
    throw new Error('Search failed. Please try again.');
  }

  return data || [];
}

/**
 * Performance monitoring: Log slow searches
 * Story 9.2.5
 */
export async function logSlowSearch(
  query: string,
  duration: number,
  resultCount: number
): Promise<void> {
  if (duration > 500) {
    // Log to monitoring service (e.g., Sentry, LogRocket)
    console.warn('Slow search detected', {
      query,
      duration,
      resultCount,
      timestamp: new Date().toISOString(),
    });

    // You can also send this to your analytics/monitoring service
    // Example: Sentry.captureMessage('Slow search', { level: 'warning', ... });
  }
}

export default searchService;
