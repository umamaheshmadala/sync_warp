/**
 * Offline Queue Service
 * Story 9.4.6: Offline Support for Friend Requests
 * 
 * Queues friend operations when offline and automatically processes them
 * when the network reconnects.
 */

import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

/**
 * Queued request types
 */
interface QueuedRequest {
    id: string;
    type: 'friend_request' | 'accept' | 'reject' | 'unfriend' | 'block';
    payload: any;
    timestamp: number;
    retries: number;
}

/**
 * Offline Queue Manager
 * Handles queuing and processing of friend operations when offline
 */
class OfflineQueue {
    private queue: QueuedRequest[] = [];
    private processing = false;
    private readonly STORAGE_KEY = 'offline_queue_friends';
    private readonly MAX_RETRIES = 3;

    constructor() {
        this.loadQueue();
        this.setupNetworkListener();
    }

    /**
     * Load queue from localStorage
     */
    private loadQueue() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.queue = JSON.parse(stored);
                console.log(`[OfflineQueue] Loaded ${this.queue.length} queued requests from storage`);
            }
        } catch (error) {
            console.error('[OfflineQueue] Failed to load queue from storage:', error);
            this.queue = [];
        }
    }

    /**
     * Save queue to localStorage
     */
    private saveQueue() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
        } catch (error) {
            console.error('[OfflineQueue] Failed to save queue to storage:', error);
        }
    }

    /**
     * Setup network status listener
     * Automatically processes queue when network reconnects
     */
    private async setupNetworkListener() {
        // Only setup listener on native platforms
        if (!Capacitor.isNativePlatform()) {
            console.log('[OfflineQueue] Skipping network listener setup (not native platform)');
            return;
        }

        try {
            Network.addListener('networkStatusChange', async (status) => {
                console.log('[OfflineQueue] Network status changed:', status);

                if (status.connected && !this.processing && this.queue.length > 0) {
                    console.log('[OfflineQueue] Network reconnected, processing queue...');
                    await this.processQueue();
                }
            });

            console.log('[OfflineQueue] Network listener setup complete');
        } catch (error) {
            console.error('[OfflineQueue] Failed to setup network listener:', error);
        }
    }

    /**
     * Add a request to the queue
     * @param type - Type of friend operation
     * @param payload - Request payload
     * @returns Queue item ID
     */
    async add(type: QueuedRequest['type'], payload: any): Promise<string> {
        const request: QueuedRequest = {
            id: crypto.randomUUID(),
            type,
            payload,
            timestamp: Date.now(),
            retries: 0,
        };

        // Check for duplicates
        const duplicate = this.queue.find(
            (r) => r.type === type && JSON.stringify(r.payload) === JSON.stringify(payload)
        );

        if (duplicate) {
            console.log('[OfflineQueue] Duplicate request detected, skipping:', type);
            return duplicate.id;
        }

        this.queue.push(request);
        this.saveQueue();

        console.log(`[OfflineQueue] Added ${type} request to queue (${this.queue.length} total)`);

        // Try to process immediately if online
        if (Capacitor.isNativePlatform()) {
            const status = await Network.getStatus();
            if (status.connected) {
                await this.processQueue();
            }
        } else {
            // On web, assume online and try to process
            await this.processQueue();
        }

        return request.id;
    }

    /**
     * Process all queued requests
     * Executes requests in order, with retry logic
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        console.log(`[OfflineQueue] Processing ${this.queue.length} queued requests...`);

        while (this.queue.length > 0) {
            const request = this.queue[0];

            try {
                console.log(`[OfflineQueue] Executing ${request.type} request (attempt ${request.retries + 1})`);
                await this.executeRequest(request);

                // Remove on success
                this.queue.shift();
                console.log(`[OfflineQueue] Request completed successfully (${this.queue.length} remaining)`);
            } catch (error) {
                console.error(`[OfflineQueue] Request failed:`, error);
                request.retries++;

                if (request.retries >= this.MAX_RETRIES) {
                    console.error(`[OfflineQueue] Max retries (${this.MAX_RETRIES}) reached, removing request:`, request);
                    this.queue.shift();
                } else {
                    console.log(`[OfflineQueue] Will retry request (${request.retries}/${this.MAX_RETRIES})`);
                    break; // Stop processing on error, will retry later
                }
            }

            this.saveQueue();
        }

        this.processing = false;

        if (this.queue.length === 0) {
            console.log('[OfflineQueue] Queue processing complete, all requests processed');
        }
    }

    /**
     * Execute a single queued request
     * @param request - The request to execute
     */
    private async executeRequest(request: QueuedRequest) {
        // Dynamic import to avoid circular dependency
        const { friendsService } = await import('./friendsService');

        switch (request.type) {
            case 'friend_request':
                return friendsService.sendFriendRequest(
                    request.payload.receiverId,
                    request.payload.message
                );

            case 'accept':
                return friendsService.acceptFriendRequest(request.payload.requestId);

            case 'reject':
                return friendsService.rejectFriendRequest(request.payload.requestId);

            case 'unfriend':
                return friendsService.unfriend(request.payload.friendId);

            case 'block':
                return friendsService.blockUser(
                    request.payload.userId,
                    request.payload.reason
                );

            default:
                throw new Error(`Unknown request type: ${(request as any).type}`);
        }
    }

    /**
     * Get count of queued requests
     * @returns Number of requests in queue
     */
    getQueuedCount(): number {
        return this.queue.length;
    }

    /**
     * Get all queued requests
     * @returns Array of queued requests
     */
    getQueue(): QueuedRequest[] {
        return [...this.queue];
    }

    /**
     * Clear all queued requests
     */
    clearQueue() {
        this.queue = [];
        this.saveQueue();
        console.log('[OfflineQueue] Queue cleared');
    }

    /**
     * Check if network is currently connected
     * @returns True if connected, false otherwise
     */
    async isOnline(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) {
            // On web, use navigator.onLine
            return navigator.onLine;
        }

        try {
            const status = await Network.getStatus();
            return status.connected;
        } catch (error) {
            console.error('[OfflineQueue] Failed to check network status:', error);
            return false;
        }
    }
}

/**
 * Singleton instance of offline queue
 */
export const offlineQueue = new OfflineQueue();
