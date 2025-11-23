// Debug script to check contact sync and matching
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysxmgbblljoyebvugrfo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI';

const supabase = createClient(supabaseUrl, supabaseKey);

// Hash function (same as in contactSyncService.ts)
const normalizePhoneNumber = (phone) => {
    return phone.replace(/\D/g, '');
};

const hashPhoneNumber = async (phone) => {
    const normalized = normalizePhoneNumber(phone);
    const msgBuffer = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

async function debugMatching() {
    console.log('🔍 Deep dive into contact matching...\n');

    // Get all test users
    const { data: testUsers } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .or('email.eq.testuser1@gmail.com,email.eq.testuser2@gmail.com,email.eq.testuser3@gmail.com');

    console.log('📋 Test Users:');
    console.table(testUsers);

    // Check contact hashes for each test user
    for (const user of testUsers || []) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`👤 ${user.full_name} (${user.email})`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Phone in profile: ${user.phone || 'NOT SET'}`);

        if (user.phone) {
            const hash = await hashPhoneNumber(user.phone);
            console.log(`Phone hash: ${hash}`);
        }

        const { data: hashes } = await supabase
            .from('contact_hashes')
            .select('phone_hash, updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        console.log(`\nContacts synced: ${hashes?.length || 0}`);

        if (hashes && hashes.length > 0) {
            console.log(`Last sync: ${hashes[0].updated_at}`);
            console.log('\nFirst 3 contact hashes:');
            hashes.slice(0, 3).forEach((h, i) => {
                console.log(`  ${i + 1}. ${h.phone_hash}`);
            });
        }
    }

    // Now check if there are any matches
    console.log('\n\n🔍 Checking for potential matches...\n');

    for (const user of testUsers || []) {
        if (!user.phone) continue;

        const userPhoneHash = await hashPhoneNumber(user.phone);
        console.log(`\n${user.full_name}'s phone hash: ${userPhoneHash}`);

        // Check which users have this hash in their contacts
        const { data: matches } = await supabase
            .from('contact_hashes')
            .select('user_id')
            .eq('phone_hash', userPhoneHash)
            .neq('user_id', user.id);

        if (matches && matches.length > 0) {
            console.log(`✅ Found in ${matches.length} user(s)' contacts:`);

            for (const match of matches) {
                const { data: matchedUser } = await supabase
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', match.user_id)
                    .single();

                console.log(`   - ${matchedUser?.full_name} (${matchedUser?.email})`);
            }
        } else {
            console.log(`❌ NOT found in anyone's contacts`);
        }
    }

    // Check the match_contacts function
    console.log('\n\n🔍 Testing match_contacts function...\n');

    // Get one test user's contact hashes
    const testUser1 = testUsers?.find(u => u.email === 'testuser1@gmail.com');
    if (testUser1) {
        const { data: user1Hashes } = await supabase
            .from('contact_hashes')
            .select('phone_hash')
            .eq('user_id', testUser1.id);

        if (user1Hashes && user1Hashes.length > 0) {
            const hashArray = user1Hashes.map(h => h.phone_hash);

            console.log(`Calling match_contacts for ${testUser1.full_name}...`);
            console.log(`With ${hashArray.length} contact hashes`);

            const { data: matches, error } = await supabase
                .rpc('match_contacts', { contact_hashes: hashArray });

            if (error) {
                console.error('❌ Error calling match_contacts:', error);
            } else {
                console.log(`✅ match_contacts returned ${matches?.length || 0} matches`);
                if (matches && matches.length > 0) {
                    console.table(matches);
                }
            }
        } else {
            console.log('⚠️  Test User 1 has no contact hashes');
        }
    }
}

debugMatching().catch(console.error);
