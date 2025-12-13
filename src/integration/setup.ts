
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll } from 'vitest';
import { execSync } from 'child_process';

const SUPABASE_URL = 'https://ysxmgbblljoyebvugrfo.supabase.co'; // Remote Supabase for integration tests
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODEwNTYyOSwiZXhwIjoyMDczNjgxNjI5fQ.bInMdf9SBSiyg4XDp8fD5bczfaMCJuTbSe3nEMNr0xw';
// Note: In a real repo this keys would be in .env.test.local. 
// For this environment, we might need to rely on the user having them set or using default CLI keys.

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

export const resetDatabase = async () => {
    // For remote Supabase, we delete test data directly via admin client
    // Only delete data created by integration tests (using test email patterns)
    try {
        // Delete messages first (FK constraint)
        await supabaseAdmin.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        // Delete conversation_participants
        await supabaseAdmin.from('conversation_participants').delete().neq('conversation_id', '00000000-0000-0000-0000-000000000000');
        // Delete conversations
        await supabaseAdmin.from('conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        // Delete blocked_users test entries
        await supabaseAdmin.from('blocked_users').delete().neq('blocker_id', '00000000-0000-0000-0000-000000000000');
    } catch (error) {
        console.warn('resetDatabase cleanup failed:', error);
    }
};

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found in env. Tests needing Admin might fail.');
}

beforeAll(async () => {
    // Optional: Check connection
});

afterAll(async () => {
    // Cleanup
});
