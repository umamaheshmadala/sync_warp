/**
 * Unit Tests for friendsStore (Zustand)
 * Story 9.8.2: Unit Tests - React Hooks & State Management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFriendsStore } from '../../store/friendsStore';
import type { Friend, FriendRequest } from '../../types/friends';

describe('friendsStore', () => {
    beforeEach(() => {
        // Reset store before each test
        const { getState } = useFriendsStore;
        act(() => {
            getState().setFriends([]);
            getState().setRequests([]);
            getState().setOnlineFriendsCount(0);
        });
    });

    describe('Initial State', () => {
        it('should have empty friends array initially', () => {
            const { result } = renderHook(() => useFriendsStore());
            expect(result.current.friends).toEqual([]);
        });

        it('should have empty requests array initially', () => {
            const { result } = renderHook(() => useFriendsStore());
            expect(result.current.requests).toEqual([]);
        });

        it('should have zero online friends count initially', () => {
            const { result } = renderHook(() => useFriendsStore());
            expect(result.current.onlineFriendsCount).toBe(0);
        });
    });

    describe('setFriends', () => {
        it('should set friends array', () => {
            const mockFriends: Friend[] = [
                { id: 'friend-1', full_name: 'John Doe', is_online: true } as Friend,
                { id: 'friend-2', full_name: 'Jane Smith', is_online: false } as Friend,
            ];

            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.setFriends(mockFriends);
            });

            expect(result.current.friends).toEqual(mockFriends);
            expect(result.current.friends).toHaveLength(2);
        });

        it('should replace existing friends', () => {
            const initialFriends: Friend[] = [
                { id: 'friend-1', full_name: 'John Doe', is_online: true } as Friend,
            ];

            const newFriends: Friend[] = [
                { id: 'friend-2', full_name: 'Jane Smith', is_online: false } as Friend,
            ];

            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.setFriends(initialFriends);
            });

            expect(result.current.friends).toHaveLength(1);

            act(() => {
                result.current.setFriends(newFriends);
            });

            expect(result.current.friends).toEqual(newFriends);
            expect(result.current.friends).toHaveLength(1);
        });
    });

    describe('setRequests', () => {
        it('should set requests array', () => {
            const mockRequests: FriendRequest[] = [
                { id: 'req-1', sender_id: 'user-1', receiver_id: 'user-2', status: 'pending' } as FriendRequest,
            ];

            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.setRequests(mockRequests);
            });

            expect(result.current.requests).toEqual(mockRequests);
        });
    });

    describe('setOnlineFriendsCount', () => {
        it('should set online friends count', () => {
            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.setOnlineFriendsCount(5);
            });

            expect(result.current.onlineFriendsCount).toBe(5);
        });

        it('should update online friends count', () => {
            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.setOnlineFriendsCount(3);
            });

            expect(result.current.onlineFriendsCount).toBe(3);

            act(() => {
                result.current.setOnlineFriendsCount(7);
            });

            expect(result.current.onlineFriendsCount).toBe(7);
        });
    });

    describe('addFriend', () => {
        it('should add a friend to the list', () => {
            const newFriend: Friend = {
                id: 'friend-1',
                full_name: 'John Doe',
                is_online: true,
            } as Friend;

            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.addFriend(newFriend);
            });

            expect(result.current.friends).toHaveLength(1);
            expect(result.current.friends[0]).toEqual(newFriend);
        });

        it('should add multiple friends', () => {
            const friend1: Friend = { id: 'friend-1', full_name: 'John Doe', is_online: true } as Friend;
            const friend2: Friend = { id: 'friend-2', full_name: 'Jane Smith', is_online: false } as Friend;

            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.addFriend(friend1);
                result.current.addFriend(friend2);
            });

            expect(result.current.friends).toHaveLength(2);
            expect(result.current.friends).toContainEqual(friend1);
            expect(result.current.friends).toContainEqual(friend2);
        });
    });

    describe('removeFriend', () => {
        it('should remove a friend by id', () => {
            const friends: Friend[] = [
                { id: 'friend-1', full_name: 'John Doe', is_online: true } as Friend,
                { id: 'friend-2', full_name: 'Jane Smith', is_online: false } as Friend,
            ];

            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.setFriends(friends);
            });

            expect(result.current.friends).toHaveLength(2);

            act(() => {
                result.current.removeFriend('friend-1');
            });

            expect(result.current.friends).toHaveLength(1);
            expect(result.current.friends[0].id).toBe('friend-2');
        });

        it('should not affect list if friend id not found', () => {
            const friends: Friend[] = [
                { id: 'friend-1', full_name: 'John Doe', is_online: true } as Friend,
            ];

            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.setFriends(friends);
            });

            act(() => {
                result.current.removeFriend('non-existent-id');
            });

            expect(result.current.friends).toHaveLength(1);
            expect(result.current.friends[0].id).toBe('friend-1');
        });
    });

    describe('addRequest', () => {
        it('should add a request to the list', () => {
            const newRequest: FriendRequest = {
                id: 'req-1',
                sender_id: 'user-1',
                receiver_id: 'user-2',
                status: 'pending',
            } as FriendRequest;

            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.addRequest(newRequest);
            });

            expect(result.current.requests).toHaveLength(1);
            expect(result.current.requests[0]).toEqual(newRequest);
        });
    });

    describe('removeRequest', () => {
        it('should remove a request by id', () => {
            const requests: FriendRequest[] = [
                { id: 'req-1', sender_id: 'user-1', receiver_id: 'user-2', status: 'pending' } as FriendRequest,
                { id: 'req-2', sender_id: 'user-3', receiver_id: 'user-2', status: 'pending' } as FriendRequest,
            ];

            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.setRequests(requests);
            });

            expect(result.current.requests).toHaveLength(2);

            act(() => {
                result.current.removeRequest('req-1');
            });

            expect(result.current.requests).toHaveLength(1);
            expect(result.current.requests[0].id).toBe('req-2');
        });
    });

    describe('getOnlineFriends', () => {
        it('should return only online friends', () => {
            const friends: Friend[] = [
                { id: 'friend-1', full_name: 'John Doe', is_online: true } as Friend,
                { id: 'friend-2', full_name: 'Jane Smith', is_online: false } as Friend,
                { id: 'friend-3', full_name: 'Bob Johnson', is_online: true } as Friend,
            ];

            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.setFriends(friends);
            });

            const onlineFriends = result.current.getOnlineFriends();

            expect(onlineFriends).toHaveLength(2);
            expect(onlineFriends.every(f => f.is_online)).toBe(true);
        });

        it('should return empty array when no friends are online', () => {
            const friends: Friend[] = [
                { id: 'friend-1', full_name: 'John Doe', is_online: false } as Friend,
                { id: 'friend-2', full_name: 'Jane Smith', is_online: false } as Friend,
            ];

            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.setFriends(friends);
            });

            const onlineFriends = result.current.getOnlineFriends();

            expect(onlineFriends).toHaveLength(0);
        });
    });

    describe('getPendingRequestsCount', () => {
        it('should return count of pending requests', () => {
            const requests: FriendRequest[] = [
                { id: 'req-1', sender_id: 'user-1', receiver_id: 'user-2', status: 'pending' } as FriendRequest,
                { id: 'req-2', sender_id: 'user-3', receiver_id: 'user-2', status: 'pending' } as FriendRequest,
            ];

            const { result } = renderHook(() => useFriendsStore());

            act(() => {
                result.current.setRequests(requests);
            });

            expect(result.current.getPendingRequestsCount()).toBe(2);
        });

        it('should return 0 when no requests', () => {
            const { result } = renderHook(() => useFriendsStore());

            expect(result.current.getPendingRequestsCount()).toBe(0);
        });
    });
});
