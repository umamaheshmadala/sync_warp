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
    let visibilityHandler: any = null;
    let unloadHandler: any = null;

    // STORY 16.6: Track local state to minimize WAL DB updates
    let isCurrentlyOnline = false;
    let visibilityDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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

                // STORY 16.6: Only update DB for persistence on actual transition to online
                if (!isCurrentlyOnline) {
                    isCurrentlyOnline = true;
                    await supabase
                        .from('profiles')
                        .update({
                            is_online: true,
                            last_active: new Date().toISOString()
                        })
                        .eq('id', uid);
                }
            };

            // Helper to untrack
            const untrackPresence = async (uid: string) => {
                if (!channel) return;
                console.log('[PresenceStore] Untracking');
                await channel.untrack();

                // STORY 16.6: Only update DB for persistence on actual transition to offline
                if (isCurrentlyOnline) {
                    isCurrentlyOnline = false;
                    await supabase
                        .from('profiles')
                        .update({
                            is_online: false,
                            last_active: new Date().toISOString()
                        })
                        .eq('id', uid);
                }
            };

            // Heartbeat (120s) with recursive setTimeout
            const startHeartbeat = () => {
                if (heartbeatInterval) return; // Prevent multiple loops
                const tick = () => {
                    if (document.visibilityState === 'visible') {
                        trackPresence(userId);
                    }
                    heartbeatInterval = setTimeout(tick, 120000);
                };
                heartbeatInterval = setTimeout(tick, 120000);
            };

            const stopHeartbeat = () => {
                if (heartbeatInterval) {
                    clearTimeout(heartbeatInterval);
                    heartbeatInterval = null;
                }
            };

            startHeartbeat();

            // Web Visibility
            if (!visibilityHandler) {
                visibilityHandler = () => {
                    if (visibilityDebounceTimer) clearTimeout(visibilityDebounceTimer);

                    visibilityDebounceTimer = setTimeout(() => {
                        if (document.hidden) {
                            untrackPresence(userId);
                        } else {
                            trackPresence(userId);
                        }
                    }, 2000); // 2 second debounce — ignore rapid tab switches
                };
                document.addEventListener('visibilitychange', visibilityHandler);
            }

            // Mobile App State
            if (Capacitor.isNativePlatform() && !appStateListener) {
                App.addListener('appStateChange', async ({ isActive }) => {
                    if (isActive) {
                        trackPresence(userId);
                        startHeartbeat(); // Resume heartbeat
                    } else {
                        untrackPresence(userId);
                        stopHeartbeat(); // Pause heartbeat in background
                    }
                }).then(listener => appStateListener = listener);
            }

            // Browser Unload
            if (!unloadHandler) {
                unloadHandler = () => {
                    untrackPresence(userId);
                };
                window.addEventListener('beforeunload', unloadHandler);
            }

            set({ isInitialized: true });
        },

        cleanup: async () => {
            console.log('[PresenceStore] Cleaning up');

            // STORY 16.6: Clean up state trackers
            isCurrentlyOnline = false;
            if (visibilityDebounceTimer) clearTimeout(visibilityDebounceTimer);

            if (heartbeatInterval) clearTimeout(heartbeatInterval);
            if (appStateListener && appStateListener.remove) appStateListener.remove();

            if (visibilityHandler) {
                document.removeEventListener('visibilitychange', visibilityHandler);
                visibilityHandler = null;
            }
            if (unloadHandler) {
                window.removeEventListener('beforeunload', unloadHandler);
                unloadHandler = null;
            }

            if (channel) {
                await channel.untrack();
                supabase.removeChannel(channel);
                channel = null;
            }

            set({ isInitialized: false, onlineUsers: new Map() });
        },
    };
});
