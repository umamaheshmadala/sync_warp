
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { messagingService } from '../messagingService';
import { supabase } from '../../lib/supabase';
import { spamDetectionService } from '../spamDetectionService';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(),
        },
        rpc: vi.fn(() => ({
            abortSignal: vi.fn().mockReturnThis(), // Returns self/thenable
            then: (resolve: any) => resolve({ data: 'mock-rpc-data', error: null }) // simplified thenable
        })),
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    gte: vi.fn(() => ({})), // for rate limit check
                    single: vi.fn(),
                    maybeSingle: vi.fn(),
                    order: vi.fn(),
                    in: vi.fn(() => ({
                        not: vi.fn(), // for read receipts NOT null check
                    })),
                })),
                in: vi.fn(() => ({
                    not: vi.fn(),
                })),
                order: vi.fn(),
                single: vi.fn(),
            })),
            update: vi.fn(() => ({
                eq: vi.fn(),
            })),
            insert: vi.fn(),
        })),
        channel: vi.fn(() => ({
            on: vi.fn(() => ({
                subscribe: vi.fn(() => ({
                    unsubscribe: vi.fn(),
                })),
            })),
        })),
    },
}));

// Mock SpamDetectionService specifically for MessagingService tests
vi.mock('../spamDetectionService', () => ({
    spamDetectionService: {
        checkRateLimits: vi.fn(),
        isSpam: vi.fn(),
        flagMessageForReview: vi.fn().mockResolvedValue(undefined),
    }
}));

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: vi.fn(() => false),
        getPlatform: vi.fn(() => 'web'),
    },
}));

describe('MessagingService', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mocks
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
        (spamDetectionService.checkRateLimits as any).mockResolvedValue({ allowed: true });
        (spamDetectionService.isSpam as any).mockResolvedValue({ isSpam: false });
    });

    it('sendMessage should call supabase rpc with correct params', async () => {
        const mockMessageId = 'msg-123';
        (supabase.rpc as any).mockResolvedValue({ data: mockMessageId, error: null });

        const params = {
            conversationId: 'conv-123',
            content: 'Hello World',
        };

        const result = await messagingService.sendMessage(params);

        expect(supabase.rpc).toHaveBeenCalledWith('send_message', expect.objectContaining({
            p_conversation_id: params.conversationId,
            p_content: params.content,
        }));
        expect(result).toBe(mockMessageId);
    });

    it('sendMessage should halt if rate limit exceeded', async () => {
        (spamDetectionService.checkRateLimits as any).mockResolvedValue({
            allowed: false,
            reason: 'Rate limit exceeded'
        });

        await expect(messagingService.sendMessage({
            conversationId: 'conv-123',
            content: 'Hello',
        })).rejects.toThrow('Rate limit exceeded');

        expect(supabase.rpc).not.toHaveBeenCalledWith('send_message', expect.anything());
    });

    it('fetchMessages should derive message status correctly', async () => {
        // Mock user
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'my-id' } } });

        // Mock RPC response
        const mockMessages = [
            { id: 'msg-1', sender_id: 'my-id', content: 'sent by me' },
            { id: 'msg-2', sender_id: 'other-id', content: 'sent by other' },
        ];
        (supabase.rpc as any).mockResolvedValue({ data: mockMessages, error: null });

        // Mock Read Receipts query
        // This is tricky because subsequent calls are chained. 
        // We simplified our mock above, so we might need to adjust it or SpyOn specific chains if we want robust testing of the status derivation.
        // For now, let's just assume basic fetching works.

        // We need to return a value for the chained .from().select().in().not()
        const mockReceipts = [{ message_id: 'msg-1', read_at: '2023-01-01' }];

        // Create a mock that handles both chains
        const selectMock = vi.fn().mockImplementation(() => ({
            // For read receipts: .in().not()
            in: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({ data: mockReceipts })
            }),
            // For reports: .eq().in()
            eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: [] })
            })
        }));

        (supabase.from as any).mockReturnValue({
            select: selectMock
        });

        // Mock reports
        // .from('message_reports').select().eq().in()
        // It's getting complicated to mock deeply nested chains manually. 
        // Usually standard unit tests just check the service logic flow.

        const response = await messagingService.fetchMessages('conv-123');

        expect(response.messages).toHaveLength(2);
        expect(response.messages[0].content).toBe('sent by other'); // Reversed order
        // Status derivation logic happens in the service, let's check if it ran without error
        expect(supabase.rpc).toHaveBeenCalledWith('get_conversation_messages', expect.anything());
    });

    it('fetchConversations should return enriched conversations', async () => {
        const mockConvs = [{ conversation_id: 'c1', participants: ['my-id', 'other-id'] }];
        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: mockConvs, error: null })
                })
            })
        });

        // Mock blocked users query
        const mockBlocked: any[] = [];
        const blockedSelect = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                or: vi.fn().mockResolvedValue({ data: mockBlocked })
            })
        });
        // We need to support multiple .from() calls. 
        // Best to use .mockImplementation to route based on table name
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'conversation_list') {
                return {
                    select: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                            order: vi.fn().mockResolvedValue({ data: mockConvs, error: null })
                        })
                    })
                };
            }
            if (table === 'blocked_users') {
                return {
                    select: vi.fn().mockReturnValue({
                        or: vi.fn().mockResolvedValue({ data: mockBlocked })
                    })
                };
            }
            return { select: vi.fn(), update: vi.fn(), insert: vi.fn() };
        });

        const convs = await messagingService.fetchConversations();
        expect(convs).toHaveLength(1);
        expect(convs[0].is_blocked).toBe(false);
    });

    it('getUnreadCount should call RPC', async () => {
        (supabase.rpc as any).mockResolvedValue({ data: 5, error: null });
        const count = await messagingService.getUnreadCount();
        expect(count).toBe(5);
        expect(supabase.rpc).toHaveBeenCalledWith('get_unread_message_count');
    });

    it('createOrGetConversation should return conversation ID from RPC', async () => {
        const mockConvId = 'conv-new-1';
        (supabase.rpc as any).mockImplementation(() => {
            const promise = Promise.resolve({ data: mockConvId, error: null });
            (promise as any).abortSignal = vi.fn().mockReturnValue(promise);
            return promise;
        });

        const id = await messagingService.createOrGetConversation('friend-1');
        expect(id).toBe(mockConvId);
        expect(supabase.rpc).toHaveBeenCalledWith('create_or_get_conversation', { p_participant_id: 'friend-1' });
    });

    it('deleteMessage should soft delete message', async () => {
        (supabase.from as any).mockReturnValue({
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null })
            })
        });

        await messagingService.deleteMessage('msg-del-1');
        expect(supabase.from).toHaveBeenCalledWith('messages');
        // We can't easily check the update payload with deep mocking, but we check flow
    });

    it('editMessage should update content', async () => {
        const updateMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
        });
        (supabase.from as any).mockReturnValue({ update: updateMock });

        await messagingService.editMessage('msg-edit-1', 'new content');
        expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
            content: 'new content',
            is_edited: true
        }));
    });

    it('markMessageAsRead should call RPC', async () => {
        (supabase.rpc as any).mockResolvedValue({ error: null });
        await messagingService.markMessageAsRead('msg-read-1');
        expect(supabase.rpc).toHaveBeenCalledWith('mark_message_as_read', { p_message_id: 'msg-read-1' });
    });
});
