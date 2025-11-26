/**
 * Unit tests for OfflineQueue
 * Story 9.4.6: Offline Support for Friend Requests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { offlineQueue } from '../offlineQueue';
import { friendsService } from '../friendsService';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

// Mock dependencies
vi.mock('../friendsService', () => ({
    friendsService: {
        sendFriendRequest: vi.fn(),
        acceptFriendRequest: vi.fn(),
        rejectFriendRequest: vi.fn(),
        unfriend: vi.fn(),
        blockUser: vi.fn(),
    },
}));

vi.mock('@capacitor/network', () => ({
    Network: {
        addListener: vi.fn(),
        getStatus: vi.fn(),
    },
}));

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: vi.fn(),
    },
}));

describe('OfflineQueue', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        localStorage.clear();
        (offlineQueue as any).queue = [];
        (offlineQueue as any).processing = false;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('add', () => {
        it('should add request to queue when offline', async () => {
            (Capacitor.isNativePlatform as any).mockReturnValue(true);
            (Network.getStatus as any).mockResolvedValue({ connected: false });

            const id = await offlineQueue.add('friend_request', { receiverId: '123' });

            expect(id).toBeDefined();
            expect(offlineQueue.getQueuedCount()).toBe(1);
            expect(offlineQueue.getQueue()[0].type).toBe('friend_request');
        });

        it('should not add duplicate request', async () => {
            (Capacitor.isNativePlatform as any).mockReturnValue(true);
            (Network.getStatus as any).mockResolvedValue({ connected: false });

            await offlineQueue.add('friend_request', { receiverId: '123' });
            await offlineQueue.add('friend_request', { receiverId: '123' });

            expect(offlineQueue.getQueuedCount()).toBe(1);
        });
    });

    describe('processQueue', () => {
        it('should process queued requests', async () => {
            (Capacitor.isNativePlatform as any).mockReturnValue(false);
            (friendsService.sendFriendRequest as any).mockResolvedValue({ success: true });

            // Add request manually to avoid auto-processing in add()
            (offlineQueue as any).queue.push({
                id: '1',
                type: 'friend_request',
                payload: { receiverId: '123' },
                timestamp: Date.now(),
                retries: 0,
            });

            await offlineQueue.processQueue();

            expect(friendsService.sendFriendRequest).toHaveBeenCalledWith('123', undefined);
            expect(offlineQueue.getQueuedCount()).toBe(0);
        });

        it('should retry failed requests', async () => {
            (Capacitor.isNativePlatform as any).mockReturnValue(false);
            (friendsService.sendFriendRequest as any).mockRejectedValue(new Error('Network error'));

            (offlineQueue as any).queue.push({
                id: '1',
                type: 'friend_request',
                payload: { receiverId: '123' },
                timestamp: Date.now(),
                retries: 0,
            });

            await offlineQueue.processQueue();

            expect(friendsService.sendFriendRequest).toHaveBeenCalled();
            expect(offlineQueue.getQueuedCount()).toBe(1);
            expect(offlineQueue.getQueue()[0].retries).toBe(1);
        });

        it('should remove request after max retries', async () => {
            (Capacitor.isNativePlatform as any).mockReturnValue(false);
            (friendsService.sendFriendRequest as any).mockRejectedValue(new Error('Network error'));

            (offlineQueue as any).queue.push({
                id: '1',
                type: 'friend_request',
                payload: { receiverId: '123' },
                timestamp: Date.now(),
                retries: 3, // Max retries
            });

            await offlineQueue.processQueue();

            expect(friendsService.sendFriendRequest).toHaveBeenCalled();
            expect(offlineQueue.getQueuedCount()).toBe(0);
        });
    });

    describe('storage', () => {
        it('should save queue to localStorage', async () => {
            (Capacitor.isNativePlatform as any).mockReturnValue(false);
            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

            await offlineQueue.add('friend_request', { receiverId: '123' });

            expect(setItemSpy).toHaveBeenCalledWith('offline_queue_friends', expect.stringContaining('friend_request'));
        });

        it('should load queue from localStorage on init', () => {
            const queueData = [{
                id: '1',
                type: 'friend_request',
                payload: { receiverId: '123' },
                timestamp: Date.now(),
                retries: 0,
            }];

            const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(queueData));

            (offlineQueue as any).loadQueue();

            expect(getItemSpy).toHaveBeenCalledWith('offline_queue_friends');
            expect(offlineQueue.getQueuedCount()).toBe(1);
        });
    });
});
