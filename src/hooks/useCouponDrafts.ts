// useCouponDrafts.ts
// Custom hook for managing coupon drafts
// Provides functionality to save, load, and manage coupon drafts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

export interface CouponDraft {
  id: string;
  business_id: string;
  business_name: string;
  draft_name: string;
  form_data: Record<string, any>;
  step_completed: number;
  created_at: string;
  updated_at: string;
}

export interface DraftFormData {
  title?: string;
  description?: string;
  type?: string;
  discount_type?: string;
  discount_value?: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  terms_conditions?: string;
  total_limit?: number;
  per_user_limit?: number;
  valid_from?: string;
  valid_until?: string;
  target_audience?: string;
  is_public?: boolean;
}

interface UseCouponDraftsState {
  drafts: CouponDraft[];
  loading: boolean;
  error: string | null;
}

export const useCouponDrafts = (businessId?: string) => {
  const { user } = useAuthStore();
  const [state, setState] = useState<UseCouponDraftsState>({
    drafts: [],
    loading: false,
    error: null
  });

  // Load drafts for the current user
  const loadDrafts = useCallback(async (targetBusinessId?: string) => {
    if (!user?.id) {
      console.log('useCouponDrafts: No user ID found, skipping load');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Debug authentication state
      const { data: { session } } = await supabase.auth.getSession();
      console.log('useCouponDrafts: Auth session check:', {
        hasSession: !!session,
        userId: session?.user?.id,
        userFromStore: user?.id,
        sessionMatches: session?.user?.id === user?.id
      });

      if (!session || !session.user) {
        throw new Error('No active session found. Please sign in again.');
      }

      if (session.user.id !== user?.id) {
        throw new Error('Session user ID does not match stored user ID. Please sign in again.');
      }

      console.log('useCouponDrafts: Making RPC call with params:', {
        p_business_id: targetBusinessId || businessId || null,
        p_limit: 50
      });

      const { data, error } = await supabase
        .rpc('get_coupon_drafts');

      if (error) {
        console.error('useCouponDrafts: RPC error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('useCouponDrafts: RPC success, received data:', data);

      setState(prev => ({
        ...prev,
        drafts: data || [],
        loading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load drafts';
      console.error('Error loading coupon drafts:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      toast.error(errorMessage);
    }
  }, [user?.id, businessId]);

  // Save a coupon draft
  const saveDraft = useCallback(async (
    targetBusinessId: string,
    draftName: string,
    formData: DraftFormData,
    stepCompleted: number = 1
  ): Promise<string | null> => {
    if (!user?.id) {
      toast.error('Please sign in to save drafts');
      return null;
    }

    if (!draftName.trim()) {
      toast.error('Please provide a name for your draft');
      return null;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data: draftId, error } = await supabase
        .rpc('save_coupon_draft', {
          p_business_id: targetBusinessId,
          p_draft_name: draftName.trim(),
          p_form_data: formData,
          p_step_completed: stepCompleted
        });

      if (error) throw error;

      // Reload drafts to reflect changes
      await loadDrafts(targetBusinessId);
      
      toast.success('Draft saved successfully!');
      return draftId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save draft';
      console.error('Error saving coupon draft:', error);
      setState(prev => ({ ...prev, error: errorMessage }));
      toast.error(errorMessage);
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id, loadDrafts]);

  // Delete a draft
  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data: success, error } = await supabase
        .rpc('delete_coupon_draft', { p_draft_id: draftId });

      if (error) throw error;

      if (success) {
        // Remove from local state
        setState(prev => ({
          ...prev,
          drafts: prev.drafts.filter(draft => draft.id !== draftId),
          loading: false
        }));
        toast.success('Draft deleted successfully!');
        return true;
      } else {
        toast.error('Draft not found or already deleted');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete draft';
      console.error('Error deleting coupon draft:', error);
      setState(prev => ({ ...prev, error: errorMessage }));
      toast.error(errorMessage);
      return false;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id]);

  // Load a specific draft by ID
  const loadDraft = useCallback((draftId: string): CouponDraft | null => {
    return state.drafts.find(draft => draft.id === draftId) || null;
  }, [state.drafts]);

  // Generate a default draft name based on form data
  const generateDraftName = useCallback((formData: DraftFormData): string => {
    if (formData.title?.trim()) {
      return `${formData.title.trim()} - Draft`;
    }
    
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `Coupon Draft - ${dateStr} ${timeStr}`;
  }, []);

  // Check if form data has meaningful content
  const hasFormContent = useCallback((formData: DraftFormData): boolean => {
    return !!(
      formData.title?.trim() ||
      formData.description?.trim() ||
      formData.type ||
      (formData.discount_value && formData.discount_value > 0) ||
      formData.terms_conditions?.trim()
    );
  }, []);

  // Auto-load drafts when component mounts or businessId changes
  useEffect(() => {
    if (user?.id) {
      loadDrafts();
    }
  }, [user?.id, loadDrafts]);

  return {
    // State
    ...state,
    isAuthenticated: !!user?.id,
    
    // Actions
    loadDrafts,
    saveDraft,
    deleteDraft,
    loadDraft,
    
    // Utilities
    generateDraftName,
    hasFormContent,
    
    // Stats
    draftCount: state.drafts.length,
    hasDrafts: state.drafts.length > 0,
    
    // Getters
    getDraftsByBusiness: (targetBusinessId: string) => 
      state.drafts.filter(draft => draft.business_id === targetBusinessId),
    
    getRecentDrafts: (limit: number = 5) =>
      state.drafts
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, limit)
  };
};

export default useCouponDrafts;