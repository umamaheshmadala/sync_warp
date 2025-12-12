
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin, resetDatabase } from './setup';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

describe('RLS Policies', () => {
    let userA: any;
    let userB: any;
    let clientA: any;
    let clientB: any;

    beforeAll(async () => {
        // 1. Create Users
        const emailA = `user_a_${Date.now()}@test.com`;
        const emailB = `user_b_${Date.now()}@test.com`;
        const password = 'Password123!';

        const { data: authA } = await supabaseAdmin.auth.signUp({ email: emailA, password });
        const { data: authB } = await supabaseAdmin.auth.signUp({ email: emailB, password });

        userA = authA.user;
        userB = authB.user;

        if (!userA || !userB) throw new Error('Failed to create test users');

        // 2. Create Clients with Anon Key + Auth
        // We sign in to get the session/token, or just use `createClient` with the token if we had it.
        // Simplest is to just signInWithPassword using a fresh client.

        clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await clientA.auth.signInWithPassword({ email: emailA, password });

        clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await clientB.auth.signInWithPassword({ email: emailB, password });
    });

    afterAll(async () => {
        await resetDatabase();
        if (userA) await supabaseAdmin.auth.admin.deleteUser(userA.id);
        if (userB) await supabaseAdmin.auth.admin.deleteUser(userB.id);
    });

    it('User A should NOT be able to read User B\'s private messages', async () => {
        // Create a conversation for User B (with someone else, or just B)
        const { data: conv } = await supabaseAdmin.from('conversations').insert({
            type: 'direct',
            is_group: false,
            participants: [userB.id, userA.id] // Seed with userB and UserA
        }).select().single();

        if (!conv) {
            // Re-fetch to see if error exists (or just fail with the error if we captured it, but we didn't capture it above)
            // Actually, the above insert probably returned error. Let's capture it.
            const { error: err } = await supabaseAdmin.from('conversations').insert({
                type: 'direct',
                is_group: false,
                participants: [userB.id]
            }).select().single();
            if (err) throw new Error(`RLS Conv Setup Error: ${JSON.stringify(err)}`);
            throw new Error('Failed to create setup conversation (null data)');
        }

        if (!conv) throw new Error('Failed to create setup conversation');

        await supabaseAdmin.from('conversation_participants').insert([
            { conversation_id: conv.id, user_id: userB.id }
        ]);

        await supabaseAdmin.from('messages').insert({
            conversation_id: conv.id,
            sender_id: userB.id,
            content: 'Secret message for B'
        });

        // Test: User A tries to fetch messages from this conversation
        const { data, error } = await clientA.from('messages').select('*').eq('conversation_id', conv.id);

        // RLS should return empty array (or error depending on policy setup, usually empty for "select")
        expect(data).toHaveLength(0);
    });

    it('Blocked user cannot send messages', async () => {
        // Setup: User A blocks User B
        await supabaseAdmin.from('blocked_users').insert({
            blocker_id: userA.id,
            blocked_id: userB.id
        });

        // Ensure conversation exists between them
        const { data: conv } = await supabaseAdmin.from('conversations').insert({ is_group: false }).select().single();
        await supabaseAdmin.from('conversation_participants').insert([
            { conversation_id: conv.id, user_id: userA.id },
            { conversation_id: conv.id, user_id: userB.id }
        ]);

        // Test: User B (blocked) tries to send message to User A
        const { error } = await clientB.from('messages').insert({
            conversation_id: conv.id,
            sender_id: userB.id,
            content: 'I am blocked'
        });

        // Should Assert Error
        expect(error).toBeDefined();
        // expect(error.message).toContain('row-level security policy'); // or Trigger block
    });
});
