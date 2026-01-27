
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ysxmgbblljoyebvugrfo.supabase.co'
// Using anon key for both because I don't have service role key in .env, and I want to test user access anyway.
// But wait, the first query in script attempts to use 'supabase' client which typically needs a key.
// I will use ANON key.
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testFetch() {
    console.log('Fetching pending reviews...')

    // 1. Fetch RAW reviews without join
    const { data: rawReviews, error: rawError } = await supabase
        .from('business_reviews')
        .select('*')
        .eq('moderation_status', 'pending')

    console.log('Raw Count:', rawReviews?.length)
    if (rawError) console.error('Raw Error:', rawError)

    // 2. Fetch with Join (simulating existing code)
    // Note: Service Role bypasses RLS, so this tests the Query Structure, not RLS permissions directly.
    // To test RLS, we'd need to sign in as testuser1.

    const { data: auth } = await supabase.auth.signInWithPassword({
        email: 'testuser1@gmail.com',
        password: 'Testuser@1'
    })

    if (!auth.user) {
        console.error('Login failed')
        return
    }

    console.log('Logged in as:', auth.user.email)

    // Use a new client with the user's session to respect RLS
    const userClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI', {
        global: {
            headers: {
                Authorization: `Bearer ${auth.session.access_token}`
            }
        }
    })

    const { data: joinedReviews, error: joinedError } = await userClient
        .from('business_reviews')
        .select(`
        *,
        business:businesses (id, name)
    `)
        .eq('moderation_status', 'pending')
        .is('deleted_at', null)

    console.log('Joined Reviews (User Client):', joinedReviews?.length)
    if (joinedError) console.error('Joined Error:', joinedError)
    else console.log('First Review Business:', joinedReviews?.[0]?.business)
}

testFetch()
