
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
    console.log('--- DEBUG START ---');
    console.log(`Connecting to ${SUPABASE_URL}`);

    // Create a user first for FK constraints
    const email = `debug_${Date.now()}@test.com`;
    const { data: auth, error: authError } = await supabase.auth.signUp({
        email,
        password: 'Password123!'
    });

    if (authError) {
        console.error('Auth Error:', authError);
        return;
    }
    const userId = auth.user?.id;
    console.log('Created User:', userId);

    // Try Insert
    console.log('Attempting Insert...');
    const { data, error } = await supabase.from('conversations').insert({
        type: 'direct',
        participants: [userId]
    }).select();

    if (error) {
        console.error('INSERT ERROR FULL:', JSON.stringify(error, null, 2));
    } else {
        console.log('INSERT SUCCESS:', data);
    }

    // Cleanup
    await supabase.auth.admin.deleteUser(userId!);
    console.log('--- DEBUG END ---');
}

run();
