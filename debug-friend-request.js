// Debug script to test friend request functionality
// Run with: node debug-friend-request.js

import { createClient } from '@supabase/supabase-js';

// Your Supabase configuration (replace with actual values)
const supabaseUrl = 'https://egixyqfqajlzuqeaexnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnaXh5cWZxYWpsenVxZWFleG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU4MDk1NDcsImV4cCI6MjA0MTM4NTU0N30.3RtwvPKbYEe5qIGCLrOGQQeY_6lW_WS32vdYmSQoVgw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFriendRequest() {
    console.log('🔍 Starting Friend Request Debug...\n');
    
    try {
        // 1. Check if we can connect to Supabase
        console.log('1. Testing Supabase connection...');
        const { data: testData, error: testError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .limit(1);
        
        if (testError) {
            console.log('❌ Supabase connection failed:', testError.message);
            return;
        }
        console.log('✅ Supabase connection successful');
        console.log('Test user:', testData[0]?.full_name || 'No users found');
        
        // 2. Get all profiles (potential friends)
        console.log('\n2. Getting available profiles...');
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .limit(5);
            
        if (profilesError) {
            console.log('❌ Failed to get profiles:', profilesError.message);
            return;
        }
        
        console.log(`✅ Found ${profiles.length} profiles:`);
        profiles.forEach((profile, index) => {
            console.log(`   ${index + 1}. ${profile.full_name} (${profile.id})`);
        });
        
        if (profiles.length < 2) {
            console.log('❌ Need at least 2 users to test friend requests');
            return;
        }
        
        const user1 = profiles[0];
        const user2 = profiles[1];
        
        // 3. Test friend request creation with raw INSERT
        console.log(`\n3. Testing friend request: ${user1.full_name} → ${user2.full_name}`);
        
        const { data: requestData, error: requestError } = await supabase
            .from('friend_requests')
            .insert({
                requester_id: user1.id,
                receiver_id: user2.id,
                status: 'pending'
            })
            .select('*')
            .single();
            
        if (requestError) {
            console.log('❌ Friend request failed:', requestError.message);
            console.log('Error details:', requestError);
            
            // Check if it's a duplicate
            if (requestError.code === '23505' || requestError.message.includes('duplicate')) {
                console.log('ℹ️  This might be a duplicate request. Checking existing requests...');
                
                const { data: existing } = await supabase
                    .from('friend_requests')
                    .select('*')
                    .or(`and(requester_id.eq.${user1.id},receiver_id.eq.${user2.id}),and(requester_id.eq.${user2.id},receiver_id.eq.${user1.id})`);
                    
                console.log('Existing requests:', existing);
            }
            
            return;
        }
        
        console.log('✅ Friend request created successfully!');
        console.log('Request ID:', requestData.id);
        
        // 4. Test the accept_friend_request_safe function
        console.log('\n4. Testing accept_friend_request_safe function...');
        
        const { data: acceptResult, error: acceptError } = await supabase
            .rpc('accept_friend_request_safe', { request_id: requestData.id });
            
        if (acceptError) {
            console.log('❌ Accept function failed:', acceptError.message);
            console.log('Error details:', acceptError);
        } else {
            console.log('✅ Accept function result:', acceptResult);
        }
        
        // 5. Check final state
        console.log('\n5. Checking final state...');
        
        const { data: finalRequests } = await supabase
            .from('friend_requests')
            .select('*')
            .eq('id', requestData.id);
            
        const { data: friendships } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(user1_id.eq.${user1.id},user2_id.eq.${user2.id}),and(user1_id.eq.${user2.id},user2_id.eq.${user1.id})`);
            
        console.log('Request status:', finalRequests[0]?.status);
        console.log('Friendship created:', friendships.length > 0 ? 'Yes' : 'No');
        
        // 6. Cleanup - Remove the test data
        console.log('\n6. Cleaning up test data...');
        
        // Remove friendship
        if (friendships.length > 0) {
            await supabase.from('friendships').delete().eq('id', friendships[0].id);
        }
        
        // Remove friend request
        await supabase.from('friend_requests').delete().eq('id', requestData.id);
        
        console.log('✅ Cleanup completed');
        
    } catch (error) {
        console.log('❌ Unexpected error:', error.message);
        console.log('Stack trace:', error.stack);
    }
}

// Run the debug
debugFriendRequest();