
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load envs
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
// Use the key provided by user if env is missing
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyZW5mc2x0aXRhbnJvemJrb2ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkwMTA4NCwiZXhwIjoyMDcwNDc3MDg0fQ.Fr3YEKHMNJUDWLshpk1E_bbRd5chXVAdiS5RBgSPkwE';

console.log('Using URL:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
    console.log('--- DEBUG START ---');

    // 1. Create 2 Users
    const email1 = `debug1_${Date.now()}@test.com`;
    const email2 = `debug2_${Date.now()}@test.com`;

    console.log('Creating users...');
    const { data: u1, error: e1 } = await supabase.auth.signUp({ email: email1, password: 'Password123!' });
    const { data: u2, error: e2 } = await supabase.auth.signUp({ email: email2, password: 'Password123!' });

    if (e1 || e2) {
        console.error('User Init Error:', e1 || e2);
        return;
    }
    const uid1 = u1.user.id;
    const uid2 = u2.user.id;
    console.log('Users:', uid1, uid2);

    // 2. Insert Conversation
    console.log('Inserting Conversation...');
    const { data, error } = await supabase.from('conversations').insert({
        type: 'direct',
        participants: [uid1, uid2]
    }).select();

    if (error) {
        console.error('INSERT ERROR FULL:', JSON.stringify(error, null, 2));
    } else {
        console.log('INSERT SUCCESS:', data);
    }

    // Cleanup
    await supabase.auth.admin.deleteUser(uid1);
    await supabase.auth.admin.deleteUser(uid2);
    console.log('--- DEBUG END ---');
}

run();
