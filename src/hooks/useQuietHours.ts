// src/hooks/useQuietHours.ts
// Story 8.6.5: Hook for quiet hours and mute conversations

import { useState, useEffect, useCallback } from 'react';
import { notificationSettingsService, NotificationSettings, MutedConversation } from '../services/notificationSettingsService';
import { toast } from 'react-hot-toast';

interface UseQuietHoursReturn {
  settings: NotificationSettings | null;
  mutedConversations: MutedConversation[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;
  toggleQuietHours: () => Promise<void>;
  setQuietHoursTime: (start: string, end: string) => Promise<void>;
  muteConversation: (conversationId: string, duration?: 'hour' | 'day' | 'week' | 'forever') => Promise<void>;
  unmuteConversation: (conversationId: string) => Promise<void>;
  isConversationMuted: (conversationId: string) => boolean;
  isCurrentlyQuietHours: () => boolean;
  refreshSettings: () => Promise<void>;
}

export function useQuietHours(): UseQuietHoursReturn {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [mutedConversations, setMutedConversations] = useState<MutedConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    refreshSettings();
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [settingsData, mutedData] = await Promise.all([
        notificationSettingsService.getSettings(),
        notificationSettingsService.getMutedConversations()
      ]);

      setSettings(settingsData);
      setMutedConversations(mutedData);
    } catch (err) {
      console.error('[useQuietHours] Error loading settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<NotificationSettings>) => {
    if (!settings) return;

    const previousSettings = settings;
    
    // Optimistic update
    setSettings({ ...settings, ...updates });

    try {
      await notificationSettingsService.updateSettings(updates);
    } catch (err) {
      // Revert on error
      setSettings(previousSettings);
      toast.error('Failed to update settings');
      throw err;
    }
  }, [settings]);

  const toggleQuietHours = useCallback(async () => {
    if (!settings) return;

    await updateSettings({
      quiet_hours_enabled: !settings.quiet_hours_enabled
    });

    toast.success(
      settings.quiet_hours_enabled 
        ? 'Quiet hours disabled' 
        : 'Quiet hours enabled'
    );
  }, [settings, updateSettings]);

  const setQuietHoursTime = useCallback(async (start: string, end: string) => {
    await updateSettings({
      quiet_hours_start: start,
      quiet_hours_end: end,
      quiet_hours_enabled: true
    });
  }, [updateSettings]);

  const muteConversation = useCallback(async (
    conversationId: string, 
    duration: 'hour' | 'day' | 'week' | 'forever' = 'forever'
  ) => {
    try {
      await notificationSettingsService.muteConversation(conversationId, duration);
      
      // Refresh muted list
      const muted = await notificationSettingsService.getMutedConversations();
      setMutedConversations(muted);

      const durationText = duration === 'forever' ? '' : ` for 1 ${duration}`;
      toast.success(`Conversation muted${durationText}`);
    } catch (err) {
      toast.error('Failed to mute conversation');
      throw err;
    }
  }, []);

  const unmuteConversation = useCallback(async (conversationId: string) => {
    try {
      await notificationSettingsService.unmuteConversation(conversationId);
      
      // Remove from local state
      setMutedConversations(prev => 
        prev.filter(m => m.conversation_id !== conversationId)
      );

      toast.success('Conversation unmuted');
    } catch (err) {
      toast.error('Failed to unmute conversation');
      throw err;
    }
  }, []);

  const isConversationMuted = useCallback((conversationId: string): boolean => {
    const muted = mutedConversations.find(m => m.conversation_id === conversationId);
    if (!muted) return false;

    // Check if expired
    if (muted.muted_until) {
      return new Date(muted.muted_until) > new Date();
    }

    return true;
  }, [mutedConversations]);

  const isCurrentlyQuietHours = useCallback((): boolean => {
    if (!settings) return false;
    return notificationSettingsService.isInQuietHours(settings);
  }, [settings]);

  return {
    settings,
    mutedConversations,
    isLoading,
    error,
    updateSettings,
    toggleQuietHours,
    setQuietHoursTime,
    muteConversation,
    unmuteConversation,
    isConversationMuted,
    isCurrentlyQuietHours,
    refreshSettings
  };
}
