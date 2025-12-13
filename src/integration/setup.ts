
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll } from 'vitest';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SUPABASE_URL = 'https://ysxmgbblljoyebvugrfo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODEwNTYyOSwiZXhwIjoyMDczNjgxNjI5fQ.bInMdf9SBSiyg4XDp8fD5bczfaMCJuTbSe3nEMNr0xw';

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// Store test user IDs created during tests for cleanup
let testUserIds: string[] = [];

export const addTestUserId = (userId: string) => {
    testUserIds.push(userId);
};

/**
 * SAFE reset - Only deletes data created by integration tests
 * Uses testUserIds collected during test runs to scope deletion
 * NEVER deletes production user data
 */
export const resetDatabase = async () => {
    if (testUserIds.length === 0) {
        console.log('No test users to clean up');
        return;
    }

    console.log(`Cleaning up ${testUserIds.length} test user(s):`, testUserIds);

    try {
        // Only delete data associated with test users
        for (const userId of testUserIds) {
            // Delete messages sent by test user
            await supabaseAdmin.from('messages').delete().eq('sender_id', userId);

            // Delete conversation_participants for test user
            await supabaseAdmin.from('conversation_participants').delete().eq('user_id', userId);

            // Delete conversations where test user is a participant
            // Note: This uses the participants array - may need RPC for complex cleanup
            await supabaseAdmin.from('conversations').delete().contains('participants', [userId]);

            // Delete blocked_users entries for test user
            await supabaseAdmin.from('blocked_users').delete().eq('blocker_id', userId);
            await supabaseAdmin.from('blocked_users').delete().eq('blocked_id', userId);
        }

        console.log('✅ Test data cleanup complete');
    } catch (error) {
        console.warn('resetDatabase cleanup failed:', error);
    }

    // Clear the list after cleanup
    testUserIds = [];
};

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found in env. Tests needing Admin might fail.');
}

beforeAll(async () => {
    // Optional: Verify connection
});

afterAll(async () => {
    // Cleanup is now handled per-test via resetDatabase()
});
