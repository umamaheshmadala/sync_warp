
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabaseAdmin, resetDatabase } from './setup';

describe('Database Triggers', () => {
    let userA: any;

    beforeAll(async () => {
        const emailA = `trigger_user_${Date.now()}@test.com`;
        const { data } = await supabaseAdmin.auth.signUp({ email: emailA, password: 'Password123!' });
        userA = data.user;
    });

    afterAll(async () => {
        await resetDatabase();
        if (userA) await supabaseAdmin.auth.admin.deleteUser(userA.id);
    });

    it('New message should update conversation last_message and updated_at', async () => {
        // 1. Create Conversation
        // 1. Create Conversation
        const { data: conv, error: convError } = await supabaseAdmin.from('conversations').insert({
            type: 'direct',
            // Constraint requires >= 2 participants
            participants: [userA.id, '00000000-0000-0000-0000-000000000001']
        }).select().single();
        if (convError) throw new Error(`Conv Insert Error: ${JSON.stringify(convError)}`);
        if (!conv) throw new Error('Failed to create trigger conversation (null data)');
        await supabaseAdmin.from('conversation_participants').insert({
            conversation_id: conv.id,
            user_id: userA.id
        });

        const initialUpdatedAt = new Date(conv.updated_at).getTime();

        // 2. Insert Message
        const { error } = await supabaseAdmin.from('messages').insert({
            conversation_id: conv.id,
            sender_id: userA.id,
            content: 'Trigger Test'
        });
        expect(error).toBeNull();

        // 3. Verify Trigger Effect
        const { data: updatedConv } = await supabaseAdmin.from('conversations').select('*').eq('id', conv.id).single();

        expect(updatedConv.last_message).toBe('Trigger Test');
        expect(new Date(updatedConv.updated_at).getTime()).toBeGreaterThan(initialUpdatedAt);
    });
});
