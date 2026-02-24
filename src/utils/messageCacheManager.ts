import { queryClient } from '../lib/react-query';
import { Message } from '../types/messaging';

/**
 * Utility functions for mutating the React Query message cache.
 * Replaces the old Zustand messagingStore actions.
 */

export const messageCacheManager = {
    addOptimisticMessage: (conversationId: string, message: Message) => {
        if (!conversationId) return;
        queryClient.setQueryData(['messages', conversationId], (old: any) => {
            const currentMessages = old?.messages || [];
            return { ...old, messages: [...currentMessages, message] };
        });
    },

    replaceOptimisticMessage: (conversationId: string, tempId: string, confirmedMessage: Message) => {
        if (!conversationId) return;
        queryClient.setQueryData(['messages', conversationId], (old: any) => {
            const currentMessages = old?.messages || [];
            if (currentMessages.some((m: Message) => m.id === confirmedMessage.id)) {
                return {
                    ...old,
                    messages: currentMessages.map((m: Message) => m.id === tempId ? null : m).filter(Boolean)
                };
            }
            return {
                ...old,
                messages: currentMessages.map((m: Message) => m.id === tempId ? confirmedMessage : m)
            };
        });
    },

    removeMessage: (conversationId: string, id: string) => {
        if (!conversationId) return;
        queryClient.setQueryData(['messages', conversationId], (old: any) => {
            const currentMessages = old?.messages || [];
            return { ...old, messages: currentMessages.filter((m: Message) => m.id !== id && m._tempId !== id) };
        });
    },

    updateMessage: (conversationId: string, id: string, updates: Partial<Message>) => {
        if (!conversationId) return;
        queryClient.setQueryData(['messages', conversationId], (old: any) => {
            const currentMessages = old?.messages || [];
            return {
                ...old,
                messages: currentMessages.map((m: Message) => (m.id === id || m._tempId === id) ? { ...m, ...updates } : m)
            };
        });
    },

    updateMessageProgress: (conversationId: string, tempId: string, progress: number) => {
        messageCacheManager.updateMessage(conversationId, tempId, { _progress: progress } as Partial<Message>);
    },

    markMessageFailed: (conversationId: string, tempId: string) => {
        messageCacheManager.updateMessage(conversationId, tempId, { _failed: true, status: 'failed' } as Partial<Message>);
    },

    getMessages: (conversationId: string) => {
        if (!conversationId) return [];
        const data: any = queryClient.getQueryData(['messages', conversationId]);
        return data?.messages || [];
    },

    setMessages: (conversationId: string, messages: Message[]) => {
        if (!conversationId) return;
        queryClient.setQueryData(['messages', conversationId], (old: any) => {
            return {
                ...old,
                messages: messages,
                hasMore: old?.hasMore ?? true
            };
        });
    },

    upsertMessages: (messages: Message[]) => {
        const messagesByConversation: Record<string, Message[]> = {};
        messages.forEach(msg => {
            const existing = messagesByConversation[msg.conversation_id] || [];
            messagesByConversation[msg.conversation_id] = [...existing, msg];
        });

        Object.entries(messagesByConversation).forEach(([conversationId, newMsgs]) => {
            queryClient.setQueryData(['messages', conversationId], (old: any) => {
                const currentMessages = old?.messages || [];
                const msgRecord: Record<string, Message> = {};
                currentMessages.forEach((m: Message) => { msgRecord[m.id] = m; });

                newMsgs.forEach(msg => {
                    msgRecord[msg.id] = msg;
                });

                const sortedMessages = Object.values(msgRecord).sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );

                return {
                    ...old,
                    messages: sortedMessages
                };
            });
        });
    }
};
