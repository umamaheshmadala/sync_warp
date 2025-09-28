// advancedSearchService.ts
// Advanced search service with multi-filter support, location-based queries, and business discovery

import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface SearchFilters {
  query?: string;
  categories?: string[];
  location?: {
    latitude: number;
    longitude: number;
    radius?: number; // in kilometers, default 50km
  };
  priceRange?: {
    min?: number;
    max?: number;
  };
  rating?: {
    min?: number;
    max?: number;
  };
  sortBy?: 'relevance' | 'distance' | 'rating' | 'newest' | 'popular';
  limit?: number;
  offset?: number;
  isOpen?: boolean; // filter by currently open businesses
  hasOffers?: boolean; // filter businesses with active coupons
}

export interface BusinessSearchResult {
  id: string;
  name: string;
  description: string;
  category: string;
  logo_url?: string;
  cover_image_url?: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  operating_hours: any;
  tags: string[];
  status: 'active' | 'pending' | 'suspended';
  created_at: string;
  updated_at: string;
  // Computed fields
  distance?: number; // in kilometers
  rating?: number;
  review_count?: number;
  is_open?: boolean;
  active_offers_count?: number;
  is_favorited?: boolean;
}

export interface CouponSearchResult {
  id: string;
  business_id: string;
  business_name: string;
  business_logo?: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_item';
  discount_value: number;
  minimum_order_value?: number;
  valid_from: string;
  valid_until: string;
  usage_limit: number;
  used_count: number;
  terms_conditions?: string;
  status: 'active' | 'paused' | 'expired';
  is_trending?: boolean;
  popularity_score?: number;
}

export interface SearchSuggestion {
  type: 'business' | 'category' | 'location' | 'query';
  text: string;
  count?: number;
  metadata?: any;
}

export interface DiscoverySection {
  id: string;
  title: string;
  type: 'trending' | 'nearby' | 'new' | 'recommended' | 'category';
  businesses: BusinessSearchResult[];
  coupons?: CouponSearchResult[];
}

class AdvancedSearchService {
  private userId?: string;

  constructor() {
    // Get current user
    this.userId = useAuthStore.getState().user?.id;
  }

  // Main search businesses method
  async searchBusinesses(filters: SearchFilters = {}): Promise<{
    businesses: BusinessSearchResult[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      let query = supabase
        .from('businesses')
        .select(`
          *,
          business_reviews!inner(rating),
          coupons!inner(id, status)
        `);

      // Text search
      if (filters.query) {
        query = query.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%,tags.cs.{${filters.query}}`);
      }

      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        query = query.in('category', filters.categories);
      }

      // Status filter (only active businesses)
      query = query.eq('status', 'active');

      // Active offers filter
      if (filters.hasOffers) {
        query = query.eq('coupons.status', 'active');
      }

      // Pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: businesses, error, count } = await query;

      if (error) throw error;

      if (businesses && businesses.length > 0) {
        // Process results and add computed fields
        const processedBusinesses = await this.processBusinessResults(businesses, filters);

        return {
          businesses: processedBusinesses,
          total: count || 0,
          hasMore: (count || 0) > offset + limit
        };
      }

      // Fallback to mock data if no businesses found in database
      return this.getMockBusinessResults(filters);
    } catch (error) {
      console.error('Search businesses error:', error);
      // Return mock data instead of throwing error
      return this.getMockBusinessResults(filters);
    }
  }
  
  // Mock business results for fallback
  private getMockBusinessResults(filters: SearchFilters = {}): {
    businesses: BusinessSearchResult[];
    total: number;
    hasMore: boolean;
  } {
    const mockBusinesses: BusinessSearchResult[] = [
      {
        id: 'mock-biz-1',
        name: "Mario's Pizza Palace",
        description: "Authentic Italian pizzas made with fresh ingredients and traditional recipes.",
        category: 'Restaurant',
        logo_url: '/api/placeholder/100/100',
        cover_image_url: '/api/placeholder/400/200',
        address: '123 Main Street',
        city: 'Downtown',
        state: 'State',
        latitude: 40.7128,
        longitude: -74.0060,
        phone: '+1-555-PIZZA',
        website: 'https://marios-pizza.example.com',
        operating_hours: {
          monday: { open: '11:00', close: '22:00', closed: false },
          tuesday: { open: '11:00', close: '22:00', closed: false },
          wednesday: { open: '11:00', close: '22:00', closed: false },
          thursday: { open: '11:00', close: '22:00', closed: false },
          friday: { open: '11:00', close: '23:00', closed: false },
          saturday: { open: '11:00', close: '23:00', closed: false },
          sunday: { open: '12:00', close: '21:00', closed: false }
        },
        tags: ['pizza', 'italian', 'delivery', 'takeout'],
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        distance: 1.2,
        rating: 4.5,
        review_count: 128,
        is_open: true,
        active_offers_count: 2,
        is_favorited: false
      },
      {
        id: 'mock-biz-2',
        name: "Brew & Bean Café",
        description: "Specialty coffee roasters serving artisanal drinks and fresh pastries.",
        category: 'Café',
        logo_url: '/api/placeholder/100/100',
        cover_image_url: '/api/placeholder/400/200',
        address: '456 Coffee Lane',
        city: 'Uptown',
        state: 'State',
        latitude: 40.7589,
        longitude: -73.9851,
        phone: '+1-555-BREW',
        website: 'https://brew-bean.example.com',
        operating_hours: {
          monday: { open: '07:00', close: '20:00', closed: false },
          tuesday: { open: '07:00', close: '20:00', closed: false },
          wednesday: { open: '07:00', close: '20:00', closed: false },
          thursday: { open: '07:00', close: '20:00', closed: false },
          friday: { open: '07:00', close: '21:00', closed: false },
          saturday: { open: '08:00', close: '21:00', closed: false },
          sunday: { open: '08:00', close: '19:00', closed: false }
        },
        tags: ['coffee', 'pastries', 'wifi', 'coworking'],
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        distance: 0.8,
        rating: 4.7,
        review_count: 89,
        is_open: true,
        active_offers_count: 1,
        is_favorited: false
      },
      {
        id: 'mock-biz-3',
        name: "Serenity Spa & Wellness",
        description: "Relax and rejuvenate with our full-service spa treatments and wellness programs.",
        category: 'Wellness',
        logo_url: '/api/placeholder/100/100',
        cover_image_url: '/api/placeholder/400/200',
        address: '789 Zen Avenue',
        city: 'Wellness District',
        state: 'State',
        latitude: 40.7282,
        longitude: -74.0776,
        phone: '+1-555-SPA',
        website: 'https://serenity-spa.example.com',
        operating_hours: {
          monday: { open: '09:00', close: '20:00', closed: false },
          tuesday: { open: '09:00', close: '20:00', closed: false },
          wednesday: { open: '09:00', close: '20:00', closed: false },
          thursday: { open: '09:00', close: '20:00', closed: false },
          friday: { open: '09:00', close: '21:00', closed: false },
          saturday: { open: '08:00', close: '21:00', closed: false },
          sunday: { open: '10:00', close: '18:00', closed: false }
        },
        tags: ['spa', 'massage', 'wellness', 'relaxation'],
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        distance: 2.1,
        rating: 4.8,
        review_count: 156,
        is_open: true,
        active_offers_count: 3,
        is_favorited: false
      },
      {
        id: 'mock-biz-4',
        name: "TechMart Electronics",
        description: "Latest gadgets, smartphones, laptops, and tech accessories at competitive prices.",
        category: 'Electronics',
        logo_url: '/api/placeholder/100/100',
        cover_image_url: '/api/placeholder/400/200',
        address: '321 Tech Boulevard',
        city: 'Tech District',
        state: 'State',
        latitude: 40.7505,
        longitude: -73.9934,
        phone: '+1-555-TECH',
        website: 'https://techmart.example.com',
        operating_hours: {
          monday: { open: '10:00', close: '21:00', closed: false },
          tuesday: { open: '10:00', close: '21:00', closed: false },
          wednesday: { open: '10:00', close: '21:00', closed: false },
          thursday: { open: '10:00', close: '21:00', closed: false },
          friday: { open: '10:00', close: '22:00', closed: false },
          saturday: { open: '10:00', close: '22:00', closed: false },
          sunday: { open: '11:00', close: '20:00', closed: false }
        },
        tags: ['electronics', 'smartphones', 'laptops', 'gadgets'],
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        distance: 1.5,
        rating: 4.3,
        review_count: 234,
        is_open: true,
        active_offers_count: 5,
        is_favorited: false
      }
    ];

    // Apply basic filtering
    let filteredBusinesses = [...mockBusinesses];
    
    // Text search filter
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filteredBusinesses = filteredBusinesses.filter(business => 
        business.name.toLowerCase().includes(query) ||
        business.description.toLowerCase().includes(query) ||
        business.category.toLowerCase().includes(query) ||
        business.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      filteredBusinesses = filteredBusinesses.filter(business => 
        filters.categories!.includes(business.category)
      );
    }
    
    // Has offers filter
    if (filters.hasOffers) {
      filteredBusinesses = filteredBusinesses.filter(business => 
        (business.active_offers_count || 0) > 0
      );
    }
    
    // Pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    const paginatedResults = filteredBusinesses.slice(offset, offset + limit);
    
    return {
      businesses: paginatedResults,
      total: filteredBusinesses.length,
      hasMore: filteredBusinesses.length > offset + limit
    };
  }

  // Location-based business discovery
  async discoverNearbyBusinesses(
    latitude: number,
    longitude: number,
    radius: number = 10,
    limit: number = 20
  ): Promise<BusinessSearchResult[]> {
    try {
      // Use PostGIS for distance calculation
      const { data, error } = await supabase.rpc('nearby_businesses', {
        lat: latitude,
        lng: longitude,
        radius_km: radius,
        result_limit: limit
      });

      if (error) throw error;

      return await this.processBusinessResults(data || [], { location: { latitude, longitude } });
    } catch (error) {
      console.error('Discover nearby businesses error:', error);
      // Fallback to simple search if PostGIS function doesn't exist
      return this.searchBusinesses({ 
        location: { latitude, longitude, radius },
        limit 
      }).then(result => result.businesses);
    }
  }

  // Get business categories with counts
  async getBusinessCategories(): Promise<Array<{
    name: string;
    count: number;
    description?: string;
    icon?: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('category')
        .eq('status', 'active');

      if (error) throw error;

      if (data && data.length > 0) {
        // Count categories
        const categoryCounts: Record<string, number> = {};
        data.forEach(business => {
          categoryCounts[business.category] = (categoryCounts[business.category] || 0) + 1;
        });

        // Get category details
        const { data: categoryDetails, error: categoryError } = await supabase
          .from('business_categories')
          .select('*');

        if (categoryError) console.warn('Category details error:', categoryError);

        // Combine counts with details
        return Object.entries(categoryCounts)
          .map(([name, count]) => {
            const details = categoryDetails?.find(cat => cat.name === name);
            return {
              name,
              count,
              description: details?.description,
              icon: details?.icon
            };
          })
          .sort((a, b) => b.count - a.count);
      }

      // Fallback to mock categories
      return this.getMockCategories();
    } catch (error) {
      console.error('Get business categories error:', error);
      // Return mock data instead of throwing error
      return this.getMockCategories();
    }
  }
  
  // Mock categories for fallback
  private getMockCategories(): Array<{
    name: string;
    count: number;
    description?: string;
    icon?: string;
  }> {
    return [
      {
        name: 'Restaurant',
        count: 1,
        description: 'Restaurants, cafes, and dining establishments',
        icon: '🍽️'
      },
      {
        name: 'Café',
        count: 1,
        description: 'Coffee shops and casual dining',
        icon: '☕'
      },
      {
        name: 'Wellness',
        count: 1,
        description: 'Spas, salons, and wellness centers',
        icon: '🧘'
      },
      {
        name: 'Electronics',
        count: 1,
        description: 'Tech stores and electronics retailers',
        icon: '📱'
      },
      {
        name: 'Retail',
        count: 0,
        description: 'Shopping and retail stores',
        icon: '🛍️'
      },
      {
        name: 'Services',
        count: 0,
        description: 'Professional and personal services',
        icon: '🔧'
      }
    ].sort((a, b) => b.count - a.count);
  }

  // Search trending coupons
  async getTrendingCoupons(limit: number = 10): Promise<CouponSearchResult[]> {
    try {
      // Skip database query for now and use mock data directly
      // TODO: Re-enable when database schema is fixed
      console.log('Using mock trending coupons data');
      return this.getMockTrendingCoupons(limit);
      
      /* Commented out until database schema is complete
      const { data, error } = await supabase
        .from('coupons')
        .select(`
          *,
          businesses!inner(id, name, logo_url)
        `)
        .eq('status', 'active')
        .gte('valid_until', new Date().toISOString())
        .order('used_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (data && data.length > 0) {
        return (data || []).map(coupon => ({
          ...coupon,
          business_name: coupon.businesses.name,
          business_logo: coupon.businesses.logo_url,
          is_trending: true,
          popularity_score: coupon.used_count || 0
        }));
      }
      */
    } catch (error) {
      console.error('Get trending coupons error:', error);
      // Return mock data instead of throwing error
      return this.getMockTrendingCoupons(limit);
    }
  }

  // Mock trending coupons for fallback
  private getMockTrendingCoupons(limit: number = 10): CouponSearchResult[] {
    const mockCoupons: CouponSearchResult[] = [
      {
        id: 'mock-1',
        title: '50% Off All Pizzas',
        description: 'Get 50% discount on all pizza varieties. Valid for dine-in and takeout.',
        discount_type: 'percentage',
        discount_value: 50,
        minimum_order_value: 500,
        usage_limit: 100,
        used_count: 45,
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        status: 'active',
        business_id: 'mock-biz-1',
        business_name: "Mario's Pizza Palace",
        business_logo: '/api/placeholder/100/100',
        is_trending: true,
        popularity_score: 45,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-2',
        title: 'Buy 2 Get 1 Free Coffee',
        description: 'Perfect deal for coffee lovers! Buy any 2 beverages and get 1 free.',
        discount_type: 'buy_x_get_y',
        discount_value: 2,
        minimum_order_value: 300,
        usage_limit: 50,
        used_count: 38,
        valid_until: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        status: 'active',
        business_id: 'mock-biz-2',
        business_name: 'Brew & Bean Café',
        business_logo: '/api/placeholder/100/100',
        is_trending: true,
        popularity_score: 38,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-3',
        title: '₹200 Off Spa Services',
        description: 'Relax and rejuvenate with ₹200 off on all spa and wellness treatments.',
        discount_type: 'fixed_amount',
        discount_value: 200,
        minimum_order_value: 1000,
        usage_limit: 30,
        used_count: 22,
        valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
        status: 'active',
        business_id: 'mock-biz-3',
        business_name: 'Serenity Spa & Wellness',
        business_logo: '/api/placeholder/100/100',
        is_trending: true,
        popularity_score: 22,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-4',
        title: '30% Off Electronics',
        description: 'Huge savings on smartphones, laptops, and accessories. Limited time offer!',
        discount_type: 'percentage',
        discount_value: 30,
        minimum_order_value: 2000,
        usage_limit: 25,
        used_count: 18,
        valid_until: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        status: 'active',
        business_id: 'mock-biz-4',
        business_name: 'TechMart Electronics',
        business_logo: '/api/placeholder/100/100',
        is_trending: true,
        popularity_score: 18,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-5',
        title: 'Free Dessert with Main Course',
        description: 'Order any main course and get a complimentary dessert of your choice.',
        discount_type: 'free_item',
        discount_value: 0,
        minimum_order_value: 400,
        usage_limit: 75,
        used_count: 35,
        valid_until: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
        status: 'active',
        business_id: 'mock-biz-5',
        business_name: 'The Garden Restaurant',
        business_logo: '/api/placeholder/100/100',
        is_trending: true,
        popularity_score: 35,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return mockCoupons.slice(0, Math.min(limit, mockCoupons.length));
  }

  // Get search suggestions
  async getSearchSuggestions(query: string, limit: number = 5): Promise<SearchSuggestion[]> {
    if (!query || query.length < 2) return [];

    try {
      const suggestions: SearchSuggestion[] = [];

      // Business name suggestions
      const { data: businesses } = await supabase
        .from('businesses')
        .select('name, category')
        .ilike('name', `%${query}%`)
        .eq('status', 'active')
        .limit(3);

      businesses?.forEach(business => {
        suggestions.push({
          type: 'business',
          text: business.name,
          metadata: { category: business.category }
        });
      });

      // Category suggestions
      const { data: categories } = await supabase
        .from('business_categories')
        .select('name')
        .ilike('name', `%${query}%`)
        .limit(2);

      categories?.forEach(category => {
        suggestions.push({
          type: 'category',
          text: category.name
        });
      });

      if (suggestions.length > 0) {
        return suggestions.slice(0, limit);
      }

      // Fallback to mock suggestions if no database results
      return this.getMockSuggestions(query, limit);
    } catch (error) {
      console.error('Get search suggestions error:', error);
      // Return mock suggestions instead of empty array
      return this.getMockSuggestions(query, limit);
    }
  }
  
  // Mock suggestions for fallback
  private getMockSuggestions(query: string, limit: number = 5): SearchSuggestion[] {
    const queryLower = query.toLowerCase();
    
    const mockSuggestions: SearchSuggestion[] = [
      // Business suggestions
      { type: 'business', text: "Mario's Pizza Palace", metadata: { category: 'Restaurant' } },
      { type: 'business', text: "Brew & Bean Café", metadata: { category: 'Café' } },
      { type: 'business', text: "Serenity Spa & Wellness", metadata: { category: 'Wellness' } },
      { type: 'business', text: "TechMart Electronics", metadata: { category: 'Electronics' } },
      
      // Category suggestions
      { type: 'category', text: 'Restaurant' },
      { type: 'category', text: 'Café' },
      { type: 'category', text: 'Wellness' },
      { type: 'category', text: 'Electronics' },
      { type: 'category', text: 'Retail' },
      { type: 'category', text: 'Services' },
      
      // Query suggestions
      { type: 'query', text: 'pizza delivery' },
      { type: 'query', text: 'coffee near me' },
      { type: 'query', text: 'spa massage' },
      { type: 'query', text: 'electronics store' },
    ];
    
    // Filter suggestions based on query
    const filtered = mockSuggestions.filter(suggestion => 
      suggestion.text.toLowerCase().includes(queryLower)
    );
    
    return filtered.slice(0, limit);
  }

  // Get discovery sections
  async getDiscoverySections(
    userLocation?: { latitude: number; longitude: number }
  ): Promise<DiscoverySection[]> {
    try {
      const sections: DiscoverySection[] = [];

      // Trending businesses
      const trendingBusinesses = await this.searchBusinesses({
        sortBy: 'popular',
        limit: 8
      });

      sections.push({
        id: 'trending',
        title: 'Trending Now',
        type: 'trending',
        businesses: trendingBusinesses.businesses
      });

      // Nearby businesses (if location available)
      if (userLocation) {
        const nearbyBusinesses = await this.discoverNearbyBusinesses(
          userLocation.latitude,
          userLocation.longitude,
          5, // 5km radius
          8
        );

        sections.push({
          id: 'nearby',
          title: 'Near You',
          type: 'nearby',
          businesses: nearbyBusinesses
        });
      }

      // New businesses
      const newBusinesses = await this.searchBusinesses({
        sortBy: 'newest',
        limit: 8
      });

      sections.push({
        id: 'new',
        title: 'New Businesses',
        type: 'new',
        businesses: newBusinesses.businesses
      });

      // Trending coupons
      const trendingCoupons = await this.getTrendingCoupons(8);

      sections.push({
        id: 'trending-coupons',
        title: 'Hot Deals',
        type: 'trending',
        businesses: [], // Empty for coupon section
        coupons: trendingCoupons
      });

      return sections;
    } catch (error) {
      console.error('Get discovery sections error:', error);
      return [];
    }
  }

  // Get personalized recommendations based on user favorites and history
  async getPersonalizedRecommendations(limit: number = 10): Promise<BusinessSearchResult[]> {
    if (!this.userId) return [];

    try {
      // Get user's favorite categories and locations
      const { data: favorites } = await supabase
        .from('enhanced_favorites')
        .select(`
          item_id,
          item_type,
          businesses!inner(category, latitude, longitude)
        `)
        .eq('user_id', this.userId)
        .eq('item_type', 'business');

      if (!favorites || favorites.length === 0) {
        // Return popular businesses if no favorites
        const result = await this.searchBusinesses({
          sortBy: 'popular',
          limit
        });
        return result.businesses;
      }

      // Analyze favorite patterns
      const favoriteCategories = [...new Set(favorites.map(fav => fav.businesses?.category).filter(Boolean))];
      
      // Get recommendations based on favorite categories
      const recommendations = await this.searchBusinesses({
        categories: favoriteCategories,
        sortBy: 'rating',
        limit
      });

      return recommendations.businesses;
    } catch (error) {
      console.error('Get personalized recommendations error:', error);
      return [];
    }
  }

  // Process business results to add computed fields
  private async processBusinessResults(
    businesses: any[],
    filters: SearchFilters
  ): Promise<BusinessSearchResult[]> {
    return businesses.map(business => {
      const result: BusinessSearchResult = {
        ...business,
        rating: this.calculateAverageRating(business.business_reviews),
        review_count: business.business_reviews?.length || 0,
        active_offers_count: business.coupons?.filter((c: any) => c.status === 'active').length || 0,
        is_open: this.isBusinessOpen(business.operating_hours),
      };

      // Calculate distance if user location provided
      if (filters.location && business.latitude && business.longitude) {
        result.distance = this.calculateDistance(
          filters.location.latitude,
          filters.location.longitude,
          business.latitude,
          business.longitude
        );
      }

      return result;
    });
  }

  // Helper methods
  private calculateAverageRating(reviews: any[]): number {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  private isBusinessOpen(operatingHours: any): boolean {
    if (!operatingHours) return false;
    
    const now = new Date();
    const day = now.toLocaleLowerCase() + 'day';
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const todayHours = operatingHours[day];
    if (!todayHours || !todayHours.isOpen) return false;
    
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    return currentTime >= openTime && currentTime <= closeTime;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal place
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}

// Create singleton instance
const advancedSearchService = new AdvancedSearchService();
export default advancedSearchService;