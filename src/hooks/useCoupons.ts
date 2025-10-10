// useCoupons.ts
// Custom hook for managing coupon-related data and operations
// Following the pattern established in useProducts.ts and useBusiness.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { couponService } from '../services/couponService';
import { toast } from 'react-hot-toast';
import { 
  Coupon, 
  CouponFormData, 
  CouponFilters, 
  CouponAnalytics,
  CouponRedemption,
  UserCouponCollection,
  RedemptionRequest,
  RedemptionResponse,
  COUPON_LIMITS,
  COUPON_CODE_PREFIX 
} from '../types/coupon';

export const useCoupons = (businessId?: string) => {
  const { user } = useAuthStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoadComplete = useRef(false);
  const lastBusinessId = useRef<string | undefined>(undefined);

  // Fetch coupons for a specific business
  const fetchCoupons = async (targetBusinessId?: string, filters?: CouponFilters) => {
    const businessIdToUse = targetBusinessId || businessId;
    if (!businessIdToUse) return [];

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('business_coupons')
        .select(`
          *,
          businesses!inner(business_name, user_id)
        `)
        .eq('business_id', businessIdToUse);

      // Apply filters
      if (filters) {
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
        const sortBy = filters.sort_by || 'created_at';
        const sortOrder = filters.sort_order || 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      } else {
        // Default sort: active first, then by newest
        query = query
          .order('status', { ascending: false })
          .order('created_at', { ascending: false });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setCoupons(data || []);
      return data || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Fetch coupons error:', err);
      setError(message);
      toast.error('Load failed');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch single coupon
  const fetchCoupon = async (couponId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('business_coupons')
        .select(`
          *,
          businesses!inner(business_name, user_id)
        `)
        .eq('id', couponId)
        .single();

      if (fetchError) throw fetchError;

      setCoupon(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Fetch coupon error:', err);
      setError(message);
      toast.error('Load failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Generate unique coupon code - memoized to prevent infinite loops
  const generateCouponCode = useCallback((type: string = 'FIX'): string => {
    const prefix = COUPON_CODE_PREFIX[type.toUpperCase()] || 'CPN';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }, []);

  // Helper function to validate UUID format
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // Create new coupon
  const createCoupon = async (couponData: CouponFormData, targetBusinessId?: string) => {
    const businessIdToUse = targetBusinessId || businessId;
    if (!businessIdToUse) {
      throw new Error('Business ID is required');
    }

    if (!isValidUUID(businessIdToUse)) {
      throw new Error('Invalid business ID format');
    }

    if (!user) {
      throw new Error('You must be logged in to create coupons');
    }
    
    if (!user.id) {
      throw new Error('User ID is missing - please log in again');
    }
    
    if (!isValidUUID(user.id)) {
      throw new Error('Invalid user session - please log out and log in again');
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Validating coupon creation:', {
        businessId: businessIdToUse,
        userId: user.id,
        couponTitle: couponData.title
      });

      // Verify business ownership
      console.log('Verifying business ownership for:', businessIdToUse);
      
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('user_id, business_name')
        .eq('id', businessIdToUse)
        .single();

      if (businessError) {
        console.error('Business verification error:', businessError);
        if (businessError.code === 'PGRST116') {
          throw new Error('Business not found. Please ensure the business exists.');
        }
        throw new Error(`Business verification failed: ${businessError.message}`);
      }
      
      if (!business) {
        throw new Error('Business not found in database');
      }
      
      console.log('Business found:', { id: businessIdToUse, name: business.business_name, owner: business.user_id });
      
      if (business.user_id !== user.id) {
        throw new Error('Permission denied: You can only create coupons for your own businesses');
      }
      
      console.log('Business ownership verified successfully');

      // Check coupon limit
      const { count } = await supabase
        .from('business_coupons')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessIdToUse);
      
      if (count && count >= COUPON_LIMITS.MAX_COUPONS_PER_BUSINESS) {
        throw new Error(`Max ${COUPON_LIMITS.MAX_COUPONS_PER_BUSINESS} coupons per business`);
      }

      // Generate unique coupon code
      const coupon_code = generateCouponCode(couponData.type);

      const insertData = {
        business_id: businessIdToUse,
        title: couponData.title,
        description: couponData.description,
        type: couponData.type,
        discount_type: couponData.type, // Map type to discount_type (required field)
        discount_value: Number(couponData.discount_value) || 0, // Ensure numeric
        min_purchase_amount: couponData.min_purchase_amount ? Number(couponData.min_purchase_amount) : null,
        max_discount_amount: couponData.max_discount_amount ? Number(couponData.max_discount_amount) : null,
        terms_conditions: couponData.terms_conditions,
        total_limit: couponData.total_limit ? Number(couponData.total_limit) : null,
        per_user_limit: Number(couponData.per_user_limit) || 1,
        valid_from: new Date(couponData.valid_from).toISOString(),
        valid_until: new Date(couponData.valid_until).toISOString(),
        target_audience: couponData.target_audience,
        is_public: couponData.is_public ?? true,
        status: 'draft', // Default status
        coupon_code,
        created_by: user.id
      };
      
      console.log('Creating coupon with data:', insertData);

      const { data, error: createError } = await supabase
        .from('business_coupons')
        .insert([insertData])
        .select()
        .single();

      if (createError) {
        console.error('Supabase create error:', createError);
        throw createError;
      }

      // Refresh coupons list
      fetchCoupons(businessIdToUse);
      
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed';
      console.error('Create coupon error:', err);
      setError(message);
      throw err; // Let the component handle the error toast
    } finally {
      setLoading(false);
    }
  };

  // Update coupon
  const updateCoupon = async (couponId: string, updates: Partial<CouponFormData>) => {
    try {
      setLoading(true);
      setError(null);

      // Verify ownership through business
      const { data: couponData, error: couponError } = await supabase
        .from('business_coupons')
        .select(`
          *,
          businesses!inner(user_id)
        `)
        .eq('id', couponId)
        .single();

      if (couponError) throw couponError;
      if (couponData.businesses.user_id !== user?.id) {
        throw new Error('You can only update your own coupons');
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

      const { data, error: updateError } = await supabase
        .from('business_coupons')
        .update(updateData)
        .eq('id', couponId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      setCoupons(prev => prev.map(c => c.id === couponId ? data : c));
      if (coupon?.id === couponId) {
        setCoupon(data);
      }

      toast.success('Coupon updated successfully!');
      return data;
    } catch (err) {
      console.error('Error updating coupon:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to update coupon');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete coupon
  const deleteCoupon = async (couponId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Verify ownership through business
      const { data: couponData, error: couponError } = await supabase
        .from('business_coupons')
        .select(`
          *,
          businesses!inner(user_id)
        `)
        .eq('id', couponId)
        .single();

      if (couponError) throw couponError;
      if (couponData.businesses.user_id !== user?.id) {
        throw new Error('You can only delete your own coupons');
      }

      const { error: deleteError } = await supabase
        .from('business_coupons')
        .delete()
        .eq('id', couponId);

      if (deleteError) throw deleteError;

      // Update local state
      setCoupons(prev => prev.filter(c => c.id !== couponId));
      if (coupon?.id === couponId) {
        setCoupon(null);
      }

      toast.success('Coupon deleted successfully!');
      return true;
    } catch (err) {
      console.error('Error deleting coupon:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to delete coupon');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Toggle coupon status (active/paused)
  const toggleCouponStatus = async (couponId: string) => {
    try {
      const currentCoupon = coupons.find(c => c.id === couponId);
      if (!currentCoupon) return false;

      const newStatus = currentCoupon.status === 'active' ? 'paused' : 'active';
      
      const result = await updateCoupon(couponId, { status: newStatus });
      
      if (result) {
        toast.success(`Coupon ${newStatus === 'active' ? 'activated' : 'paused'}!`);
      }
      
      return !!result;
    } catch (err) {
      console.error('Error toggling coupon status:', err);
      toast.error('Failed to update coupon status');
      return false;
    }
  };

  // Fetch coupon analytics
  const fetchCouponAnalytics = async (couponId: string): Promise<CouponAnalytics | null> => {
    try {
      const { data, error } = await supabase
        .from('coupon_analytics')
        .select('*')
        .eq('coupon_id', couponId)
        .single();

      if (error) {
        // If no analytics record exists, return default values
        if (error.code === 'PGRST116') {
          return {
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
        }
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error fetching coupon analytics:', err);
      return null;
    }
  };

  // Validate coupon for redemption
  const validateCouponRedemption = async (
    couponCode: string, 
    originalAmount: number
  ): Promise<RedemptionResponse> => {
    try {
      if (!user?.id) {
        return {
          success: false,
          error_message: 'User not authenticated',
          error_code: 'AUTH_REQUIRED',
          discount_applied: 0,
          final_amount: originalAmount
        };
      }

      const { data, error } = await supabase.rpc('validate_coupon_redemption', {
        code: couponCode,
        user_id_param: user.id,
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
        coupon: {
          id: data.coupon_id,
          business_id: data.business_id,
          title: data.coupon_title
        } as any // Simplified for validation response
      };
    } catch (err) {
      console.error('Error validating coupon:', err);
      return {
        success: false,
        error_message: 'Failed to validate coupon',
        error_code: 'SYSTEM_ERROR',
        discount_applied: 0,
        final_amount: originalAmount
      };
    }
  };

  // Redeem coupon
  const redeemCoupon = async (request: RedemptionRequest): Promise<CouponRedemption | null> => {
    try {
      if (!user?.id) {
        toast.error('User not authenticated');
        return null;
      }

      // First validate the coupon
      const validation = await validateCouponRedemption(
        request.coupon_code, 
        request.original_amount || 0
      );

      if (!validation.success) {
        toast.error(validation.error_message || 'Coupon validation failed');
        return null;
      }

      // Create redemption record
      const { data, error } = await supabase
        .from('coupon_redemptions')
        .insert([{
          coupon_id: validation.coupon?.id,
          user_id: request.user_id || user.id,
          business_id: validation.coupon?.business_id,
          redemption_code: request.coupon_code,
          redemption_amount: validation.discount_applied,
          original_amount: request.original_amount || 0,
          final_amount: validation.final_amount,
          redeemed_at_latitude: request.location?.latitude,
          redeemed_at_longitude: request.location?.longitude,
          transaction_reference: Math.random().toString(36).substring(2, 15).toUpperCase(),
          notes: request.staff_notes
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success(`Coupon redeemed! You saved ₹${validation.discount_applied}`);
      return data;
    } catch (err) {
      console.error('Error redeeming coupon:', err);
      toast.error('Failed to redeem coupon');
      return null;
    }
  };

  // Load coupons on hook initialization
  useEffect(() => {
    let isCancelled = false;
    
    const loadCoupons = async () => {
      if (businessId && !isCancelled && 
          (!initialLoadComplete.current || lastBusinessId.current !== businessId)) {
        
        lastBusinessId.current = businessId;
        await fetchCoupons(businessId);
        initialLoadComplete.current = true;
      }
    };
    
    loadCoupons();
    
    return () => {
      isCancelled = true;
    };
  }, [businessId]);

  // Refresh coupons manually
  const refreshCoupons = async () => {
    if (businessId) {
      await fetchCoupons(businessId);
    }
  };

  return {
    // State
    coupons,
    coupon,
    loading,
    error,

    // Actions
    fetchCoupons,
    fetchCoupon,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
    fetchCouponAnalytics,
    validateCouponRedemption,
    redeemCoupon,
    refreshCoupons,

    // Utilities
    setCoupons,
    setCoupon,
    setLoading,
    setError,
    generateCouponCode
  };
};

// Hook for fetching user's collected coupons
export const useUserCoupons = () => {
  const { user } = useAuthStore();
  const [userCoupons, setUserCoupons] = useState<UserCouponCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserCoupons = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [fetchUserCoupons] Fetching coupons for user:', user.id);
      
      const { data, error: fetchError } = await supabase
        .from('user_coupon_collections')
        .select(`
          *,
          business_coupons!inner(
            id, title, description, discount_value, discount_type,
            businesses!inner(business_name)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('collected_at', { ascending: false });

      if (fetchError) throw fetchError;

      console.log('✅ [fetchUserCoupons] Fetched', data?.length || 0, 'active coupons');
      setUserCoupons(data || []);
    } catch (err) {
      console.error('❌ [fetchUserCoupons] Error:', err);
      setError(err.message);
      toast.error('Failed to load your coupons');
    } finally {
      setLoading(false);
    }
  };

  const collectCoupon = async (couponId: string, source: string = 'direct_search') => {
    if (!user) {
      toast.error('Please log in to collect coupons');
      return false;
    }

    // Debug: Log user information
    console.log('🔐 [collectCoupon] User from store:', user);
    console.log('🔐 [collectCoupon] User ID:', user.id);

    try {
      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 [collectCoupon] Current session:', session);
      console.log('🔐 [collectCoupon] Session error:', sessionError);
      
      if (!session) {
        console.error('❌ [collectCoupon] No active session!');
        toast.error('Your session has expired. Please log in again.');
        return false;
      }
      
      if (session.user.id !== user.id) {
        console.error('❌ [collectCoupon] User ID mismatch!', {
          storeUserId: user.id,
          sessionUserId: session.user.id
        });
        toast.error('Authentication mismatch. Please log in again.');
        return false;
      }
      
      // Get coupon details first (needed for reactivation logic)
      const { data: couponData, error: couponError } = await supabase
        .from('business_coupons')
        .select('valid_until, status')
        .eq('id', couponId)
        .single();

      if (couponError) {
        console.error('Error fetching coupon details:', couponError);
        toast.error('Could not find coupon details. Please try again.');
        return false;
      }

      // Check if coupon is active
      if (couponData.status !== 'active') {
        toast.error('This coupon is not currently active');
        return false;
      }
      
      // Check if user has ANY collection of this coupon (including removed ones for reactivation)
      console.log('🔍 [collectCoupon] Checking for existing collection - User ID:', user.id, 'Coupon ID:', couponId);
      const { data: existingCollection, error: checkError } = await supabase
        .from('user_coupon_collections')
        .select('id, status, has_been_shared')
        .eq('user_id', user.id)
        .eq('coupon_id', couponId)
        .maybeSingle(); // Include all statuses so we can reactivate removed ones

      if (checkError) {
        console.error('Error checking existing collection:', checkError);
        toast.error('Failed to check coupon status. Please try again.');
        return false;
      }

      console.log('🔍 [collectCoupon] Existing collection check:', existingCollection);

      if (existingCollection) {
        // Check if coupon was shared (prevent re-collection)
        if (existingCollection.has_been_shared) {
          toast.error('This coupon was shared and cannot be collected again');
          return false;
        }
        
        // If it's still active, user already has it
        if (existingCollection.status === 'active') {
          toast.error('You have already collected this coupon');
          return false;
        }
        
        // If it was removed, we can reactivate it
        if (existingCollection.status === 'removed') {
          console.log('🔄 [collectCoupon] Reactivating removed coupon');
          // Update the existing record instead of inserting new one
          const { error: updateError } = await supabase
            .from('user_coupon_collections')
            .update({ 
              status: 'active',
              collected_at: new Date().toISOString(),
              collected_from: source,
              expires_at: couponData.valid_until,
              deleted_at: null // Clear the deleted timestamp
            })
            .eq('id', existingCollection.id);

          if (updateError) {
            console.error('Error reactivating coupon:', updateError);
            toast.error('Failed to collect coupon. Please try again.');
            return false;
          }

          toast.success('Coupon collected successfully!');
          fetchUserCoupons(); // Refresh the list
          return true;
        }
        
        // If it was used/expired but not shared, they can't collect again
        toast.error('You have already used this coupon');
        return false;
      }

      // Insert new collection with status
      const { error: insertError } = await supabase
        .from('user_coupon_collections')
        .insert([{
          user_id: user.id,
          coupon_id: couponId,
          collected_from: source,
          expires_at: couponData.valid_until,
          status: 'active',
          collected_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('Insert error:', insertError);
        // Provide more specific error messages based on error code
        if (insertError.code === '23505') {
          toast.error('You have already collected this coupon');
        } else if (insertError.code === '42501') {
          toast.error('Permission denied. Please log in again.');
        } else if (insertError.message.includes('has_been_shared')) {
          toast.error('Database error: has_been_shared column not found. Please contact support.');
        } else {
          toast.error(`Failed to collect coupon: ${insertError.message}`);
        }
        return false;
      }

      toast.success('Coupon collected successfully!');
      fetchUserCoupons(); // Refresh the list
      return true;
    } catch (err: any) {
      console.error('Error collecting coupon:', err);
      toast.error(err.message || 'An unexpected error occurred');
      return false;
    }
  };

  // Wrapper for couponService.getUserCollectedCoupons
  const getUserCollectedCoupons = async (targetUserId?: string) => {
    const userIdToUse = targetUserId || user?.id;
    if (!userIdToUse) return [];
    
    return await couponService.getUserCollectedCoupons(userIdToUse);
  };

  // Redeem coupon function
  const redeemCoupon = async (couponId: string, targetUserId?: string, targetBusinessId?: string) => {
    const userIdToUse = targetUserId || user?.id;
    if (!userIdToUse) {
      toast.error('User not authenticated');
      return false;
    }

    try {
      // Implementation depends on your redemption logic
      // For now, basic implementation:
      const { error } = await supabase
        .from('coupon_redemptions')
        .insert([{
          user_id: userIdToUse,
          coupon_id: couponId,
          business_id: targetBusinessId,
          redemption_code: Math.random().toString(36).substring(7).toUpperCase(),
          status: 'completed',
          redeemed_at: new Date().toISOString()
        }]);

      if (error) throw error;

      toast.success('Coupon redeemed successfully!');
      return true;
    } catch (err) {
      console.error('Error redeeming coupon:', err);
      toast.error('Failed to redeem coupon');
      return false;
    }
  };

  // Remove coupon from collection (soft delete)
  const removeCouponCollection = async (collectionId: string) => {
    try {
      // Soft delete by updating status instead of hard delete
      console.log('🗑️ [removeCouponCollection] Starting removal - Collection ID:', collectionId);
      
      const { data, error } = await supabase
        .from('user_coupon_collections')
        .update({ 
          status: 'removed',
          deleted_at: new Date().toISOString()
        })
        .eq('id', collectionId)
        .select(); // Return the updated row to confirm update

      if (error) {
        console.error('❌ [removeCouponCollection] Database error:', error);
        throw error;
      }

      console.log('✅ [removeCouponCollection] Database updated successfully:', data);

      // Clear cache if using couponService
      if (user?.id) {
        couponService.cache.invalidate(`user_coupons_${user.id}`);
        console.log('🛠️ [removeCouponCollection] Cache invalidated for user:', user.id);
      }

      // Refresh the coupon list to reflect the deletion
      console.log('🔄 [removeCouponCollection] Refreshing coupon list...');
      await fetchUserCoupons();
      console.log('✅ [removeCouponCollection] Coupon list refreshed');

      toast.success('Coupon removed from wallet');
      return true;
    } catch (err: any) {
      console.error('❌ [removeCouponCollection] Error:', err);
      toast.error(err.message || 'Failed to remove coupon');
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserCoupons();
    }
  }, [user]);

  return {
    userCoupons,
    loading,
    error,
    fetchUserCoupons,
    collectCoupon,
    getUserCollectedCoupons,
    redeemCoupon,
    removeCouponCollection
  };
};

// Hook for fetching public coupons (for browse/search)
export const usePublicCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPublicCoupons = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [fetchPublicCoupons] Fetching all public coupons');
      
      // Fetch all active, public coupons with business information
      const { data, error: fetchError } = await supabase
        .from('business_coupons')
        .select(`
          *,
          businesses!inner(id, business_name, address, phone)
        `)
        .eq('is_public', true)
        .eq('status', 'active')
        .gt('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      console.log('✅ [fetchPublicCoupons] Fetched', data?.length || 0, 'public coupons');
      
      // Debug: Log raw coupon data structure
      if (data && data.length > 0) {
        console.log('📋 [fetchPublicCoupons] Sample raw coupon:', data[0]);
        console.log('📋 [fetchPublicCoupons] Sample business data:', data[0].businesses);
      }
      
      // Map the data to include business_name at the top level for easy access
      const mappedCoupons = (data || []).map(coupon => {
        const mapped = {
          ...coupon,
          business_name: coupon.businesses?.business_name || 'Unknown Business',
          business: coupon.businesses
        };
        console.log('🔄 [fetchPublicCoupons] Mapped coupon:', {
          id: mapped.id,
          title: mapped.title,
          business_name: mapped.business_name,
          business: mapped.business
        });
        return mapped;
      });
      
      setCoupons(mappedCoupons as Coupon[]);
      return mappedCoupons as Coupon[];
    } catch (err) {
      console.error('❌ [fetchPublicCoupons] Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast.error('Failed to load coupons');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    coupons,
    loading,
    error,
    fetchPublicCoupons
  };
};
