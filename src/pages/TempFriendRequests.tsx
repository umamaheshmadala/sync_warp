/**
 * Temporary Friend Requests Page
 * Quick page to accept pending friend requests
 * (Full version will be built in Story 9.3.2)
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { UserPlus, Check, X } from 'lucide-react';

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender: {
    id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
  };
}

export function TempFriendRequests() {
  const queryClient = useQueryClient();

  // Fetch pending requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['temp-friend-requests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status, created_at')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch sender profiles
      if (data && data.length > 0) {
        const senderIds = data.map(r => r.sender_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', senderIds);

        return data.map(req => ({
          ...req,
          sender: profiles?.find(p => p.id === req.sender_id) || { id: req.sender_id, full_name: 'Unknown', username: 'unknown' }
        }));
      }

      return [];
    },
  });

  // Accept request mutation
  const acceptMutation = useMutation({
    mutationFn: async (request: FriendRequest) => {
      // Update request status
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Create bidirectional friendships
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert([
          { user_id: request.receiver_id, friend_id: request.sender_id, status: 'accepted' },
          { user_id: request.sender_id, friend_id: request.receiver_id, status: 'accepted' }
        ]);

      if (friendshipError) throw friendshipError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temp-friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends-list'] });
    },
  });

  // Reject request mutation
  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temp-friend-requests'] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Friend Requests</h1>
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <UserPlus className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Friend Requests</h1>
        </div>

        {!requests || requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No pending friend requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const initials = request.sender.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div key={request.id} className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
                  {/* Avatar */}
                  {request.sender.avatar_url ? (
                    <img
                      src={request.sender.avatar_url}
                      alt={request.sender.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {initials}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold">{request.sender.full_name}</h3>
                    <p className="text-sm text-gray-600">@{request.sender.username}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptMutation.mutate(request)}
                      disabled={acceptMutation.isPending}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Accept
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate(request.id)}
                      disabled={rejectMutation.isPending}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TempFriendRequests;
