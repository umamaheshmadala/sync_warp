// src/hooks/useOfferDrafts.ts
// React hook for managing Offer Drafts with auto-save (Story 4.12)

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { OfferDraft } from '../types/offers';

interface UseOfferDraftsOptions {
  userId: string;
  businessId: string;
  autoSaveDelay?: number; // milliseconds
}

interface UseOfferDraftsReturn {
  drafts: OfferDraft[];
  currentDraft: OfferDraft | null;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  
  // Draft operations
  fetchDrafts: () => Promise<void>;
  loadDraft: (draftId: string) => Promise<void>;
  createDraft: (draftName: string) => Promise<OfferDraft | null>;
  updateDraft: (formData: any, stepCompleted: number) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<boolean>;
  convertDraftToOffer: (draftId: string) => Promise<boolean>;
}

export const useOfferDrafts = (options: UseOfferDraftsOptions): UseOfferDraftsReturn => {
  const { userId, businessId, autoSaveDelay = 2000 } = options;

  const [drafts, setDrafts] = useState<OfferDraft[]>([]);
  const [currentDraft, setCurrentDraft] = useState<OfferDraft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save timer
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all drafts for the user and business
  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('offer_drafts')
        .select('*')
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      setDrafts(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch drafts');
      console.error('Error fetching drafts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, businessId]);

  // Load a specific draft
  const loadDraft = useCallback(async (draftId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await supabase
        .from('offer_drafts')
        .select('*')
        .eq('id', draftId)
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
  const createDraft = useCallback(async (draftName: string): Promise<OfferDraft | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: createError } = await supabase
        .from('offer_drafts')
        .insert({
          user_id: userId,
          business_id: businessId,
          draft_name: draftName,
          form_data: {},
          step_completed: 0,
        })
        .select()
        .single();

      if (createError) throw createError;

      setCurrentDraft(data);
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
  const updateDraft = useCallback(async (formData: any, stepCompleted: number) => {
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
        const { data, error: updateError } = await supabase
          .from('offer_drafts')
          .update({
            form_data: formData,
            step_completed: stepCompleted,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentDraft.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setCurrentDraft(data);

        // Update in drafts list
        setDrafts(prev => prev.map(d => d.id === currentDraft.id ? data : d));
      } catch (err: any) {
        setError(err.message || 'Failed to save draft');
        console.error('Error saving draft:', err);
      } finally {
        setIsSaving(false);
      }
    }, autoSaveDelay);
  }, [currentDraft, autoSaveDelay]);

  // Delete a draft
  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('offer_drafts')
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

  // Convert draft to actual offer
  const convertDraftToOffer = useCallback(async (draftId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch the draft
      const { data: draft, error: fetchError } = await supabase
        .from('offer_drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (fetchError) throw fetchError;

      // Create offer from draft
      const { error: createError } = await supabase
        .from('offers')
        .insert({
          business_id: draft.business_id,
          title: draft.form_data.title,
          description: draft.form_data.description,
          terms_conditions: draft.form_data.terms_conditions,
          icon_image_url: draft.form_data.icon_image_url,
          valid_from: draft.form_data.valid_from,
          valid_until: draft.form_data.valid_until,
          status: 'draft',
          created_by: draft.user_id,
        });

      if (createError) throw createError;

      // Delete the draft after successful conversion
      await deleteDraft(draftId);

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to convert draft to offer');
      console.error('Error converting draft:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [deleteDraft]);

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
    
    fetchDrafts,
    loadDraft,
    createDraft,
    updateDraft,
    deleteDraft,
    convertDraftToOffer,
  };
};
