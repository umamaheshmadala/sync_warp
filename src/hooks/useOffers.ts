// src/hooks/useOffers.ts
// React hook for managing Business Offers (Story 4.12 & 4.14)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Offer,
  OfferFormData,
  OfferFilters,
  OfferSortOptions,
  OfferStatus
} from '../types/offers';
import { followedBusinessNotificationTrigger } from '../services/followedBusinessNotificationTrigger';
import { logOfferActivity as logToBusinessActivity, ActivityActionType } from '../services/businessActivityLogService';

interface UseOffersOptions {
  businessId?: string;
  filters?: OfferFilters;
  sort?: OfferSortOptions;
  limit?: number;
  autoFetch?: boolean;
}

interface UseOffersReturn {
  offers: Offer[];
  isLoading: boolean;
  error: string | null;

  // Fetch operations
  fetchOffers: (page?: number) => Promise<void>;
  refreshOffers: () => Promise<void>;

  // CRUD operations
  createOffer: (data: OfferFormData) => Promise<Offer | null>;
  updateOffer: (id: string, data: Partial<OfferFormData> & {
    status?: OfferStatus;
    pause_reason?: string | null;
    terminate_reason?: string | null;
  }) => Promise<Offer | null>;
  deleteOffer: (id: string) => Promise<boolean>;

  // Status management
  activateOffer: (id: string) => Promise<boolean>;
  pauseOffer: (id: string, reason?: string) => Promise<boolean>;
  terminateOffer: (id: string, reason?: string) => Promise<boolean>;
  resumeOffer: (id: string) => Promise<boolean>;
  archiveOffer: (id: string) => Promise<boolean>;
  toggleFeatured: (id: string, isFeatured: boolean, priority?: number) => Promise<boolean>;

  // Utilities
  duplicateOffer: (id: string) => Promise<Offer | null>;
  extendExpiry: (id: string, days: number) => Promise<boolean>;

  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
}

export const useOffers = (options: UseOffersOptions = {}): UseOffersReturn => {
  const {
    businessId,
    filters = {},
    sort = { field: 'created_at', direction: 'desc' },
    limit = 20,
    autoFetch = true,
  } = options;

  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.ceil(totalCount / limit);
  const hasMore = currentPage < totalPages;

  // Fetch offers with filters, sorting, and pagination
  const fetchOffers = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('offers')
        .select(`
          *,
          business:businesses(id, business_name),
          offer_type:offer_types(
            *,
            category:offer_categories(*)
          )
        `, { count: 'exact' });

      // Always filter out soft-deleted offers
      query = query.is('deleted_at', null);

      // Apply business filter
      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      // Apply additional filters
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          if (filters.status.length > 0) {
            query = query.in('status', filters.status);
          }
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }

      if (filters.valid_from) {
        query = query.gte('valid_from', filters.valid_from);
      }

      if (filters.valid_until) {
        query = query.lte('valid_until', filters.valid_until);
      }

      // Apply sorting
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setOffers(data || []);
      setTotalCount(count || 0);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch offers');
      console.error('Error fetching offers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, JSON.stringify(filters), JSON.stringify(sort), limit]);

  // Refresh current page
  const refreshOffers = useCallback(() => fetchOffers(currentPage), [fetchOffers, currentPage]);

  // Create new offer
  const createOffer = useCallback(async (data: OfferFormData): Promise<Offer | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();

      const { data: offer, error: createError } = await supabase
        .from('offers')
        .insert({
          business_id: businessId,
          created_by: session?.user?.id || null,
          title: data.title,
          description: data.description,
          terms_conditions: data.terms_conditions,
          icon_image_url: data.icon_image_url,
          valid_from: data.valid_from,
          valid_until: data.valid_until,
          offer_type_id: data.offer_type_id || null,
          status: 'active', // Publish as active immediately
        })
        .select()
        .single();
      if (createError) throw createError;

      // Notify followers (Fire and forget)
      if (offer) {
        followedBusinessNotificationTrigger.notifyNewOffer(businessId, offer as Offer).catch(console.error);
      }

      // Refresh the list
      await refreshOffers();

      return offer;
    } catch (err: any) {
      setError(err.message || 'Failed to create offer');
      console.error('Error creating offer:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [businessId, refreshOffers]);

  // Update existing offer
  const updateOffer = useCallback(async (
    id: string,
    data: Partial<OfferFormData> & {
      status?: OfferStatus;
      pause_reason?: string | null;
      terminate_reason?: string | null;
    }
  ): Promise<Offer | null> => {
    // Don't set global loading to avoid UI flash
    setError(null);

    try {
      const { data: updatedOffer, error: updateError } = await supabase
        .from('offers')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          business:businesses(id, business_name),
          offer_type:offer_types(
            *,
            category:offer_categories(*)
          )
        `)
        .single();

      if (updateError) throw updateError;

      // Update local state immediately
      setOffers(prev => prev.map(o => o.id === id ? updatedOffer : o));

      return updatedOffer;
    } catch (err: any) {
      setError(err.message || 'Failed to update offer');
      console.error('Error updating offer:', err);
      return null;
    }
  }, []);

  // Helper helper to log activity
  const logActivity = useCallback(async (id: string, action: string, metadata: any = {}) => {
    try {
      // 1. Log to detailed Offer Audit Log (for specific offer history)
      await supabase.rpc('log_offer_activity', {
        p_offer_id: id,
        p_action: action,
        p_metadata: metadata
      });

      // 2. Log to Business Activity Log (for general activity feed)
      // Map offer actions to ActivityActionType
      let activityAction: ActivityActionType | null = null;
      switch (action) {
        case 'created': activityAction = 'offer_created'; break;
        case 'updated': activityAction = 'offer_updated'; break;
        case 'activated': activityAction = 'offer_activated'; break;
        case 'paused': activityAction = 'offer_paused'; break;
        case 'terminated': activityAction = 'offer_terminated'; break;
        case 'resumed': activityAction = 'offer_activated'; break; // Resumed = Active
        // soft_delete or archived could map to offer_terminated or just not show in main feed if undesired
        case 'deleted':
          if (metadata?.type === 'soft_delete') activityAction = 'offer_terminated';
          break;
        case 'archived': activityAction = 'offer_terminated'; break;
        case 'featured': activityAction = 'offer_updated'; break; // Featured is an update
        case 'unfeatured': activityAction = 'offer_updated'; break;
      }

      if (activityAction && businessId) {
        // Need offer title and audit code for the log
        let offer = offers.find(o => o.id === id);
        let title = offer?.title;
        let auditCode = offer?.audit_code;

        // If we don't have the offer locally (e.g. running in headless mode like in FeaturedOffers), fetch it
        if (!title) {
          const { data } = await supabase.from('offers').select('title, audit_code').eq('id', id).single();
          if (data) {
            title = data.title;
            auditCode = data.audit_code;
          }
        }

        if (title) {
          await logToBusinessActivity(
            businessId,
            activityAction,
            id,
            title,
            null, // Actor ID (will default to owner in service if null, or we can pass session user)
            { ...metadata, audit_code: auditCode } // Pass audit_code in metadata
          );
        }
      }

    } catch (e) {
      console.warn('Failed to log activity', e);
    }
  }, [businessId, offers]);

  // Delete offer (Soft Delete)
  const deleteOffer = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if draft for hard delete
      const { data: current, error: fetchError } = await supabase.from('offers').select('status').eq('id', id).single();

      if (fetchError) throw fetchError;

      const isDraft = current?.status === 'draft';

      if (isDraft) {
        // Hard Delete (Drafts are permanently removed)
        const { error: delError } = await supabase.from('offers').delete().eq('id', id);
        if (delError) throw delError;
      } else {
        // Soft Delete (Active/Other offers are marked as deleted)
        const { error: softError } = await supabase
          .from('offers')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);

        if (softError) throw softError;

        await logActivity(id, 'deleted', { type: 'soft_delete' });
      }

      // Remove from local state
      setOffers(prev => prev.filter(o => o.id !== id));
      setTotalCount(prev => prev - 1);

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete offer');
      console.error('Error in deleteOffer:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [logActivity]);

  // Activate offer
  const activateOffer = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateOffer(id, { status: 'active' } as any);
    if (result) await logActivity(id, 'activated');
    return result !== null;
  }, [updateOffer, logActivity]);

  // Pause offer (Story 4.14)
  const pauseOffer = useCallback(async (id: string, reason?: string): Promise<boolean> => {
    const result = await updateOffer(id, {
      status: 'paused',
      pause_reason: reason || null
    } as any);

    if (result) {
      await logActivity(id, 'paused', { reason });
    }
    return result !== null;
  }, [updateOffer, logActivity]);

  // Terminate offer (Story 4.14)
  const terminateOffer = useCallback(async (id: string, reason?: string): Promise<boolean> => {
    const result = await updateOffer(id, {
      status: 'terminated',
      terminate_reason: reason || null
    } as any);

    if (result) {
      await logActivity(id, 'terminated', { reason });
    }
    return result !== null;
  }, [updateOffer, logActivity]);

  // Resume offer (Story 4.14: Paused -> Active)
  const resumeOffer = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateOffer(id, {
      status: 'active',
      pause_reason: null // Clear pause reason on resume
    } as any);

    if (result) await logActivity(id, 'resumed');
    return result !== null;
  }, [updateOffer, logActivity]);

  // Archive offer
  const archiveOffer = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateOffer(id, { status: 'archived' } as any);
    if (result) await logActivity(id, 'archived');
    return result !== null;
  }, [updateOffer, logActivity]);

  // Toggle Featured (Story 4.18)
  const toggleFeatured = useCallback(async (id: string, isFeatured: boolean, priority: number = 0): Promise<boolean> => {
    // No global loading
    try {
      const { error } = await supabase
        .from('offers')
        .update({
          is_featured: isFeatured,
          featured_priority: priority
        })
        .eq('id', id);

      if (error) throw error;

      await logActivity(id, isFeatured ? 'featured' : 'unfeatured');

      // Update local state
      setOffers(prev => prev.map(o => o.id === id ? { ...o, is_featured: isFeatured, featured_priority: priority } : o));

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [logActivity]);

  // Extend offer expiry
  const extendExpiry = useCallback(async (id: string, days: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('extend_offer_expiry', {
          p_offer_id: id,
          p_extension_days: days,
        });

      if (rpcError) throw rpcError;

      await logActivity(id, 'extended', { days });
      await refreshOffers();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to extend offer expiry');
      console.error('Error extending offer expiry:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshOffers, logActivity]);

  // Duplicate offer (Story 4.14 Enhanced)
  const duplicateOffer = useCallback(async (id: string): Promise<Offer | null> => {
    // No global loading
    setError(null);

    try {
      // Fetch the original offer
      const { data: original, error: fetchError } = await supabase
        .from('offers')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Req #2 Copied fields: title, description, discount, T&C, type, category, target, icon
      // Req #3-5 Reset fields: dates (NULL), analytics (0), status (Draft)

      const { data: duplicate, error: createError } = await supabase
        .from('offers')
        .insert({
          business_id: original.business_id,
          title: `${original.title} (Copy)`,
          description: original.description,
          terms_conditions: original.terms_conditions,
          icon_image_url: original.icon_image_url,
          offer_type_id: original.offer_type_id,
          // Smart Date Copy:
          // Start Date = Today (Date of duplication)
          // End Date = Today + Original Duration (or default 30 days)
          valid_from: new Date().toISOString(),
          valid_until: (() => {
            const now = new Date();
            const originalStart = original.valid_from ? new Date(original.valid_from) : new Date();
            const originalEnd = original.valid_until ? new Date(original.valid_until) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            // Calculate duration in milliseconds
            // Math.max to avoid negative duration if original was weird
            const duration = Math.max(0, originalEnd.getTime() - originalStart.getTime());

            return new Date(now.getTime() + duration).toISOString();
          })(),
          status: 'draft',
          // Reset new fields
          audit_code: null, // Let DB trigger generate new one
          is_featured: false,
          featured_priority: 0,
          custom_reference: null // Or copy? Usually reset reference
        })
        .select(`
          *,
          business:businesses(id, business_name),
          offer_type:offer_types(
            *,
            category:offer_categories(*)
          )
        `)
        .single();

      if (createError) throw createError;

      // Log the duplication on the ORIGINAL offer (to show it was copied)
      await logActivity(id, 'duplicated', { new_offer_id: duplicate.id });

      // Update local state - Prepend or append depending on sort? Default is newest first.
      setOffers(prev => [duplicate, ...prev]);
      setTotalCount(prev => prev + 1);

      return duplicate;
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate offer');
      console.error('Error duplicating offer:', err);
      return null;
    }
  }, [logActivity]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchOffers(1);
    }
  }, [autoFetch, fetchOffers]);

  return {
    offers,
    isLoading,
    error,

    fetchOffers,
    refreshOffers,

    createOffer,
    updateOffer,
    deleteOffer,

    activateOffer,
    pauseOffer,
    terminateOffer,
    resumeOffer,
    archiveOffer,

    toggleFeatured,

    extendExpiry,
    duplicateOffer,

    currentPage,
    totalPages,
    totalCount,
    hasMore,
  };
};
