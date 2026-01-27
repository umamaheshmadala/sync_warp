
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ysxmgbblljoyebvugrfo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI'

async function testViewAccess() {
    console.log('--- Testing View Access ---')

    // 1. Login as Admin
    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: auth, error: loginError } = await authClient.auth.signInWithPassword({
        email: 'testuser1@gmail.com',
        password: 'Testuser@1'
    })

    if (loginError) {
        console.error('Login failed:', loginError)
        return
    }
    console.log('Logged in as:', auth.user.email)

    // 2. Create Authenticated Client
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${auth.session.access_token}`
            }
        }
    })

    // 3. Query the View
    const { data: viewData, error: viewError } = await userClient
        .from('review_report_counts')
        .select('*')

    if (viewError) {
        console.error('View Error:', viewError)
    } else {
        console.log('View Data Count:', viewData.length)
        console.log('View Data:', JSON.stringify(viewData, null, 2))
    }

    // 4. Query the Table directly (to check RLS on table)
    const { data: tableData, error: tableError } = await userClient
        .from('review_reports')
        .select('*')
        .eq('status', 'pending')

    if (tableError) {
        console.error('Table Error:', tableError)
    } else {
        console.log('Direct Table Count:', tableData.length)
    }
}

testViewAccess()
