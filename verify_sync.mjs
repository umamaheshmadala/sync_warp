// Verify contact sync is working after function creation
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysxmgbblljoyebvugrfo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySync() {
    console.log('🔍 Checking if contact sync is now working...\n');

    // Get test users
    const { data: testUsers } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .or('email.eq.testuser1@gmail.com,email.eq.testuser2@gmail.com,email.eq.testuser3@gmail.com');

    console.log('📋 Test Users Status:\n');

    for (const user of testUsers || []) {
        const { data: hashes } = await supabase
            .from('contact_hashes')
            .select('phone_hash, updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        const status = hashes && hashes.length > 0 ? '✅ SYNCED' : '❌ NOT SYNCED';
        const count = hashes?.length || 0;
        const lastSync = hashes && hashes.length > 0 ? new Date(hashes[0].updated_at).toLocaleString() : 'Never';

        console.log(`${status} ${user.full_name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Phone: ${user.phone || 'NOT SET'}`);
        console.log(`  Contacts: ${count}`);
        console.log(`  Last sync: ${lastSync}`);
        console.log('');
    }

    console.log('\n📝 Next Steps:');
    console.log('1. Log into each test account');
    console.log('2. Make sure they have YOUR phone number in their device contacts');
    console.log('3. Open the app and sync contacts');
    console.log('4. Run this script again to verify');
}

verifySync().catch(console.error);
