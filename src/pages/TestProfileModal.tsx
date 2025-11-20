import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FriendProfileModal } from '@/components/friends/FriendProfileModal';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export default function TestProfileModal() {
    const [isOpen, setIsOpen] = useState(false);
    const user = useAuthStore((state) => state.user);

    // Fetch user's first friend for testing with real data
    const { data: friends, isLoading: loadingFriends, error: friendsError } = useQuery({
        queryKey: ['test-friends', user?.id],
        queryFn: async () => {
            console.log('🔍 Fetching friends for user:', user?.id);

            // First, get the friend IDs
            const { data: friendships, error: friendshipsError } = await supabase
                .from('friendships')
                .select('friend_id')
                .eq('user_id', user?.id)
                .eq('status', 'active')
                .limit(5);

            if (friendshipsError) {
                console.error('❌ Friendships query error:', friendshipsError);
                throw friendshipsError;
            }

            if (!friendships || friendships.length === 0) {
                console.log('📊 No friendships found');
                return [];
            }

            // Then, get the profile data for those friends
            const friendIds = friendships.map(f => f.friend_id);
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', friendIds);

            if (profilesError) {
                console.error('❌ Profiles query error:', profilesError);
                throw profilesError;
            }

            // Combine the data
            const result = friendships.map(friendship => ({
                friend_id: friendship.friend_id,
                profiles: profiles?.find(p => p.id === friendship.friend_id)
            }));

            console.log('📊 Friendships query result:', { count: result.length, data: result });
            return result;
        },
        enabled: !!user?.id,
        refetchOnMount: true,
        staleTime: 0, // Always refetch to ensure fresh data
    });

    console.log('👥 Friends state:', { friends, loadingFriends, friendsError, userId: user?.id });

    const testFriendId = friends?.[0]?.friend_id || '';

    return (
        <div className="p-8 flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-6">Friend Profile Modal Test</h1>

            <div className="p-6 bg-white rounded-lg shadow-md text-center max-w-md">
                {loadingFriends ? (
                    <p className="text-gray-600">Loading your friends...</p>
                ) : friends && friends.length > 0 ? (
                    <>
                        <p className="mb-4 text-gray-600">
                            Testing with real friend data:<br />
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm mt-2 inline-block">
                                {(friends[0]?.profiles as any)?.full_name}
                            </code>
                        </p>

                        <Button onClick={() => setIsOpen(true)} disabled={!testFriendId}>
                            Open Profile Modal
                        </Button>

                        {friends.length > 1 && (
                            <p className="mt-4 text-xs text-gray-500">
                                You have {friends.length} friends. Showing first friend.
                            </p>
                        )}
                    </>
                ) : (
                    <div className="text-center">
                        <p className="text-gray-600 mb-4">
                            No friends found in your account.
                        </p>
                        <p className="text-sm text-gray-500">
                            Add some friends first to test the profile modal with real data.
                        </p>
                    </div>
                )}
            </div>

            {testFriendId && (
                <FriendProfileModal
                    friendId={testFriendId}
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
