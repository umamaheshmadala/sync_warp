
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Checking Business ---');
    const { data: businesses, error: busError } = await supabase
        .from('businesses')
        .select('id, name, owner_id, logo_url')
        .ilike('name', '%Van Heusen%');

    if (busError) {
        console.error('Error fetching business:', busError);
    } else {
        console.table(businesses);
        if (businesses && businesses.length > 0) {
            const bus = businesses[0];
            if (!bus.owner_id) {
                console.warn('⚠️ Business has NO OWNER_ID. Notifications will NOT be sent.');
            } else {
                console.log(`✅ Business has owner_id: ${bus.owner_id}`);
            }
        }
    }

    console.log('\n--- Checking Notifications ---');
    // Try to determine timestamp column
    const { data: notifications, error: notifError } = await supabase
        .from('notification_log')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(5);

    if (notifError) {
        console.error('Error fetching notifications:', notifError);
    } else {
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
