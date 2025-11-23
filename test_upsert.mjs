// Test upsert_contact_hashes function directly
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysxmgbblljoyebvugrfo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpsert() {
    console.log('🧪 Testing upsert_contact_hashes function...\n');

    // Get Test User 1
    const { data: user } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', 'testuser1@gmail.com')
        .single();

    if (!user) {
        console.error('❌ Test User 1 not found');
        return;
    }

    console.log(`Testing with: ${user.full_name} (${user.id})\n`);

    // Test with some dummy hashes
    const testHashes = [
        'abc123def456',
        'xyz789ghi012',
        'test_hash_123'
    ];

    console.log(`Calling upsert_contact_hashes with ${testHashes.length} hashes...`);

    const { data, error } = await supabase.rpc('upsert_contact_hashes', {
        p_user_id: user.id,
        p_phone_hashes: testHashes
    });

    if (error) {
        console.error('\n❌ ERROR:', error);
        console.error('Message:', error.message);
        console.error('Details:', error.details);
        console.error('Hint:', error.hint);
        console.error('Code:', error.code);
    } else {
        console.log('\n✅ Function called successfully!');
        console.log('Response:', data);

        // Verify the hashes were inserted
        const { data: inserted } = await supabase
            .from('contact_hashes')
            .select('phone_hash')
            .eq('user_id', user.id);

        console.log(`\n📊 Hashes in database: ${inserted?.length || 0}`);
        if (inserted && inserted.length > 0) {
            console.log('First 3 hashes:');
            inserted.slice(0, 3).forEach((h, i) => {
                console.log(`  ${i + 1}. ${h.phone_hash}`);
            });
        }
    }
}

testUpsert().catch(console.error);
