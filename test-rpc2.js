import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: convs, error: convError } = await supabase.from('conversations').select('id').limit(1);
  if (convs && convs.length > 0) {
    const { dataMsg, errorMsg } = await supabase.rpc('get_messages_v2', {
      p_conversation_id: convs[0].id,
      p_limit: 10
    });
    console.log("get_messages_v2 error:", errorMsg);
  } else {
    console.log("No conversations found.");
  }
}
test();
