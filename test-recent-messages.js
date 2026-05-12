import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function check() {
  try {
    // Get the most recent 5 messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, content, type, link_previews, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
      
    console.log("Error:", error);
    console.log("Recent messages:");
    console.dir(messages, { depth: null });
  } catch(e) {
    console.log("Catch Error:", e);
  }
}

check();
