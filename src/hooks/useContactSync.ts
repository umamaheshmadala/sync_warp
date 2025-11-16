/**
 * Contact Sync Hooks
 * Story 9.2.3: Contact Sync Integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  hasContactsPermission,
  syncContacts,
  getContactMatches,
  disableContactSync,
  hasContactsSynced,
  type ContactMatch,
  type SyncProgress,
} from '../services/contactSyncService';

/**
 * Hook to check if contacts permission is granted
 */
export function useContactsPermission() {
  return useQuery({
    queryKey: ['contacts', 'permission'],
    queryFn: hasContactsPermission,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to check if user has synced contacts
 */
export function useHasContactsSynced() {
  return useQuery({
    queryKey: ['contacts', 'has-synced'],
    queryFn: hasContactsSynced,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to sync contacts with progress tracking
 */
export function useSyncContacts() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const mutation = useMutation({
    mutationFn: () => syncContacts(setProgress),
    onSuccess: (matches) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['pymk'] });
      
      // Reset progress after success
      setTimeout(() => setProgress(null), 3000);
    },
    onError: () => {
      setProgress(null);
    },
  });

  return {
    ...mutation,
    progress,
  };
}

/**
 * Hook to get contact matches
 */
export function useContactMatches() {
  return useQuery({
    queryKey: ['contacts', 'matches'],
    queryFn: getContactMatches,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to disable contact sync
 */
export function useDisableContactSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disableContactSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['pymk'] });
    },
  });
}
