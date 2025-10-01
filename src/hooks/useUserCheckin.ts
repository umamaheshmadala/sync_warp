// src/hooks/useUserCheckin.ts
// Hook to check if a user has an active check-in at a specific business
// Used to gate review submission (Story 5.2.1)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface UserCheckin {
  id: string;
  business_id: string;
  user_id: string;
  checked_in_at: string;
  verified: boolean;
}

interface UseUserCheckinReturn {
  checkin: UserCheckin | null;
  hasCheckin: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to check if current user has an active check-in at a specific business
 * @param businessId - The business ID to check for check-ins
 * @param enabled - Whether to fetch check-in data (default: true)
 */
export const useUserCheckin = (
  businessId: string | undefined,
  enabled: boolean = true
): UseUserCheckinReturn => {
  const { user } = useAuthStore();
  const [checkin, setCheckin] = useState<UserCheckin | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCheckin = useCallback(async () => {
    if (!businessId || !user?.id || !enabled) {
      setCheckin(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Query for the most recent check-in by this user at this business
      const { data, error: fetchError } = await supabase
        .from('business_checkins')
        .select('id, business_id, user_id, checked_in_at, verified')
        .eq('business_id', businessId)
        .eq('user_id', user.id)
        .order('checked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user check-in:', fetchError);
        throw fetchError;
      }

      setCheckin(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load check-in status';
      setError(errorMessage);
      console.error('useUserCheckin error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, user?.id, enabled]);

  // Fetch check-in on mount and when dependencies change
  useEffect(() => {
    fetchCheckin();
  }, [fetchCheckin]);

  return {
    checkin,
    hasCheckin: checkin !== null,
    isLoading,
    error,
    refetch: fetchCheckin,
  };
};

export default useUserCheckin;
