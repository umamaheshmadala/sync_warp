
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// ideally service role key if possible, but anon might work if RLS allows reading public business data
// For this environment, I'll try to find the service role key or just use anon.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // 1. Find the business "Van Heusen"
    const { data: businesses, error: busError } = await supabase
        .from('businesses')
        .select('id, name, owner_id, logo_url, is_claimed')
        .ilike('name', '%Van Heusen%');

    if (busError) {
        console.error('Error fetching business:', busError);
    } else {
        console.log('--- Businesses found ---');
        console.table(businesses);
    }

    // 2. Fetch latest notifications to inspect payload
    const { data: notifications, error: notifError } = await supabase
        .from('notification_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (notifError) {
        console.error('Error fetching notifications:', notifError);
    } else {
        console.log('--- Latest Notifications ---');
        notifications?.forEach(n => {
            console.log(`\nID: ${n.id}`);
            console.log(`Type: ${n.notification_type}`);
            console.log(`User ID: ${n.user_id}`);
            console.log(`Body: ${n.body}`);
            console.log(`Data:`, JSON.stringify(n.data, null, 2));
        });
    }
}

main();
