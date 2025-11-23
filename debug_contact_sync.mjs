// Debug script to check contact sync status
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysxmgbblljoyebvugrfo.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugContactSync() {
    console.log('🔍 Checking contact sync status...\n');

    // Query 1: Check test users' phone numbers and sync status
    const { data: testUsers, error: error1 } = await supabase.rpc('execute_sql', {
        query: `
      SELECT 
        p.id,
        p.full_name,
        p.email,
        p.phone,
        COUNT(ch.phone_hash) as contacts_synced,
        MAX(ch.updated_at) as last_sync
      FROM profiles p
      LEFT JOIN contact_hashes ch ON ch.user_id = p.id
      WHERE p.full_name LIKE '%Test%'
         OR p.email LIKE '%test%'
      GROUP BY p.id, p.full_name, p.email, p.phone
      ORDER BY p.full_name;
    `
    });

    if (error1) {
        console.error('❌ Error querying test users:', error1);

        // Try direct query instead
        console.log('\n📋 Trying direct profile query...\n');

        const { data: profiles, error: error2 } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone')
            .or('full_name.ilike.%Test%,email.ilike.%test%');

        if (error2) {
            console.error('❌ Error:', error2);
            return;
        }

        console.log('Test Users:');
        console.table(profiles);

        // Check contact hashes for each user
        for (const profile of profiles || []) {
            const { data: hashes, error: error3 } = await supabase
                .from('contact_hashes')
                .select('phone_hash, updated_at')
                .eq('user_id', profile.id);

            console.log(`\n${profile.full_name} (${profile.email}):`);
            console.log(`  Phone: ${profile.phone || 'NOT SET'}`);
            console.log(`  Contacts synced: ${hashes?.length || 0}`);
            if (hashes && hashes.length > 0) {
                console.log(`  Last sync: ${hashes[0].updated_at}`);
            }
        }
    } else {
        console.log('Test Users:');
        console.table(testUsers);
    }

    // Query 2: Check your contact sync status
    console.log('\n\n🔍 Checking YOUR contact sync status...\n');

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { data: yourHashes } = await supabase
            .from('contact_hashes')
            .select('phone_hash, updated_at')
            .eq('user_id', user.id);

        console.log(`Your user ID: ${user.id}`);
        console.log(`Your email: ${user.email}`);
        console.log(`Contacts you've synced: ${yourHashes?.length || 0}`);

        if (yourHashes && yourHashes.length > 0) {
            console.log(`Last sync: ${yourHashes[0].updated_at}`);
            console.log('\nFirst 5 contact hashes:');
            console.table(yourHashes.slice(0, 5));
        }
    } else {
        console.log('⚠️  Not authenticated - cannot check your sync status');
    }
}

debugContactSync().catch(console.error);
