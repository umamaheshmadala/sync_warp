// src/hooks/useOfferDrafts.ts
// React hook for managing Offer Drafts using the main offers table (status='draft')
// Refactored for Story 4.18

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Offer, OfferFormData } from '../types/offers';

interface UseOfferDraftsOptions {
  userId: string;
  businessId: string;
  autoSaveDelay?: number; // milliseconds
}

interface UseOfferDraftsReturn {
  drafts: Offer[];
  currentDraft: Offer | null;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  lastSavedAt: Date | null;

  // Draft operations
  fetchDrafts: () => Promise<void>;
  loadDraft: (draftId: string) => Promise<void>;
  createDraft: (draftName: string) => Promise<Offer | null>;
  updateDraft: (formData: Partial<OfferFormData>, stepCompleted: number) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<boolean>;
  publishDraft: (draftId: string, finalData?: Partial<OfferFormData>) => Promise<boolean>;
}

export const useOfferDrafts = (options: UseOfferDraftsOptions): UseOfferDraftsReturn => {
  const { userId, businessId, autoSaveDelay = 2000 } = options;

  const [drafts, setDrafts] = useState<Offer[]>([]);
  const [currentDraft, setCurrentDraft] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Auto-save timer
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all drafts for the user and business
  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('offers')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'draft')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      setDrafts(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch drafts');
      console.error('Error fetching drafts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  // Load a specific draft
  const loadDraft = useCallback(async (draftId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await supabase
        .from('offers')
        .select('*')
        .eq('id', draftId)
        .eq('status', 'draft')
        .single();

      if (loadError) throw loadError;

      setCurrentDraft(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load draft');
      console.error('Error loading draft:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new draft
  const createDraft = useCallback(async (draftName: string): Promise<Offer | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Basic initial data for a draft
      const initialData = {
        business_id: businessId,
        created_by: userId,
        title: draftName,
        status: 'draft',
        // Set far future expiry for drafts initially, or null if allowed (schema says valid_until is nullable for drafts usually, but let's check constraints)
        // Schema: valid_until is nullable? Let's assume yes or set defaults.
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const { data, error: createError } = await supabase
        .from('offers')
        .insert(initialData)
        .select()
        .single();

      if (createError) throw createError;

      setCurrentDraft(data);
      setLastSavedAt(new Date());
      await fetchDrafts();

      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to create draft');
      console.error('Error creating draft:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId, businessId, fetchDrafts]);

  // Update draft with auto-save
  const updateDraft = useCallback(async (formData: Partial<OfferFormData>, stepCompleted: number) => {
    if (!currentDraft) return;

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer for auto-save
    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      setError(null);

      try {
        // Map form data to DB columns
        // Note: OfferFormData matches DB columns mostly.
        // step_completed isn't a column in 'offers', so we might ignore it or store it in metadata if we had a JSON column.
        // For now, we just save the form fields.

        const updatePayload = {
          ...formData,
          updated_at: new Date().toISOString(),
        };

        const { data, error: updateError } = await supabase
          .from('offers')
          .update(updatePayload)
          .eq('id', currentDraft.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setCurrentDraft(data);
        setLastSavedAt(new Date());

        // Update in drafts list locally to avoid refetch
        setDrafts(prev => prev.map(d => d.id === currentDraft.id ? data : d));
      } catch (err: any) {
        setError(err.message || 'Failed to save draft');
        console.error('Error saving draft:', err);
      } finally {
        setIsSaving(false);
      }
    }, autoSaveDelay);
  }, [currentDraft, autoSaveDelay]);

  // Delete a draft (Hard delete for drafts)
  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('offers')
        .delete()
        .eq('id', draftId);

      if (deleteError) throw deleteError;

      // Remove from state
      setDrafts(prev => prev.filter(d => d.id !== draftId));

      if (currentDraft?.id === draftId) {
        setCurrentDraft(null);
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete draft');
      console.error('Error deleting draft:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentDraft]);

  // Publish draft (Convert to active)
  const publishDraft = useCallback(async (draftId: string, finalData?: Partial<OfferFormData>): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const updatePayload = {
        ...(finalData || {}),
        status: 'active',
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('offers')
        .update(updatePayload)
        .eq('id', draftId);

      if (updateError) throw updateError;

      // Refresh drafts list (it should disappear from drafts)
      await fetchDrafts();

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to publish draft');
      console.error('Error publishing draft:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchDrafts]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Fetch drafts on mount
  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  return {
    drafts,
    currentDraft,
    isLoading,
    error,
    isSaving,
    lastSavedAt,

    fetchDrafts,
    loadDraft,
    createDraft,
    updateDraft,
    deleteDraft,
    publishDraft,
  };
};
