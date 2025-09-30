import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { couponService } from '../couponService';
import { supabase } from '../../lib/supabase';
import type { 
  Coupon, 
  CouponFormData, 
  CouponFilters,
  RedemptionRequest 
} from '../../types/coupon';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('CouponService', () => {
  // Mock data
  const mockBusinessId = 'business-123';
  const mockUserId = 'user-123';
  const mockCouponId = 'coupon-123';
  
  const mockCoupon: Coupon = {
    id: mockCouponId,
    business_id: mockBusinessId,
    title: 'Test Coupon',
    description: 'Test description for the coupon',
    discount_value: 20,
    discount_type: 'percentage',
    type: 'discount',
    coupon_code: 'DISC123456ABC',
    status: 'active',
    usage_count: 0,
    collection_count: 0,
    max_redemptions: 100,
    valid_from: '2025-01-01T00:00:00Z',
    valid_until: '2025-12-31T23:59:59Z',
    created_by: mockUserId,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    businesses: {
      business_name: 'Test Business',
      user_id: mockUserId
    }
  };

  const mockCouponFormData: CouponFormData = {
    title: 'New Test Coupon',
    description: 'This is a test coupon description',
    discount_value: 15,
    discount_type: 'percentage',
    type: 'discount',
    valid_from: '2025-02-01T00:00:00Z',
    valid_until: '2025-12-31T23:59:59Z',
    max_redemptions: 50,
    min_purchase_amount: 100,
    terms_conditions: 'Valid for one use only'
  };

  const mockAnalytics = {
    id: 'analytics-123',
    coupon_id: mockCouponId,
    total_collections: 10,
    unique_collectors: 8,
    collection_rate: 0.8,
    total_redemptions: 5,
    unique_redeemers: 5,
    redemption_rate: 0.5,
    total_discount_given: 100,
    average_discount_per_redemption: 20,
    estimated_revenue_generated: 500,
    daily_stats: [],
    top_user_segments: [],
    top_collection_sources: [],
    conversion_funnel: {
      views: 100,
      collections: 10,
      redemptions: 5,
      view_to_collection_rate: 0.1,
      collection_to_redemption_rate: 0.5,
      overall_conversion_rate: 0.05
    },
    updated_at: '2025-01-15T00:00:00Z'
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Clear the cache
    couponService.cleanup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== FETCH OPERATIONS ====================

  describe('fetchCoupons', () => {
    it('should fetch coupons successfully without filters', async () => {
      const mockData = [mockCoupon];
      
      const orderMock2 = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const orderMock1 = vi.fn().mockReturnValue({ order: orderMock2 });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock1 });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      
      (supabase.from as any).mockReturnValue({
        select: selectMock
      });

      const result = await couponService.fetchCoupons(mockBusinessId);

      expect(supabase.from).toHaveBeenCalledWith('business_coupons');
      expect(result).toEqual(mockData);
    });

    it('should use cached data when useCache is true', async () => {
      const mockData = [mockCoupon];
      
      const orderMock2 = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const orderMock1 = vi.fn().mockReturnValue({ order: orderMock2 });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock1 });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      
      (supabase.from as any).mockReturnValue({
        select: selectMock
      });

      // First call - should hit database
      await couponService.fetchCoupons(mockBusinessId, undefined, true);
      
      // Second call - should use cache
      await couponService.fetchCoupons(mockBusinessId, undefined, true);

      // Should only call database once
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });

    it('should apply filters correctly', async () => {
      const filters: CouponFilters = {
        status: ['active'],
        type: ['discount'],
        search_query: 'test'
      };

      const mockData = [mockCoupon];
      // Since no sort_by is provided, default sorting will apply  
      const orderMock2 = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const orderMock1 = vi.fn().mockReturnValue({ order: orderMock2 });
      const orMock = vi.fn().mockReturnValue({ order: orderMock1 });
      // Create inMock with a placeholder, then update it
      const inMockReturnValue: any = { or: orMock };
      const inMock = vi.fn().mockReturnValue(inMockReturnValue);
      inMockReturnValue.in = inMock; // Now add the self-reference
      const eqMock = vi.fn().mockReturnValue({ in: inMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      
      (supabase.from as any).mockReturnValue({
        select: selectMock
      });

      await couponService.fetchCoupons(mockBusinessId, filters, false);

      expect(inMock).toHaveBeenCalledWith('status', ['active']);
      expect(inMock).toHaveBeenCalledWith('type', ['discount']);
    });

    it('should throw error when fetch fails', async () => {
      const mockError = new Error('Database error');
      
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const orderMock = vi.fn().mockResolvedValue({ data: null, error: mockError });
      
      (supabase.from as any).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock
      });

      selectMock.mockReturnValue({ eq: eqMock });
      eqMock.mockReturnValue({ order: orderMock });

      await expect(couponService.fetchCoupons(mockBusinessId))
        .rejects.toThrow('Failed to fetch coupons');
    });
  });

  describe('fetchCoupon', () => {
    it('should fetch a single coupon successfully', async () => {
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockCoupon, error: null });
      
      (supabase.from as any).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock });
      eqMock.mockReturnValue({ single: singleMock });

      const result = await couponService.fetchCoupon(mockCouponId);

      expect(result).toEqual(mockCoupon);
      expect(supabase.from).toHaveBeenCalledWith('business_coupons');
    });

    it('should return null when coupon not found', async () => {
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Not found' } 
      });
      
      (supabase.from as any).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock });
      eqMock.mockReturnValue({ single: singleMock });

      const result = await couponService.fetchCoupon(mockCouponId);

      expect(result).toBeNull();
    });
  });

  // ==================== CREATE OPERATIONS ====================

  describe('createCoupon', () => {
    it('should create a coupon successfully', async () => {
      // Mock business ownership validation
      const businessSelectMock = vi.fn().mockReturnThis();
      const businessEqMock = vi.fn().mockReturnThis();
      const businessSingleMock = vi.fn().mockResolvedValue({ 
        data: { user_id: mockUserId }, 
        error: null 
      });

      // Mock coupon count check
      const countSelectMock = vi.fn().mockReturnThis();
      const countEqMock = vi.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      });

      // Mock coupon code uniqueness check
      const codeSelectMock = vi.fn().mockReturnThis();
      const codeEqMock = vi.fn().mockReturnThis();
      const codeMaybeSingleMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      // Mock coupon insert
      const insertMock = vi.fn().mockReturnThis();
      const insertSelectMock = vi.fn().mockReturnThis();
      const insertSingleMock = vi.fn().mockResolvedValue({ 
        data: mockCoupon, 
        error: null 
      });

      // Mock analytics upsert
      const analyticsInsertMock = vi.fn().mockReturnThis();
      const analyticsSelectMock = vi.fn().mockReturnThis();
      const analyticsSingleMock = vi.fn().mockResolvedValue({ 
        data: mockAnalytics, 
        error: null 
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'businesses') {
          businessSelectMock.mockReturnValue({ 
            eq: businessEqMock 
          });
          businessEqMock.mockReturnValue({ 
            single: businessSingleMock 
          });
          return { select: businessSelectMock };
        }
        if (table === 'business_coupons') {
          // For count check
          countSelectMock.mockReturnValue({ 
            eq: countEqMock 
          });
          // For code uniqueness
          codeSelectMock.mockReturnValue({ 
            eq: codeEqMock 
          });
          codeEqMock.mockReturnValue({ 
            maybeSingle: codeMaybeSingleMock 
          });
          // For insert
          insertMock.mockReturnValue({ 
            select: insertSelectMock 
          });
          insertSelectMock.mockReturnValue({ 
            single: insertSingleMock 
          });
          
          return { 
            select: vi.fn().mockImplementation((fields) => {
              if (fields === 'id') {
                return { eq: vi.fn().mockImplementation((field, val) => {
                  if (field === 'business_id') return countEqMock;
                  if (field === 'coupon_code') {
                    return { maybeSingle: codeMaybeSingleMock };
                  }
                })};
              }
              return countSelectMock;
            }),
            insert: insertMock 
          };
        }
        if (table === 'coupon_analytics') {
          analyticsInsertMock.mockReturnValue({ 
            select: analyticsSelectMock 
          });
          analyticsSelectMock.mockReturnValue({ 
            single: analyticsSingleMock 
          });
          return { upsert: analyticsInsertMock };
        }
      });

      const result = await couponService.createCoupon(
        mockCouponFormData, 
        mockBusinessId, 
        mockUserId
      );

      expect(result).toEqual(mockCoupon);
    });

    it('should throw error if user is not business owner', async () => {
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ 
        data: { user_id: 'different-user' }, 
        error: null 
      });

      (supabase.from as any).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock });
      eqMock.mockReturnValue({ single: singleMock });

      await expect(couponService.createCoupon(
        mockCouponFormData, 
        mockBusinessId, 
        mockUserId
      )).rejects.toThrow('Access denied');
    });

    it('should throw error if coupon limit exceeded', async () => {
      // Mock business ownership - valid
      const businessSelectMock = vi.fn().mockReturnThis();
      const businessEqMock = vi.fn().mockReturnThis();
      const businessSingleMock = vi.fn().mockResolvedValue({ 
        data: { user_id: mockUserId }, 
        error: null 
      });

      // Mock coupon count - at limit
      const countSelectMock = vi.fn().mockReturnThis();
      const countEqMock = vi.fn().mockResolvedValue({ 
        data: new Array(50).fill({}), // Assuming limit is 50
        error: null 
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'businesses') {
          businessSelectMock.mockReturnValue({ eq: businessEqMock });
          businessEqMock.mockReturnValue({ single: businessSingleMock });
          return { select: businessSelectMock };
        }
        if (table === 'business_coupons') {
          countSelectMock.mockReturnValue({ eq: countEqMock });
          return { select: countSelectMock };
        }
      });

      await expect(couponService.createCoupon(
        mockCouponFormData, 
        mockBusinessId, 
        mockUserId
      )).rejects.toThrow('Maximum');
    });

    it('should validate coupon data', async () => {
      const invalidData = {
        ...mockCouponFormData,
        title: 'abc', // Too short
        discount_value: -10 // Invalid
      };

      await expect(couponService.createCoupon(
        invalidData, 
        mockBusinessId, 
        mockUserId
      )).rejects.toThrow();
    });
  });

  // ==================== UPDATE OPERATIONS ====================

  describe('updateCoupon', () => {
    it('should update a coupon successfully', async () => {
      // Mock fetchCoupon
      const fetchSelectMock = vi.fn().mockReturnThis();
      const fetchEqMock = vi.fn().mockReturnThis();
      const fetchSingleMock = vi.fn().mockResolvedValue({ 
        data: mockCoupon, 
        error: null 
      });

      // Mock business ownership
      const businessSelectMock = vi.fn().mockReturnThis();
      const businessEqMock = vi.fn().mockReturnThis();
      const businessSingleMock = vi.fn().mockResolvedValue({ 
        data: { user_id: mockUserId }, 
        error: null 
      });

      // Mock update
      const updateMock = vi.fn().mockReturnThis();
      const updateEqMock = vi.fn().mockReturnThis();
      const updateSelectMock = vi.fn().mockReturnThis();
      const updateSingleMock = vi.fn().mockResolvedValue({ 
        data: { ...mockCoupon, title: 'Updated Title' }, 
        error: null 
      });

      let callCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'business_coupons') {
          callCount++;
          if (callCount === 1) {
            // First call - fetch
            fetchSelectMock.mockReturnValue({ eq: fetchEqMock });
            fetchEqMock.mockReturnValue({ single: fetchSingleMock });
            return { select: fetchSelectMock };
          } else {
            // Second call - update
            updateMock.mockReturnValue({ eq: updateEqMock });
            updateEqMock.mockReturnValue({ select: updateSelectMock });
            updateSelectMock.mockReturnValue({ single: updateSingleMock });
            return { update: updateMock };
          }
        }
        if (table === 'businesses') {
          businessSelectMock.mockReturnValue({ eq: businessEqMock });
          businessEqMock.mockReturnValue({ single: businessSingleMock });
          return { select: businessSelectMock };
        }
      });

      const updates = { title: 'Updated Title' };
      const result = await couponService.updateCoupon(mockCouponId, updates, mockUserId);

      expect(result.title).toBe('Updated Title');
    });

    it('should throw error if coupon not found', async () => {
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Not found' } 
      });

      (supabase.from as any).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock });
      eqMock.mockReturnValue({ single: singleMock });

      await expect(couponService.updateCoupon(
        mockCouponId, 
        { title: 'New Title' }, 
        mockUserId
      )).rejects.toThrow('Coupon not found');
    });
  });

  // ==================== DELETE OPERATIONS ====================

  describe('deleteCoupon', () => {
    it('should soft delete coupon if it has been used', async () => {
      const usedCoupon = { ...mockCoupon, usage_count: 5 };

      let callCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'business_coupons') {
          callCount++;
          if (callCount === 1 || callCount === 2) {
            // First two calls - fetch coupon
            const fetchSingleMock = vi.fn().mockResolvedValue({ data: usedCoupon, error: null });
            const fetchEqMock = vi.fn().mockReturnValue({ single: fetchSingleMock });
            const fetchSelectMock = vi.fn().mockReturnValue({ eq: fetchEqMock });
            return { select: fetchSelectMock };
          } else {
            // Third call - update
            const updateSingleMock = vi.fn().mockResolvedValue({ 
              data: { ...usedCoupon, status: 'cancelled' }, 
              error: null 
            });
            const updateSelectMock = vi.fn().mockReturnValue({ single: updateSingleMock });
            const updateEqMock = vi.fn().mockReturnValue({ select: updateSelectMock });
            const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
            return { update: updateMock };
          }
        }
        if (table === 'businesses') {
          const businessSingleMock = vi.fn().mockResolvedValue({ data: { user_id: mockUserId }, error: null });
          const businessEqMock = vi.fn().mockReturnValue({ single: businessSingleMock });
          const businessSelectMock = vi.fn().mockReturnValue({ eq: businessEqMock });
          return { select: businessSelectMock };
        }
      });

      const result = await couponService.deleteCoupon(mockCouponId, mockUserId);

      expect(result).toBe(true);
    });

    it('should hard delete coupon if it has not been used', async () => {
      // Mock fetch
      const fetchSelectMock = vi.fn().mockReturnThis();
      const fetchEqMock = vi.fn().mockReturnThis();
      const fetchSingleMock = vi.fn().mockResolvedValue({ 
        data: mockCoupon, 
        error: null 
      });

      // Mock business ownership
      const businessSelectMock = vi.fn().mockReturnThis();
      const businessEqMock = vi.fn().mockReturnThis();
      const businessSingleMock = vi.fn().mockResolvedValue({ 
        data: { user_id: mockUserId }, 
        error: null 
      });

      // Mock delete
      const deleteMock = vi.fn().mockReturnThis();
      const deleteEqMock = vi.fn().mockResolvedValue({ error: null });

      // Mock analytics delete
      const analyticsDeleteMock = vi.fn().mockReturnThis();
      const analyticsEqMock = vi.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'business_coupons') {
          callCount++;
          if (callCount === 1) {
            fetchSelectMock.mockReturnValue({ eq: fetchEqMock });
            fetchEqMock.mockReturnValue({ single: fetchSingleMock });
            return { select: fetchSelectMock };
          } else {
            deleteMock.mockReturnValue({ eq: deleteEqMock });
            return { delete: deleteMock };
          }
        }
        if (table === 'businesses') {
          businessSelectMock.mockReturnValue({ eq: businessEqMock });
          businessEqMock.mockReturnValue({ single: businessSingleMock });
          return { select: businessSelectMock };
        }
        if (table === 'coupon_analytics') {
          analyticsDeleteMock.mockReturnValue({ eq: analyticsEqMock });
          return { delete: analyticsDeleteMock };
        }
      });

      const result = await couponService.deleteCoupon(mockCouponId, mockUserId);

      expect(result).toBe(true);
    });
  });

  // ==================== ANALYTICS OPERATIONS ====================

  describe('fetchCouponAnalytics', () => {
    it('should fetch analytics successfully', async () => {
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ 
        data: mockAnalytics, 
        error: null 
      });

      (supabase.from as any).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock });
      eqMock.mockReturnValue({ single: singleMock });

      const result = await couponService.fetchCouponAnalytics(mockCouponId);

      expect(result).toEqual(mockAnalytics);
    });

    it('should initialize analytics if not found', async () => {
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      });

      const upsertMock = vi.fn().mockReturnThis();
      const upsertSelectMock = vi.fn().mockReturnThis();
      const upsertSingleMock = vi.fn().mockResolvedValue({ 
        data: mockAnalytics, 
        error: null 
      });

      let callCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'coupon_analytics') {
          callCount++;
          if (callCount === 1) {
            selectMock.mockReturnValue({ eq: eqMock });
            eqMock.mockReturnValue({ single: singleMock });
            return { select: selectMock };
          } else {
            upsertMock.mockReturnValue({ select: upsertSelectMock });
            upsertSelectMock.mockReturnValue({ single: upsertSingleMock });
            return { upsert: upsertMock };
          }
        }
      });

      const result = await couponService.fetchCouponAnalytics(mockCouponId);

      expect(result).toBeTruthy();
    });
  });

  describe('fetchBusinessAnalytics', () => {
    it('should aggregate analytics for all business coupons', async () => {
      const mockCoupons = [mockCoupon, { ...mockCoupon, id: 'coupon-456' }];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'business_coupons') {
          const couponsOrderMock2 = vi.fn().mockResolvedValue({ data: mockCoupons, error: null });
          const couponsOrderMock1 = vi.fn().mockReturnValue({ order: couponsOrderMock2 });
          const couponsEqMock = vi.fn().mockReturnValue({ order: couponsOrderMock1 });
          const couponsSelectMock = vi.fn().mockReturnValue({ eq: couponsEqMock });
          return { select: couponsSelectMock };
        }
        if (table === 'coupon_analytics') {
          const analyticsSingleMock = vi.fn().mockResolvedValue({ data: mockAnalytics, error: null });
          const analyticsEqMock = vi.fn().mockReturnValue({ single: analyticsSingleMock });
          const analyticsSelectMock = vi.fn().mockReturnValue({ eq: analyticsEqMock });
          return { select: analyticsSelectMock };
        }
      });

      const result = await couponService.fetchBusinessAnalytics(mockBusinessId);

      expect(result.totalCoupons).toBe(2);
      expect(result.activeCoupons).toBe(2);
      expect(result.topPerformingCoupons).toBeDefined();
    });
  });

  // ==================== REDEMPTION OPERATIONS ====================

  describe('validateCouponRedemption', () => {
    it('should validate coupon redemption successfully', async () => {
      const mockValidationResponse = {
        valid: true,
        coupon_id: mockCouponId,
        discount_amount: 20,
        final_amount: 80
      };

      const rpcMock = vi.fn().mockResolvedValue({ 
        data: mockValidationResponse, 
        error: null 
      });

      (supabase.rpc as any) = rpcMock;

      // Mock fetchCoupon for the success case
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ 
        data: mockCoupon, 
        error: null 
      });

      (supabase.from as any).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock });
      eqMock.mockReturnValue({ single: singleMock });

      const result = await couponService.validateCouponRedemption(
        'DISC123456ABC',
        mockUserId,
        100
      );

      expect(result.success).toBe(true);
      expect(result.discount_applied).toBe(20);
      expect(result.final_amount).toBe(80);
    });

    it('should return error for invalid coupon', async () => {
      const mockValidationResponse = {
        valid: false,
        error: 'Coupon has expired'
      };

      const rpcMock = vi.fn().mockResolvedValue({ 
        data: mockValidationResponse, 
        error: null 
      });

      (supabase.rpc as any) = rpcMock;

      const result = await couponService.validateCouponRedemption(
        'INVALID',
        mockUserId,
        100
      );

      expect(result.success).toBe(false);
      expect(result.error_message).toBe('Coupon has expired');
    });
  });

  describe('redeemCoupon', () => {
    it('should redeem coupon successfully', async () => {
      const mockRequest: RedemptionRequest = {
        coupon_code: 'DISC123456ABC',
        original_amount: 100,
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      };

      // Mock validation
      const mockValidationResponse = {
        valid: true,
        coupon_id: mockCouponId,
        discount_amount: 20,
        final_amount: 80
      };

      const rpcMock = vi.fn().mockResolvedValue({ 
        data: mockValidationResponse, 
        error: null 
      });

      (supabase.rpc as any) = rpcMock;

      // Mock fetchCoupon
      const fetchSelectMock = vi.fn().mockReturnThis();
      const fetchEqMock = vi.fn().mockReturnThis();
      const fetchSingleMock = vi.fn().mockResolvedValue({ 
        data: mockCoupon, 
        error: null 
      });

      // Mock redemption insert
      const insertMock = vi.fn().mockReturnThis();
      const insertSelectMock = vi.fn().mockReturnThis();
      const insertSingleMock = vi.fn().mockResolvedValue({ 
        data: { id: 'redemption-123' }, 
        error: null 
      });

      let callCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'business_coupons') {
          fetchSelectMock.mockReturnValue({ eq: fetchEqMock });
          fetchEqMock.mockReturnValue({ single: fetchSingleMock });
          return { select: fetchSelectMock };
        }
        if (table === 'coupon_redemptions') {
          insertMock.mockReturnValue({ select: insertSelectMock });
          insertSelectMock.mockReturnValue({ single: insertSingleMock });
          return { insert: insertMock };
        }
      });

      const result = await couponService.redeemCoupon(mockRequest, mockUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe('redemption-123');
    });
  });

  // ==================== USER COUPON COLLECTION ====================

  describe('collectCoupon', () => {
    it('should collect coupon successfully', async () => {
      // Mock fetchCoupon
      const fetchSelectMock = vi.fn().mockReturnThis();
      const fetchEqMock = vi.fn().mockReturnThis();
      const fetchSingleMock = vi.fn().mockResolvedValue({ 
        data: mockCoupon, 
        error: null 
      });

      // Mock existing collection check
      const checkSelectMock = vi.fn().mockReturnThis();
      const checkEqMock = vi.fn().mockReturnThis();
      const checkMaybeSingleMock = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      // Mock insert
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      let callCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'business_coupons') {
          fetchSelectMock.mockReturnValue({ eq: fetchEqMock });
          fetchEqMock.mockReturnValue({ single: fetchSingleMock });
          return { select: fetchSelectMock };
        }
        if (table === 'user_coupon_collections') {
          callCount++;
          if (callCount === 1) {
            checkSelectMock.mockReturnValue({ eq: checkEqMock });
            checkEqMock.mockReturnValue({ 
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: checkMaybeSingleMock
                })
              })
            });
            return { select: checkSelectMock };
          } else {
            return { insert: insertMock };
          }
        }
      });

      // Mock RPC for analytics update
      (supabase.rpc as any) = vi.fn().mockResolvedValue({ error: null });

      const result = await couponService.collectCoupon(mockCouponId, mockUserId);

      expect(result).toBe(true);
    });

    it('should throw error if coupon already collected', async () => {
      // Mock fetchCoupon
      const fetchSelectMock = vi.fn().mockReturnThis();
      const fetchEqMock = vi.fn().mockReturnThis();
      const fetchSingleMock = vi.fn().mockResolvedValue({ 
        data: mockCoupon, 
        error: null 
      });

      // Mock existing collection check - already exists
      const checkSelectMock = vi.fn().mockReturnThis();
      const checkEqMock = vi.fn().mockReturnThis();
      const checkMaybeSingleMock = vi.fn().mockResolvedValue({ 
        data: { id: 'existing-collection' }, 
        error: null 
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'business_coupons') {
          fetchSelectMock.mockReturnValue({ eq: fetchEqMock });
          fetchEqMock.mockReturnValue({ single: fetchSingleMock });
          return { select: fetchSelectMock };
        }
        if (table === 'user_coupon_collections') {
          checkSelectMock.mockReturnValue({ eq: checkEqMock });
          checkEqMock.mockReturnValue({ 
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: checkMaybeSingleMock
              })
            })
          });
          return { select: checkSelectMock };
        }
      });

      await expect(couponService.collectCoupon(mockCouponId, mockUserId))
        .rejects.toThrow('already collected');
    });

    it('should throw error if coupon is not active', async () => {
      const inactiveCoupon = { ...mockCoupon, status: 'paused' as const };

      const fetchSelectMock = vi.fn().mockReturnThis();
      const fetchEqMock = vi.fn().mockReturnThis();
      const fetchSingleMock = vi.fn().mockResolvedValue({ 
        data: inactiveCoupon, 
        error: null 
      });

      (supabase.from as any).mockReturnValue({
        select: fetchSelectMock,
        eq: fetchEqMock,
        single: fetchSingleMock
      });

      fetchSelectMock.mockReturnValue({ eq: fetchEqMock });
      fetchEqMock.mockReturnValue({ single: fetchSingleMock });

      await expect(couponService.collectCoupon(mockCouponId, mockUserId))
        .rejects.toThrow('not currently active');
    });
  });

  // ==================== TOGGLE STATUS ====================

  describe('toggleCouponStatus', () => {
    it('should toggle status from active to paused', async () => {
      // Mock fetchCoupon
      const fetchSelectMock = vi.fn().mockReturnThis();
      const fetchEqMock = vi.fn().mockReturnThis();
      const fetchSingleMock = vi.fn().mockResolvedValue({ 
        data: mockCoupon, 
        error: null 
      });

      // Mock business ownership
      const businessSelectMock = vi.fn().mockReturnThis();
      const businessEqMock = vi.fn().mockReturnThis();
      const businessSingleMock = vi.fn().mockResolvedValue({ 
        data: { user_id: mockUserId }, 
        error: null 
      });

      // Mock update
      const updateMock = vi.fn().mockReturnThis();
      const updateEqMock = vi.fn().mockReturnThis();
      const updateSelectMock = vi.fn().mockReturnThis();
      const updateSingleMock = vi.fn().mockResolvedValue({ 
        data: { ...mockCoupon, status: 'paused' }, 
        error: null 
      });

      let callCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'business_coupons') {
          callCount++;
          if (callCount === 1 || callCount === 2) {
            fetchSelectMock.mockReturnValue({ eq: fetchEqMock });
            fetchEqMock.mockReturnValue({ single: fetchSingleMock });
            return { select: fetchSelectMock };
          } else {
            updateMock.mockReturnValue({ eq: updateEqMock });
            updateEqMock.mockReturnValue({ select: updateSelectMock });
            updateSelectMock.mockReturnValue({ single: updateSingleMock });
            return { update: updateMock };
          }
        }
        if (table === 'businesses') {
          businessSelectMock.mockReturnValue({ eq: businessEqMock });
          businessEqMock.mockReturnValue({ single: businessSingleMock });
          return { select: businessSelectMock };
        }
      });

      const result = await couponService.toggleCouponStatus(mockCouponId, mockUserId);

      expect(result.status).toBe('paused');
    });
  });

  // ==================== QR CODE GENERATION ====================

  describe('generateQRCodeData', () => {
    it('should generate QR code data successfully', async () => {
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ 
        data: mockCoupon, 
        error: null 
      });

      (supabase.from as any).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      selectMock.mockReturnValue({ eq: eqMock });
      eqMock.mockReturnValue({ single: singleMock });

      const result = await couponService.generateQRCodeData(mockCouponId);

      expect(result.coupon_id).toBe(mockCouponId);
      expect(result.coupon_code).toBe(mockCoupon.coupon_code);
      expect(result.business_id).toBe(mockBusinessId);
    });
  });

  // ==================== CACHE MANAGEMENT ====================

  describe('cache management', () => {
    it('should clear cache on cleanup', async () => {
      const mockData = [mockCoupon];
      
      const orderMock2 = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const orderMock1 = vi.fn().mockReturnValue({ order: orderMock2 });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock1 });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      
      (supabase.from as any).mockReturnValue({
        select: selectMock
      });

      // Fetch to populate cache
      await couponService.fetchCoupons(mockBusinessId);
      
      // Clear cache
      couponService.cleanup();
      
      // Fetch again - should hit database
      await couponService.fetchCoupons(mockBusinessId);

      // Should have called database twice
      expect(supabase.from).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  describe('subscriptions', () => {
    it('should subscribe and unsubscribe from changes', () => {
      const callback = vi.fn();
      const key = 'test_key';

      const unsubscribe = couponService.subscribeToChanges(key, callback);

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();

      // Subscription should be removed
    });
  });
});