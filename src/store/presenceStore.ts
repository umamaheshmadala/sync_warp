import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

interface PresenceState {
    onlineUsers: Map<string, string>; // userId -> online_at
    isInitialized: boolean;
    initialize: (userId: string) => Promise<void>;
    cleanup: () => Promise<void>;
}

export const usePresenceStore = create<PresenceState>((set, get) => {
    let channel: any = null;
    let heartbeatInterval: any = null;
    let appStateListener: any = null;

    return {
        onlineUsers: new Map(),
        isInitialized: false,

        initialize: async (userId: string) => {
            if (get().isInitialized) return;

            console.log('[PresenceStore] Initializing for user:', userId);

            // Create single channel for both tracking and listening
            channel = supabase.channel('online-users', {
                config: {
                    presence: {
                        key: userId,
                    },
                },
            });

            // Handle presence state updates
            channel
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    const online = new Map<string, string>();

                    Object.values(state).forEach((presences: any) => {
                        presences.forEach((presence: any) => {
                            if (presence.user_id && presence.online_at) {
                                online.set(presence.user_id, presence.online_at);
                            }
                        });
                    });

                    console.log('[PresenceStore] Sync - Online users:', online.size);
                    set({ onlineUsers: online });
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
                    console.log('[PresenceStore] User joined:', key);
                    set((state) => {
                        const updated = new Map(state.onlineUsers);
                        newPresences.forEach((presence: any) => {
                            if (presence.user_id && presence.online_at) {
                                updated.set(presence.user_id, presence.online_at);
                            }
                        });
                        return { onlineUsers: updated };
                    });
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
                    console.log('[PresenceStore] User left:', key);
                    set((state) => {
                        const updated = new Map(state.onlineUsers);
                        leftPresences.forEach((presence: any) => {
                            if (presence.user_id) {
                                updated.delete(presence.user_id);
                            }
                        });
                        return { onlineUsers: updated };
                    });
                });

            // Subscribe and track
            channel.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await trackPresence(userId);
                }
            });

            // Helper to track presence
            const trackPresence = async (uid: string) => {
                if (!channel) return;
                console.log('[PresenceStore] Sending heartbeat');
                await channel.track({
                    user_id: uid,
                    online_at: new Date().toISOString(),
                    platform: Capacitor.getPlatform(),
                });

                // Update DB for persistence
                await supabase
                    .from('profiles')
                    .update({
                        is_online: true,
                        last_active: new Date().toISOString()
                    })
                    .eq('id', uid);
            };

            // Helper to untrack
            const untrackPresence = async (uid: string) => {
                if (!channel) return;
                console.log('[PresenceStore] Untracking');
                await channel.untrack();

                await supabase
                    .from('profiles')
                    .update({
                        is_online: false,
                        last_active: new Date().toISOString()
                    })
                    .eq('id', uid);
            };

            // Heartbeat (30s)
            heartbeatInterval = setInterval(() => {
                if (document.visibilityState === 'visible') {
                    trackPresence(userId);
                }
            }, 30000);

            // Web Visibility
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    untrackPresence(userId);
                } else {
                    trackPresence(userId);
                }
            });

            // Mobile App State
            if (Capacitor.isNativePlatform()) {
                appStateListener = App.addListener('appStateChange', async ({ isActive }) => {
                    if (isActive) {
                        trackPresence(userId);
                    } else {
                        untrackPresence(userId);
                    }
                });
            }

            // Browser Unload
            window.addEventListener('beforeunload', () => {
                untrackPresence(userId);
            });

            set({ isInitialized: true });
        },

        cleanup: async () => {
            console.log('[PresenceStore] Cleaning up');
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            if (appStateListener) appStateListener.remove();

            if (channel) {
                await channel.untrack();
                supabase.removeChannel(channel);
                channel = null;
            }

            set({ isInitialized: false, onlineUsers: new Map() });
        },
    };
});
