import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if(!url || !key) {
  console.log("Missing credentials!");
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  try {
    const { data: q1, error: e1 } = await supabase.from('messages').select('*').limit(1);
    console.log("Error querying messages:", e1);
    console.log("Keys in message object:", q1 && q1.length > 0 ? Object.keys(q1[0]) : "No messages found");
  } catch(e) {
    console.log("Exception:", e);
  }
}
test();
