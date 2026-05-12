import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'testuser1@gmail.com',
    password: 'Testuser@1'
  })

  if (authError || !authData.user) {
    console.error('Login Failed:', authError)
    process.exit(1)
  }

  console.log('Logged in as:', authData.user.id)

  const { data: convs, error: convError } = await supabase
    .from('conversation_list')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(1)

  if (convError) {
    console.error('Conv Error:', convError)
    process.exit(1)
  }

  const cid = convs[0].conversation_id
  console.log('Latest Conversation ID (Sidebar):', cid)
  console.log('Sidebar Last Message:', `${convs[0].last_message_preview} at ${convs[0].last_message_at}`)

  const { data: msgs, error: msgsError } = await supabase.rpc('get_messages_v2', {
    p_conversation_id: cid,
    p_limit: 5
  })

  if (msgsError) {
    console.error('Msg Error:', msgsError)
  } else {
    console.log(`get_messages_v2 returned ${msgs.length} messages (Newest first). Newest 5:`)
    console.log(JSON.stringify(msgs.map(m => ({
      id: m.id,
      created_at: m.created_at,
      content: m.content,
      type: m.type,
      deleted: m.is_deleted,
      conversation_id: m.conversation_id
    })), null, 2))
  }
}

test()
