
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll } from 'vitest';
import { execSync } from 'child_process';

const SUPABASE_URL = 'http://127.0.0.1:54321'; // Force local for integration tests
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyZW5mc2x0aXRhbnJvemJrb2ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwMTA4NCwiZXhwIjoyMDcwNDc3MDg0fQ.Fr3YEKHMNJUDWLshpk1E_bbRd5chXVAdiS5RBgSPkwE';
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
    try {
        // Use the script defined in package.json which connects to port 54322
        // We pipe to null (Windows) or /dev/null to silence output
        const cmd = process.platform === 'win32' ? 'npm run db:seed:test > NUL 2>&1' : 'npm run db:seed:test > /dev/null 2>&1';
        execSync(cmd, { stdio: 'ignore' });
    } catch (error) {
        // Fallback: If npm script fails, try manual delete (though without service key this might fail too)
        console.warn('npm run db:seed:test failed, attempting manual cleanup...');
        if (supabaseAdmin) {
            await supabaseAdmin.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabaseAdmin.from('conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
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
