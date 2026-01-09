// src/hooks/useOffers.ts
// React hook for managing Business Offers (Story 4.12)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Offer,
  OfferFormData,
  OfferFilters,
  OfferSortOptions,
  OfferStatus
} from '../types/offers';

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
  updateOffer: (id: string, data: Partial<OfferFormData>) => Promise<Offer | null>;
  deleteOffer: (id: string) => Promise<boolean>;

  // Status management
  activateOffer: (id: string) => Promise<boolean>;
  pauseOffer: (id: string) => Promise<boolean>;
  archiveOffer: (id: string) => Promise<boolean>;
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

      // Apply business filter
      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      // Apply additional filters
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
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
  }, [businessId, filters, sort, limit]);

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
          status: 'active', // Publish as active immediately
        })
        .select()
        .single();
      if (createError) throw createError;

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
    data: Partial<OfferFormData> & { status?: OfferStatus }
  ): Promise<Offer | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: offer, error: updateError } = await supabase
        .from('offers')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Refresh the list to get updated data
      await refreshOffers();

      return offer;
    } catch (err: any) {
      setError(err.message || 'Failed to update offer');
      console.error('Error updating offer:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete offer
  const deleteOffer = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('offers')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Remove from local state
      setOffers(prev => prev.filter(o => o.id !== id));
      setTotalCount(prev => prev - 1);

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete offer');
      console.error('Error deleting offer:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Activate offer
  const activateOffer = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateOffer(id, { status: 'active' } as any);
    return result !== null;
  }, [updateOffer]);

  // Pause offer
  const pauseOffer = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateOffer(id, { status: 'paused' } as any);
    return result !== null;
  }, [updateOffer]);

  // Archive offer
  const archiveOffer = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateOffer(id, { status: 'archived' } as any);
    return result !== null;
  }, [updateOffer]);

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

      await refreshOffers();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to extend offer expiry');
      console.error('Error extending offer expiry:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshOffers]);

  // Duplicate offer
  const duplicateOffer = useCallback(async (id: string): Promise<Offer | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch the original offer
      const { data: original, error: fetchError } = await supabase
        .from('offers')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate with modified title and new dates
      const { data: duplicate, error: createError } = await supabase
        .from('offers')
        .insert({
          business_id: original.business_id,
          title: `${original.title} (Copy)`,
          description: original.description,
          terms_conditions: original.terms_conditions,
          icon_image_url: original.icon_image_url,
          valid_from: new Date().toISOString(),
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          status: 'draft',
        })
        .select()
        .single();

      if (createError) throw createError;

      await refreshOffers();

      return duplicate;
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate offer');
      console.error('Error duplicating offer:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [refreshOffers]);

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
    archiveOffer,
    extendExpiry,
    duplicateOffer,

    currentPage,
    totalPages,
    totalCount,
    hasMore,
  };
};
