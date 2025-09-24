// CouponService.ts
// Comprehensive backend API service for coupon management
// Handles all database operations, caching, validation, and error handling

import { supabase } from '../lib/supabase';
import { 
  Coupon,
  CouponFormData,
  CouponFilters,
  CouponAnalytics,
  CouponRedemption,
  UserCouponCollection,
  RedemptionRequest,
  RedemptionResponse,
  QRCodeData,
  DailyAnalytics,
  COUPON_LIMITS,
  COUPON_CODE_PREFIX,
  CouponStatus,
  CouponType
} from '../types/coupon';
import { toast } from 'react-hot-toast';

// Cache management
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CouponServiceCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

class CouponService {
  private cache = new CouponServiceCache();
  private subscribers = new Map<string, Set<(data: any) => void>>();

  // ==================== COUPON CRUD OPERATIONS ====================

  /**
   * Fetch all coupons for a business with advanced filtering and caching
   */
  async fetchCoupons(
    businessId: string, 
    filters?: CouponFilters,
    useCache: boolean = true
  ): Promise<Coupon[]> {
    const cacheKey = `coupons_${businessId}_${JSON.stringify(filters)}`;
    
    if (useCache) {
      const cachedData = this.cache.get<Coupon[]>(cacheKey);
      if (cachedData) return cachedData;
    }

    try {
      let query = supabase
        .from('business_coupons')
        .select(`
          *,
          businesses!inner(business_name, user_id)
        `)
        .eq('business_id', businessId);

      // Apply filters
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      // Default sorting
      if (!filters?.sort_by) {
        query = query
          .order('status', { ascending: false })
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const coupons = data || [];
      
      // Cache the results
      if (useCache) {
        this.cache.set(cacheKey, coupons);
      }

      return coupons;
    } catch (error) {
      console.error('Error fetching coupons:', error);
      throw new Error(`Failed to fetch coupons: ${error.message}`);
    }
  }

  /**
   * Fetch a single coupon by ID
   */
  async fetchCoupon(couponId: string, useCache: boolean = true): Promise<Coupon | null> {
    const cacheKey = `coupon_${couponId}`;
    
    if (useCache) {
      const cachedData = this.cache.get<Coupon>(cacheKey);
      if (cachedData) return cachedData;
    }

    try {
      const { data, error } = await supabase
        .from('business_coupons')
        .select(`
          *,
          businesses!inner(business_name, user_id)
        `)
        .eq('id', couponId)
        .single();

      if (error) throw error;

      if (useCache && data) {
        this.cache.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      console.error('Error fetching coupon:', error);
      return null;
    }
  }

  /**
   * Create a new coupon with comprehensive validation
   */
  async createCoupon(
    couponData: CouponFormData, 
    businessId: string, 
    userId: string
  ): Promise<Coupon> {
    try {
      // Validate business ownership
      await this.validateBusinessOwnership(businessId, userId);

      // Check coupon limits
      await this.validateCouponLimits(businessId);

      // Validate coupon data
      this.validateCouponData(couponData);

      // Generate unique coupon code
      const coupon_code = await this.generateUniqueCouponCode(couponData.type);

      // Prepare coupon data
      const newCouponData = {
        ...couponData,
        business_id: businessId,
        coupon_code,
        created_by: userId,
        status: 'active' as CouponStatus,
        usage_count: 0,
        collection_count: 0,
        valid_from: new Date(couponData.valid_from).toISOString(),
        valid_until: new Date(couponData.valid_until).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('business_coupons')
        .insert([newCouponData])
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      this.cache.invalidate(`coupons_${businessId}`);
      
      // Initialize analytics record
      await this.initializeCouponAnalytics(data.id);

      // Notify subscribers
      this.notifySubscribers(`coupons_${businessId}`, data);

      return data;
    } catch (error) {
      console.error('Create coupon error:', error);
      throw error;
    }
  }

  /**
   * Update an existing coupon
   */
  async updateCoupon(
    couponId: string, 
    updates: Partial<CouponFormData>, 
    userId: string
  ): Promise<Coupon> {
    try {
      // Verify ownership
      const coupon = await this.fetchCoupon(couponId, false);
      if (!coupon) throw new Error('Coupon not found');

      await this.validateBusinessOwnership(coupon.business_id, userId);

      // Validate updates
      if (Object.keys(updates).length > 0) {
        this.validateCouponData(updates);
      }

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Format dates if provided
      if (updates.valid_from) {
        updateData.valid_from = new Date(updates.valid_from).toISOString();
      }
      if (updates.valid_until) {
        updateData.valid_until = new Date(updates.valid_until).toISOString();
      }

      const { data, error } = await supabase
        .from('business_coupons')
        .update(updateData)
        .eq('id', couponId)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      this.cache.invalidate(`coupon_${couponId}`);
      this.cache.invalidate(`coupons_${coupon.business_id}`);

      // Notify subscribers
      this.notifySubscribers(`coupon_${couponId}`, data);

      return data;
    } catch (error) {
      console.error('Update coupon error:', error);
      throw error;
    }
  }

  /**
   * Delete a coupon with safety checks
   */
  async deleteCoupon(couponId: string, userId: string): Promise<boolean> {
    try {
      const coupon = await this.fetchCoupon(couponId, false);
      if (!coupon) throw new Error('Coupon not found');

      await this.validateBusinessOwnership(coupon.business_id, userId);

      // Soft delete if used
      if (coupon.usage_count > 0) {
        await this.updateCoupon(couponId, { status: 'cancelled' }, userId);
        return true;
      }

      const { error } = await supabase
        .from('business_coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      // Clean up analytics
      await this.deleteCouponAnalytics(couponId);

      // Invalidate cache
      this.cache.invalidate(`coupon_${couponId}`);
      this.cache.invalidate(`coupons_${coupon.business_id}`);

      return true;
    } catch (error) {
      console.error('Delete coupon error:', error);
      throw error;
    }
  }

  /**
   * Toggle coupon status (active/paused)
   */
  async toggleCouponStatus(couponId: string, userId: string): Promise<Coupon> {
    try {
      const coupon = await this.fetchCoupon(couponId, false);
      if (!coupon) throw new Error('Coupon not found');

      const newStatus: CouponStatus = coupon.status === 'active' ? 'paused' : 'active';
      
      return await this.updateCoupon(couponId, { status: newStatus }, userId);
    } catch (error) {
      console.error('Toggle status error:', error);
      throw error;
    }
  }

  // ==================== ANALYTICS OPERATIONS ====================

  /**
   * Fetch comprehensive coupon analytics
   */
  async fetchCouponAnalytics(couponId: string): Promise<CouponAnalytics | null> {
    const cacheKey = `analytics_${couponId}`;
    const cachedData = this.cache.get<CouponAnalytics>(cacheKey);
    
    if (cachedData) return cachedData;

    try {
      const { data, error } = await supabase
        .from('coupon_analytics')
        .select('*')
        .eq('coupon_id', couponId)
        .single();

      if (error) {
        // If no analytics record exists, create default
        if (error.code === 'PGRST116') {
          return await this.initializeCouponAnalytics(couponId);
        }
        throw error;
      }

      // Cache the result
      this.cache.set(cacheKey, data, 2 * 60 * 1000); // 2 minutes for analytics

      return data;
    } catch (error) {
      console.error('Error fetching coupon analytics:', error);
      return null;
    }
  }

  /**
   * Get aggregated analytics for multiple coupons
   */
  async fetchBusinessAnalytics(businessId: string): Promise<{
    totalCoupons: number;
    activeCoupons: number;
    totalRedemptions: number;
    totalRevenue: number;
    topPerformingCoupons: Array<Coupon & { analytics: CouponAnalytics }>;
  }> {
    const cacheKey = `business_analytics_${businessId}`;
    const cachedData = this.cache.get<any>(cacheKey);
    
    if (cachedData) return cachedData;

    try {
      // Get all coupons for the business
      const coupons = await this.fetchCoupons(businessId, undefined, false);
      
      // Get analytics for each coupon
      const analyticsPromises = coupons.map(async (coupon) => {
        const analytics = await this.fetchCouponAnalytics(coupon.id);
        return { ...coupon, analytics };
      });

      const couponsWithAnalytics = await Promise.all(analyticsPromises);

      // Calculate aggregated metrics
      const result = {
        totalCoupons: coupons.length,
        activeCoupons: coupons.filter(c => c.status === 'active').length,
        totalRedemptions: couponsWithAnalytics.reduce((sum, c) => 
          sum + (c.analytics?.total_redemptions || 0), 0
        ),
        totalRevenue: couponsWithAnalytics.reduce((sum, c) => 
          sum + (c.analytics?.estimated_revenue_generated || 0), 0
        ),
        topPerformingCoupons: couponsWithAnalytics
          .filter(c => c.analytics)
          .sort((a, b) => (b.analytics?.total_redemptions || 0) - (a.analytics?.total_redemptions || 0))
          .slice(0, 5)
      };

      // Cache for 5 minutes
      this.cache.set(cacheKey, result, 5 * 60 * 1000);

      return result;
    } catch (error) {
      console.error('Error fetching business analytics:', error);
      throw new Error(`Failed to fetch business analytics: ${error.message}`);
    }
  }

  // ==================== REDEMPTION OPERATIONS ====================

  /**
   * Validate coupon for redemption
   */
  async validateCouponRedemption(
    couponCode: string, 
    userId: string,
    originalAmount: number = 0
  ): Promise<RedemptionResponse> {
    try {
      const { data, error } = await supabase.rpc('validate_coupon_redemption', {
        code: couponCode,
        user_id_param: userId,
        original_amount_param: originalAmount
      });

      if (error) throw error;

      if (!data.valid) {
        return {
          success: false,
          error_message: data.error,
          error_code: 'VALIDATION_FAILED',
          discount_applied: 0,
          final_amount: originalAmount
        };
      }

      return {
        success: true,
        discount_applied: data.discount_amount,
        final_amount: data.final_amount,
        coupon: await this.fetchCoupon(data.coupon_id)
      };
    } catch (error) {
      console.error('Error validating coupon:', error);
      return {
        success: false,
        error_message: 'Failed to validate coupon',
        error_code: 'SYSTEM_ERROR',
        discount_applied: 0,
        final_amount: originalAmount
      };
    }
  }

  /**
   * Process coupon redemption
   */
  async redeemCoupon(request: RedemptionRequest, userId: string): Promise<CouponRedemption | null> {
    try {
      // First validate the coupon
      const validation = await this.validateCouponRedemption(
        request.coupon_code,
        userId,
        request.original_amount || 0
      );

      if (!validation.success) {
        throw new Error(validation.error_message || 'Coupon validation failed');
      }

      // Create redemption record
      const redemptionData = {
        coupon_id: validation.coupon?.id,
        user_id: userId,
        business_id: validation.coupon?.business_id,
        redemption_code: request.coupon_code,
        redemption_amount: validation.discount_applied,
        original_amount: request.original_amount || 0,
        final_amount: validation.final_amount,
        redeemed_at_latitude: request.location?.latitude,
        redeemed_at_longitude: request.location?.longitude,
        transaction_reference: this.generateTransactionReference(),
        notes: request.staff_notes,
        status: 'completed' as const,
        redeemed_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('coupon_redemptions')
        .insert([redemptionData])
        .select()
        .single();

      if (error) throw error;

      // Update analytics asynchronously
      this.updateAnalyticsAfterRedemption(validation.coupon!.id, validation.discount_applied);

      // Invalidate relevant caches
      this.cache.invalidate(`coupon_${validation.coupon!.id}`);
      this.cache.invalidate(`analytics_${validation.coupon!.id}`);

      return data;
    } catch (error) {
      console.error('Error redeeming coupon:', error);
      throw new Error(`Failed to redeem coupon: ${error.message}`);
    }
  }

  // ==================== USER COUPON COLLECTION ====================

  /**
   * Fetch user's collected coupons
   */
  async fetchUserCoupons(userId: string): Promise<UserCouponCollection[]> {
    const cacheKey = `user_coupons_${userId}`;
    const cachedData = this.cache.get<UserCouponCollection[]>(cacheKey);
    
    if (cachedData) return cachedData;

    try {
      const { data, error } = await supabase
        .from('user_coupon_collections')
        .select(`
          *,
          business_coupons!inner(
            id, title, description, discount_value, discount_type, type, coupon_code,
            valid_until, terms_conditions,
            businesses!inner(business_name, address)
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('collected_at', { ascending: false });

      if (error) throw error;

      const collections = data || [];
      
      // Cache for 3 minutes
      this.cache.set(cacheKey, collections, 3 * 60 * 1000);

      return collections;
    } catch (error) {
      console.error('Error fetching user coupons:', error);
      throw new Error(`Failed to fetch user coupons: ${error.message}`);
    }
  }

  /**
   * Collect a coupon for a user
   */
  async collectCoupon(
    couponId: string, 
    userId: string, 
    source: string = 'direct_search'
  ): Promise<boolean> {
    try {
      // Get coupon details
      const coupon = await this.fetchCoupon(couponId, false);
      if (!coupon) throw new Error('Coupon not found');

      // Check if coupon is active and valid
      if (coupon.status !== 'active') {
        throw new Error('This coupon is not currently active');
      }

      const now = new Date();
      if (now < new Date(coupon.valid_from) || now > new Date(coupon.valid_until)) {
        throw new Error('This coupon is not valid at this time');
      }

      // Check if user already collected this coupon
      const { data: existing, error: existingError } = await supabase
        .from('user_coupon_collections')
        .select('id')
        .eq('user_id', userId)
        .eq('coupon_id', couponId)
        .eq('status', 'active')
        .maybeSingle();

      if (existingError) throw existingError;
      
      if (existing) {
        throw new Error('You have already collected this coupon');
      }

      // Create collection record
      const { error } = await supabase
        .from('user_coupon_collections')
        .insert([{
          user_id: userId,
          coupon_id: couponId,
          collected_from: source,
          collected_at: new Date().toISOString(),
          expires_at: coupon.valid_until,
          status: 'active',
          times_used: 0
        }]);

      if (error) throw error;

      // Update collection count and analytics
      await this.updateAnalyticsAfterCollection(couponId);

      // Invalidate cache
      this.cache.invalidate(`user_coupons_${userId}`);
      this.cache.invalidate(`analytics_${couponId}`);

      return true;
    } catch (error) {
      console.error('Error collecting coupon:', error);
      throw new Error(`Failed to collect coupon: ${error.message}`);
    }
  }

  // ==================== QR CODE OPERATIONS ====================

  /**
   * Generate QR code data for a coupon
   */
  async generateQRCodeData(couponId: string): Promise<QRCodeData> {
    const coupon = await this.fetchCoupon(couponId, false);
    if (!coupon) throw new Error('Coupon not found');

    return {
      coupon_id: couponId,
      coupon_code: coupon.coupon_code,
      business_id: coupon.business_id,
      generated_at: new Date().toISOString(),
      expires_at: coupon.valid_until
    };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Generate a unique coupon code
   */
  async generateUniqueCouponCode(type: CouponType): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = this.generateCouponCode(type);
      
      // Check if code already exists
      const { data } = await supabase
        .from('business_coupons')
        .select('id')
        .eq('coupon_code', code)
        .maybeSingle();

      if (!data) return code;
      
      attempts++;
    }

    throw new Error('Failed to generate unique coupon code');
  }

  /**
   * Generate coupon code with prefix
   */
  private generateCouponCode(type: CouponType): string {
    const prefix = COUPON_CODE_PREFIX[type.toUpperCase()] || 'CPN';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Generate transaction reference
   */
  private generateTransactionReference(): string {
    return `TXN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  /**
   * Apply filters to query
   */
  private applyFilters(query: any, filters: CouponFilters): any {
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    
    if (filters.type && filters.type.length > 0) {
      query = query.in('type', filters.type);
    }
    
    if (filters.search_query) {
      query = query.or(`title.ilike.%${filters.search_query}%,description.ilike.%${filters.search_query}%`);
    }
    
    if (filters.date_range) {
      query = query
        .gte('valid_from', filters.date_range.start)
        .lte('valid_until', filters.date_range.end);
    }

    // Apply sorting
    if (filters.sort_by) {
      const sortOrder = filters.sort_order || 'desc';
      query = query.order(filters.sort_by, { ascending: sortOrder === 'asc' });
    }

    return query;
  }

  /**
   * Validate business ownership
   */
  private async validateBusinessOwnership(businessId: string, userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('businesses')
      .select('user_id')
      .eq('id', businessId)
      .single();

    if (error) throw new Error('Business not found');
    if (data.user_id !== userId) throw new Error('Access denied: Not business owner');
  }

  /**
   * Validate coupon limits
   */
  private async validateCouponLimits(businessId: string): Promise<void> {
    const { data, error } = await supabase
      .from('business_coupons')
      .select('id')
      .eq('business_id', businessId);

    if (error) throw error;

    if (data && data.length >= COUPON_LIMITS.MAX_COUPONS_PER_BUSINESS) {
      throw new Error(`Maximum ${COUPON_LIMITS.MAX_COUPONS_PER_BUSINESS} coupons allowed per business`);
    }
  }

  /**
   * Validate coupon form data
   */
  private validateCouponData(data: Partial<CouponFormData>): void {
    if (data.title && (data.title.length < 5 || data.title.length > COUPON_LIMITS.MAX_TITLE_LENGTH)) {
      throw new Error(`Title must be 5-${COUPON_LIMITS.MAX_TITLE_LENGTH} characters`);
    }

    if (data.description && (data.description.length < 10 || data.description.length > COUPON_LIMITS.MAX_DESCRIPTION_LENGTH)) {
      throw new Error(`Description must be 10-${COUPON_LIMITS.MAX_DESCRIPTION_LENGTH} characters`);
    }

    if (data.discount_value !== undefined && data.discount_value <= 0) {
      throw new Error('Discount value must be greater than 0');
    }

    if (data.type === 'percentage' && data.discount_value && data.discount_value > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    if (data.valid_from && data.valid_until) {
      const startDate = new Date(data.valid_from);
      const endDate = new Date(data.valid_until);
      
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
    }
  }

  /**
   * Initialize analytics record for new coupon
   */
  private async initializeCouponAnalytics(couponId: string): Promise<CouponAnalytics> {
    const defaultAnalytics: Omit<CouponAnalytics, 'id'> = {
      coupon_id: couponId,
      total_collections: 0,
      unique_collectors: 0,
      collection_rate: 0,
      total_redemptions: 0,
      unique_redeemers: 0,
      redemption_rate: 0,
      total_discount_given: 0,
      average_discount_per_redemption: 0,
      estimated_revenue_generated: 0,
      daily_stats: [],
      top_user_segments: [],
      top_collection_sources: [],
      conversion_funnel: {
        views: 0,
        collections: 0,
        redemptions: 0,
        view_to_collection_rate: 0,
        collection_to_redemption_rate: 0,
        overall_conversion_rate: 0
      },
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('coupon_analytics')
      .upsert([defaultAnalytics])
      .select()
      .single();

    if (error) {
      console.error('Error initializing analytics:', error);
      return defaultAnalytics as CouponAnalytics;
    }

    return data;
  }

  /**
   * Update analytics after redemption
   */
  private async updateAnalyticsAfterRedemption(couponId: string, discountAmount: number): Promise<void> {
    try {
      await supabase.rpc('update_coupon_analytics_redemption', {
        coupon_id_param: couponId,
        discount_amount_param: discountAmount
      });
      
      // Invalidate analytics cache
      this.cache.invalidate(`analytics_${couponId}`);
    } catch (error) {
      console.error('Error updating analytics after redemption:', error);
    }
  }

  /**
   * Update analytics after collection
   */
  private async updateAnalyticsAfterCollection(couponId: string): Promise<void> {
    try {
      await supabase.rpc('update_coupon_analytics_collection', {
        coupon_id_param: couponId
      });
      
      // Invalidate analytics cache
      this.cache.invalidate(`analytics_${couponId}`);
    } catch (error) {
      console.error('Error updating analytics after collection:', error);
    }
  }

  /**
   * Delete coupon analytics
   */
  private async deleteCouponAnalytics(couponId: string): Promise<void> {
    try {
      await supabase
        .from('coupon_analytics')
        .delete()
        .eq('coupon_id', couponId);
    } catch (error) {
      console.error('Error deleting coupon analytics:', error);
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to coupon changes
   */
  subscribeToChanges(key: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(key);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  /**
   * Notify subscribers of changes
   */
  private notifySubscribers(key: string, data: any): void {
    const subscribers = this.subscribers.get(key);
    if (subscribers) {
      subscribers.forEach(callback => callback(data));
    }
  }

  // ==================== CLEANUP ====================

  /**
   * Clear all caches and subscriptions
   */
  cleanup(): void {
    this.cache.clear();
    this.subscribers.clear();
  }
}

// Export singleton instance
export const couponService = new CouponService();
export default couponService;