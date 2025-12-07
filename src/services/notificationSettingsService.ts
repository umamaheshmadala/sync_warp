// src/services/notificationSettingsService.ts
// Story 8.6.5: Notification Preferences - Quiet Hours & Mute

import { supabase } from '../lib/supabase';

export interface NotificationSettings {
  push_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  show_preview: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // "HH:MM" format
  quiet_hours_end: string;   // "HH:MM" format
}

export interface MutedConversation {
  conversation_id: string;
  muted_until: string | null;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  push_enabled: true,
  sound_enabled: true,
  vibration_enabled: true,
  show_preview: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
};

class NotificationSettingsService {
  /**
   * Get user's notification settings
   */
  async getSettings(): Promise<NotificationSettings> {
    const { data: { user } } = await supabase.auth.getSession();
    if (!user?.user?.id) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('[NotificationSettings] Error fetching:', error);
      throw error;
    }

    // Return data or defaults
    return {
      push_enabled: data?.push_enabled ?? DEFAULT_SETTINGS.push_enabled,
      sound_enabled: data?.sound_enabled ?? DEFAULT_SETTINGS.sound_enabled,
      vibration_enabled: data?.vibration_enabled ?? DEFAULT_SETTINGS.vibration_enabled,
      show_preview: data?.show_preview ?? DEFAULT_SETTINGS.show_preview,
      quiet_hours_enabled: data?.quiet_hours_enabled ?? DEFAULT_SETTINGS.quiet_hours_enabled,
      quiet_hours_start: data?.quiet_hours_start ?? DEFAULT_SETTINGS.quiet_hours_start,
      quiet_hours_end: data?.quiet_hours_end ?? DEFAULT_SETTINGS.quiet_hours_end,
    };
  }

  /**
   * Update notification settings
   */
  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    const { data: { user } } = await supabase.auth.getSession();
    if (!user?.user?.id) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: user.user.id,
        ...settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('[NotificationSettings] Error updating:', error);
      throw error;
    }
  }

  /**
   * Mute a conversation
   */
  async muteConversation(
    conversationId: string, 
    duration: 'hour' | 'day' | 'week' | 'forever' = 'forever'
  ): Promise<void> {
    const { error } = await supabase.rpc('mute_conversation', {
      p_conversation_id: conversationId,
      p_duration: duration
    });

    if (error) {
      console.error('[NotificationSettings] Error muting:', error);
      throw error;
    }
  }

  /**
   * Unmute a conversation
   */
  async unmuteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase.rpc('unmute_conversation', {
      p_conversation_id: conversationId
    });

    if (error) {
      console.error('[NotificationSettings] Error unmuting:', error);
      throw error;
    }
  }

  /**
   * Check if a conversation is muted
   */
  async isConversationMuted(conversationId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getSession();
    if (!user?.user?.id) return false;

    const { data, error } = await supabase
      .from('muted_conversations')
      .select('muted_until')
      .eq('user_id', user.user.id)
      .eq('conversation_id', conversationId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[NotificationSettings] Error checking mute:', error);
      return false;
    }

    if (!data) return false;

    // Check if mute has expired
    if (data.muted_until) {
      return new Date(data.muted_until) > new Date();
    }

    return true; // Muted forever
  }

  /**
   * Get all muted conversations for current user
   */
  async getMutedConversations(): Promise<MutedConversation[]> {
    const { data: { user } } = await supabase.auth.getSession();
    if (!user?.user?.id) return [];

    const { data, error } = await supabase
      .from('muted_conversations')
      .select('conversation_id, muted_until')
      .eq('user_id', user.user.id);

    if (error) {
      console.error('[NotificationSettings] Error fetching muted:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if currently in quiet hours (client-side check)
   */
  isInQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quiet_hours_enabled) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = settings.quiet_hours_start.split(':').map(Number);
    const [endH, endM] = settings.quiet_hours_end.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      // Same day range (e.g., 09:00 - 17:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight range (e.g., 22:00 - 07:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }
}

export const notificationSettingsService = new NotificationSettingsService();
