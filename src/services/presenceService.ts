/**
 * Presence Service - Online Status Tracking
 * Story 9.1.6: Profiles Extension
 * 
 * Tracks user online status and updates last_active timestamp
 */

import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_active: string;
}

class PresenceService {
  private channel: RealtimeChannel | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  /**
   * Start tracking user presence
   * Updates is_online and last_active in profiles table
   */
  async startTracking(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('⚠️ No authenticated user, skipping presence tracking');
      return;
    }

    try {
      // Set initial online status
      await this.updateOnlineStatus(true);

      // Setup heartbeat to update last_active periodically
      this.heartbeatInterval = setInterval(() => {
        this.updateLastActive();
      }, this.HEARTBEAT_INTERVAL);

      // Listen for auth state changes
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          this.stopTracking();
        }
      });

      // Handle page visibility (user tabs away)
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
      }

      // Handle page unload (user closes tab/window)
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          // Use sendBeacon for reliable offline status update on page close
          const userId = user.id;
          const blob = new Blob([JSON.stringify({ user_id: userId, is_online: false })], {
            type: 'application/json',
          });
          
          navigator.sendBeacon(`${supabase.supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, blob);
        });
      }

      console.log('✅ Presence tracking started for user:', user.id);
    } catch (error) {
      console.error('❌ Error starting presence tracking:', error);
    }
  }

  /**
   * Stop tracking user presence
   */
  async stopTracking(): Promise<void> {
    try {
      // Clear heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Remove event listeners
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      }

      // Set offline status
      await this.updateOnlineStatus(false);

      // Cleanup channel
      if (this.channel) {
        await supabase.removeChannel(this.channel);
        this.channel = null;
      }

      console.log('✅ Presence tracking stopped');
    } catch (error) {
      console.error('❌ Error stopping presence tracking:', error);
    }
  }

  /**
   * Update user's online status
   */
  private async updateOnlineStatus(isOnline: boolean): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          is_online: isOnline,
          last_active: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error updating online status:', error);
      } else {
        console.log(`✅ Online status updated: ${isOnline}`);
      }
    } catch (error) {
      console.error('❌ Error in updateOnlineStatus:', error);
    }
  }

  /**
   * Update user's last_active timestamp (heartbeat)
   */
  private async updateLastActive(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error && error.code !== 'PGRST116') { // Ignore "no rows affected" error
        console.error('❌ Error updating last_active:', error);
      }
    } catch (error) {
      console.error('❌ Error in updateLastActive:', error);
    }
  }

  /**
   * Handle page visibility changes
   */
  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // User switched tab - mark as away but don't set offline
      this.updateLastActive();
    } else {
      // User returned to tab - mark as online
      this.updateOnlineStatus(true);
    }
  };

  /**
   * Get online status for a specific user
   */
  async getUserPresence(userId: string): Promise<UserPresence | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, is_online, last_active')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return data as UserPresence;
    } catch (error) {
      console.error('❌ Error getting user presence:', error);
      return null;
    }
  }

  /**
   * Get online friends count
   */
  async getOnlineFriendsCount(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_online_friends_count');

      if (error) throw error;

      return (data as number) || 0;
    } catch (error) {
      console.error('❌ Error getting online friends count:', error);
      return 0;
    }
  }

  /**
   * Subscribe to presence changes for specific users
   */
  subscribeToPresence(
    userIds: string[],
    onPresenceChange: (userId: string, isOnline: boolean) => void
  ): () => void {
    const channel = supabase
      .channel('presence-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=in.(${userIds.join(',')})`,
        },
        (payload) => {
          const { user_id, is_online } = payload.new as { user_id: string; is_online: boolean };
          onPresenceChange(user_id, is_online);
        }
      )
      .subscribe();

    this.channel = channel;

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }
}

// Export singleton instance
export const presenceService = new PresenceService();

// Auto-start presence tracking when user is authenticated
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      presenceService.startTracking();
    } else if (event === 'SIGNED_OUT') {
      presenceService.stopTracking();
    }
  });
}
