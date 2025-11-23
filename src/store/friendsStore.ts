/**
 * Zustand Store for Friends
 * Story 9.4.3: Zustand Store for Friends
 * 
 * Global state management for friends data with persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Friend, FriendRequest } from '../types/friends';

interface FriendsState {
    friends: Friend[];
    requests: FriendRequest[];
    onlineFriendsCount: number;

    // Actions
    setFriends: (friends: Friend[]) => void;
    setRequests: (requests: FriendRequest[]) => void;
    setOnlineFriendsCount: (count: number) => void;
    addFriend: (friend: Friend) => void;
    removeFriend: (friendId: string) => void;
    addRequest: (request: FriendRequest) => void;
    removeRequest: (requestId: string) => void;

    // Derived selectors
    getOnlineFriends: () => Friend[];
    getPendingRequestsCount: () => number;
}

export const useFriendsStore = create<FriendsState>()(
    persist(
        (set, get) => ({
            friends: [],
            requests: [],
            onlineFriendsCount: 0,

            setFriends: (friends) => set({ friends }),
            setRequests: (requests) => set({ requests }),
            setOnlineFriendsCount: (count) => set({ onlineFriendsCount: count }),

            addFriend: (friend) =>
                set((state) => ({ friends: [...state.friends, friend] })),

            removeFriend: (friendId) =>
                set((state) => ({
                    friends: state.friends.filter((f) => f.id !== friendId),
                })),

            addRequest: (request) =>
                set((state) => ({ requests: [...state.requests, request] })),

            removeRequest: (requestId) =>
                set((state) => ({
                    requests: state.requests.filter((r) => r.id !== requestId),
                })),

            getOnlineFriends: () => get().friends.filter((f) => f.is_online),

            getPendingRequestsCount: () => get().requests.length,
        }),
        {
            name: 'friends-storage',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({
                friends: state.friends,
                onlineFriendsCount: state.onlineFriendsCount,
            }),
        }
    )
);
