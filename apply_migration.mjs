// Apply upsert_contact_hashes function directly
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://ysxmgbblljoyebvugrfo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI';

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
CREATE OR REPLACE FUNCTION upsert_contact_hashes(
    p_user_id UUID,
    p_phone_hashes TEXT[]
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete existing contact hashes for this user
    DELETE FROM contact_hashes
    WHERE user_id = p_user_id;
    
    -- Insert new contact hashes
    INSERT INTO contact_hashes (user_id, phone_hash, updated_at)
    SELECT 
        p_user_id,
        unnest(p_phone_hashes),
        NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_contact_hashes(UUID, TEXT[]) TO authenticated;
`;

console.log('Creating upsert_contact_hashes function...\n');

// Note: This won't work with anon key, we need service role key
// But let's try anyway
const { data, error } = await supabase.rpc('exec_sql', { sql });

if (error) {
    console.error('❌ Error:', error);
    console.log('\n⚠️  Cannot create function with anon key.');
    console.log('Please run this SQL manually in Supabase SQL Editor:\n');
    console.log(sql);
} else {
    console.log('✅ Function created successfully!');
}
