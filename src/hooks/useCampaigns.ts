/**
 * useCampaigns Hook
 * Phase 3: React Hooks
 * 
 * Custom hook for campaign CRUD operations and management
 * Provides campaign creation, editing, deletion, analytics, and real-time updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Campaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignAnalytics,
  CampaignStatus,
  AdFormat
} from '../types/campaigns';

// ============================================================================
// TYPES
// ============================================================================

interface CampaignListFilters {
  status?: CampaignStatus[];
  businessId?: string;
  cityId?: string;
  search?: string;
  format?: AdFormat[];
  startDate?: string;
  endDate?: string;
}

interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'start_date' | 'budget' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class CampaignServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'CampaignServiceError';
  }
}

// ============================================================================
// HOOK: useCampaign (Single Campaign)
// ============================================================================

/**
 * Fetch and manage a single campaign
 */
export function useCampaign(campaignId?: string) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    if (!campaignId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (fetchError) throw fetchError;
      setCampaign(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch campaign';
      setError(errorMessage);
      console.error('Error fetching campaign:', err);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  return {
    campaign,
    isLoading,
    error,
    refresh: fetchCampaign
  };
}

// ============================================================================
// HOOK: useCampaignList
// ============================================================================

/**
 * Fetch and manage a list of campaigns with filters and pagination
 */
export function useCampaignList(
  filters: CampaignListFilters = {},
  options: PaginationOptions = {}
) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    page = 1,
    pageSize = 20,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options;

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase.from('campaigns').select('*', { count: 'exact' });

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.businessId) {
        query = query.eq('business_id', filters.businessId);
      }
      if (filters.cityId) {
        query = query.eq('city_id', filters.cityId);
      }
      if (filters.format && filters.format.length > 0) {
        query = query.in('ad_format', filters.format);
      }
      if (filters.startDate) {
        query = query.gte('start_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('end_date', filters.endDate);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;
      setCampaigns(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch campaigns';
      setError(errorMessage);
      console.error('Error fetching campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(filters), page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const hasMore = useMemo(() => {
    return campaigns.length < totalCount;
  }, [campaigns.length, totalCount]);

  return {
    campaigns,
    totalCount,
    isLoading,
    error,
    refresh: fetchCampaigns,
    hasMore
  };
}

// ============================================================================
// HOOK: useCreateCampaign
// ============================================================================

/**
 * Create a new campaign
 */
export function useCreateCampaign() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCampaign = useCallback(async (request: CreateCampaignRequest) => {
    try {
      setIsCreating(true);
      setError(null);

      const { data, error: createError } = await supabase
        .from('campaigns')
        .insert([request])
        .select()
        .single();

      if (createError) throw createError;
      return data as Campaign;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create campaign';
      setError(errorMessage);
      console.error('Error creating campaign:', err);
      throw new CampaignServiceError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    createCampaign,
    isCreating,
    error
  };
}

// ============================================================================
// HOOK: useUpdateCampaign
// ============================================================================

/**
 * Update an existing campaign
 */
export function useUpdateCampaign() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCampaign = useCallback(async (
    campaignId: string,
    updates: UpdateCampaignRequest
  ) => {
    try {
      setIsUpdating(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', campaignId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as Campaign;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update campaign';
      setError(errorMessage);
      console.error('Error updating campaign:', err);
      throw new CampaignServiceError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    updateCampaign,
    isUpdating,
    error
  };
}

// ============================================================================
// HOOK: useDeleteCampaign
// ============================================================================

/**
 * Delete a campaign
 */
export function useDeleteCampaign() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteCampaign = useCallback(async (campaignId: string) => {
    try {
      setIsDeleting(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (deleteError) throw deleteError;
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete campaign';
      setError(errorMessage);
      console.error('Error deleting campaign:', err);
      throw new CampaignServiceError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return {
    deleteCampaign,
    isDeleting,
    error
  };
}

// ============================================================================
// HOOK: useCampaignAnalytics
// ============================================================================

/**
 * Fetch real-time analytics for a campaign
 */
export function useCampaignAnalytics(campaignId?: string) {
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!campaignId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('campaign_analytics')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        // Analytics might not exist yet for new campaigns
        if (fetchError.code === 'PGRST116') {
          setAnalytics(null);
          return;
        }
        throw fetchError;
      }

      setAnalytics(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch campaign analytics';
      setError(errorMessage);
      console.error('Error fetching analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchAnalytics();

    // Refresh analytics every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refresh: fetchAnalytics
  };
}

// ============================================================================
// HOOK: useCampaignStatus
// ============================================================================

/**
 * Manage campaign status changes (pause, resume, complete)
 */
export function useCampaignStatus() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = useCallback(async (
    campaignId: string,
    status: CampaignStatus
  ) => {
    try {
      setIsUpdating(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', campaignId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as Campaign;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update campaign status';
      setError(errorMessage);
      console.error('Error updating status:', err);
      throw new CampaignServiceError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const pauseCampaign = useCallback(
    (campaignId: string) => updateStatus(campaignId, 'paused'),
    [updateStatus]
  );

  const resumeCampaign = useCallback(
    (campaignId: string) => updateStatus(campaignId, 'active'),
    [updateStatus]
  );

  const completeCampaign = useCallback(
    (campaignId: string) => updateStatus(campaignId, 'completed'),
    [updateStatus]
  );

  return {
    updateStatus,
    pauseCampaign,
    resumeCampaign,
    completeCampaign,
    isUpdating,
    error
  };
}

// ============================================================================
// HOOK: useCampaignManager (Combined Hook)
// ============================================================================

/**
 * Combined hook for complete campaign management
 * This is the recommended hook for campaign pages
 */
export function useCampaignManager(campaignId?: string) {
  // Fetch campaign data
  const {
    campaign,
    isLoading: isCampaignLoading,
    error: campaignError,
    refresh: refreshCampaign
  } = useCampaign(campaignId);

  // Fetch analytics
  const {
    analytics,
    isLoading: isAnalyticsLoading,
    error: analyticsError,
    refresh: refreshAnalytics
  } = useCampaignAnalytics(campaignId);

  // Update operations
  const {
    updateCampaign,
    isUpdating,
    error: updateError
  } = useUpdateCampaign();

  // Status operations
  const {
    pauseCampaign,
    resumeCampaign,
    completeCampaign,
    isUpdating: isStatusUpdating,
    error: statusError
  } = useCampaignStatus();

  // Delete operation
  const {
    deleteCampaign,
    isDeleting,
    error: deleteError
  } = useDeleteCampaign();

  // Combined refresh
  const refresh = useCallback(() => {
    refreshCampaign();
    refreshAnalytics();
  }, [refreshCampaign, refreshAnalytics]);

  // Combined loading state
  const isLoading = isCampaignLoading || isAnalyticsLoading;

  // Combined error state
  const error = campaignError || analyticsError || updateError || statusError || deleteError;

  return {
    // Data
    campaign,
    analytics,

    // Loading states
    isLoading,
    isUpdating,
    isStatusUpdating,
    isDeleting,

    // Errors
    error,

    // Operations
    updateCampaign,
    pauseCampaign,
    resumeCampaign,
    completeCampaign,
    deleteCampaign,
    refresh
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const useCampaigns = {
  useCampaign,
  useCampaignList,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useCampaignAnalytics,
  useCampaignStatus,
  useCampaignManager
};

export default useCampaigns;
