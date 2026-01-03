
import { renderHook, waitFor, act } from '../../test/test-utils';
import { useMessages } from '../useMessages';
import { messagingService } from '../../services/messagingService';
import { realtimeService } from '../../services/realtimeService';
import { messageDeleteService } from '../../services/messageDeleteService';
import { useMessagingStore } from '../../store/messagingStore';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock services
vi.mock('../../services/messagingService');
vi.mock('../../services/realtimeService');
vi.mock('../../services/messageDeleteService');
vi.mock('../../store/authStore', () => ({
    useAuthStore: (selector: any) => selector({ user: { id: 'test-user-id' } })
}));

describe('useMessages', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useMessagingStore.getState().setMessages('conv-1', []);
        useMessagingStore.setState({ isLoadingMessages: false });

        // Setup service mocks
        (messagingService.fetchMessages as any).mockResolvedValue({ messages: [], hasMore: false });
        (messageDeleteService.getHiddenMessageIds as any).mockResolvedValue([]);
        (realtimeService.subscribeToMessages as any).mockReturnValue(() => { });
        (realtimeService.subscribeToMessageUpdates as any).mockReturnValue(() => { });
        (realtimeService.subscribeToReadReceipts as any).mockReturnValue(() => { });
    });

    it('should fetch messages on mount', async () => {
        const mockMessages = [{ id: '1', content: 'hello' }];
        (messagingService.fetchMessages as any).mockResolvedValue({ messages: mockMessages, hasMore: false });

        const { result } = renderHook(() => useMessages('conv-1'));

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(messagingService.fetchMessages).toHaveBeenCalledWith('conv-1', expect.any(Number));
        expect(result.current.messages).toEqual(mockMessages);
    });

    it('should handle loadMore', async () => {
        // Initial load
        const initialMessages = [{ id: '2', content: 'newest', created_at: '2023-01-02' }];
        (messagingService.fetchMessages as any).mockResolvedValueOnce({ messages: initialMessages, hasMore: true });

        const { result } = renderHook(() => useMessages('conv-1'));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // Load more
        const olderMessages = [{ id: '1', content: 'oldest', created_at: '2023-01-01' }];
        (messagingService.fetchMessages as any).mockResolvedValueOnce({ messages: olderMessages, hasMore: false });

        await act(async () => {
            await result.current.loadMore();
        });

        expect(messagingService.fetchMessages).toHaveBeenCalledWith('conv-1', expect.any(Number), '2'); // uses id of oldest message (initialMessages[0] reversed logic? actually hook logic says oldest is first if sorted DESC? let's check hook implementation)
        // Hook implementation: const oldestMessage = conversationMessages[0]; // Messages sorted DESC
        // Yes, so it uses the first message in the list as the cursor.

        expect(result.current.messages).toHaveLength(2);
        // Note: The store updates might merge/prepend. The test assumes prepend.
    });

    it('should subscribe to realtime updates', async () => {
        let onMessageCallback: any;
        (realtimeService.subscribeToMessages as any).mockImplementation((_id: string, cb: any) => {
            onMessageCallback = cb;
            return () => { };
        });

        const { result } = renderHook(() => useMessages('conv-1'));

        expect(realtimeService.subscribeToMessages).toHaveBeenCalledWith('conv-1', expect.any(Function));

        // Simulate incoming message
        const newMessage = {
            id: 'new-1',
            content: 'realtime msg',
            sender_id: 'other',
            conversation_id: 'conv-1',
            created_at: new Date().toISOString()
        };

        act(() => {
            if (onMessageCallback) {
                onMessageCallback(newMessage);
            }
        });

        // Verify message added to store
        // We can check result.current.messages because the hook subscribes to the store
        expect(result.current.messages).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'new-1' })]));
    });

    it('should derive delivered status for own realtime messages', async () => {
        let onMessageCallback: any;
        (realtimeService.subscribeToMessages as any).mockImplementation((_id: string, cb: any) => {
            onMessageCallback = cb;
            return () => { };
        });

        const { result } = renderHook(() => useMessages('conv-1'));

        const ownMessage = {
            id: 'my-new-1',
            content: 'my realtime msg',
            sender_id: 'test-user-id', // matches mock auth user
            conversation_id: 'conv-1',
            created_at: new Date().toISOString()
        };

        act(() => {
            onMessageCallback(ownMessage);
        });

        const addedMsg = result.current.messages.find(m => m.id === 'my-new-1');
        expect(addedMsg).toBeDefined();
        expect(addedMsg?.status).toBe('delivered');
    });
});
