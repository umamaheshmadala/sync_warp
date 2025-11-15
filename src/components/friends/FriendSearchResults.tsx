/**
 * Friend Search Results Component
 * Story 9.2.1: Global Friend Search
 */

import React, { useState, useEffect } from 'react';
import { Users, MapPin, Search, UserCheck, Clock } from 'lucide-react';
import { FriendSearchResult } from '@/services/friendSearchService';
import { useNavigate } from 'react-router-dom';
import { useSendFriendRequest } from '@/hooks/useFriendRequests';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface FriendSearchResultsProps {
  results: FriendSearchResult[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function FriendSearchResults({ 
  results, 
  isLoading, 
  onLoadMore, 
  hasMore 
}: FriendSearchResultsProps) {
  const navigate = useNavigate();
  const sendFriendRequest = useSendFriendRequest();
  const [sendingToUserId, setSendingToUserId] = useState<string | null>(null);
  const [requestStatuses, setRequestStatuses] = useState<Record<string, 'none' | 'sent' | 'received' | 'friends'>>({}); 

  // Check friendship/request status for all results
  useEffect(() => {
    const checkStatuses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || results.length === 0) return;

      const userIds = results.map(r => r.user_id);
      
      // Check for existing friendships
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .in('friend_id', userIds);

      // Check for sent requests
      const { data: sentRequests } = await supabase
        .from('friend_requests')
        .select('receiver_id')
        .eq('sender_id', user.id)
        .eq('status', 'pending')
        .in('receiver_id', userIds);

      // Check for received requests
      const { data: receivedRequests } = await supabase
        .from('friend_requests')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .in('sender_id', userIds);

      const statuses: Record<string, 'none' | 'sent' | 'received' | 'friends'> = {};
      
      userIds.forEach(userId => {
        if (friendships?.some(f => f.friend_id === userId)) {
          statuses[userId] = 'friends';
        } else if (sentRequests?.some(r => r.receiver_id === userId)) {
          statuses[userId] = 'sent';
        } else if (receivedRequests?.some(r => r.sender_id === userId)) {
          statuses[userId] = 'received';
        } else {
          statuses[userId] = 'none';
        }
      });

      setRequestStatuses(statuses);
    };

    checkStatuses();
  }, [results]);

  if (isLoading && results.length === 0) {
    return <SearchResultsSkeleton />;
  }

  if (results.length === 0) {
    return <EmptySearchState />;
  }

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <div
          key={result.user_id}
          className="flex items-center justify-between p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate(`/profile/${result.user_id}`)}
        >
          <div className="flex items-center space-x-4 flex-1">
            <img
              src={result.avatar_url || '/default-avatar.png'}
              alt={result.full_name}
              className="w-14 h-14 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{result.full_name}</h3>
              <p className="text-sm text-gray-500 truncate">@{result.username}</p>
              {result.mutual_friends_count > 0 && (
                <div className="flex items-center text-xs text-gray-600 mt-1">
                  <Users className="w-3 h-3 mr-1" />
                  {result.mutual_friends_count} mutual friend{result.mutual_friends_count !== 1 ? 's' : ''}
                </div>
              )}
              {result.location && (
                <div className="flex items-center text-xs text-gray-600 mt-1">
                  <MapPin className="w-3 h-3 mr-1" />
                  {result.location}
                  {result.distance_km && ` • ${Math.round(result.distance_km)} km away`}
                </div>
              )}
            </div>
          </div>
          {(() => {
            const status = requestStatuses[result.user_id];
            const isSending = sendingToUserId === result.user_id;

            if (status === 'friends') {
              return (
                <button
                  disabled
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-green-100 text-green-700 cursor-not-allowed flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  Friends
                </button>
              );
            }

            if (status === 'sent') {
              return (
                <button
                  disabled
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 text-gray-600 cursor-not-allowed flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Pending
                </button>
              );
            }

            if (status === 'received') {
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/friends/requests');
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  View Request
                </button>
              );
            }

            return (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSendingToUserId(result.user_id);
                  sendFriendRequest.mutate(
                    { receiverId: result.user_id },
                    {
                      onSuccess: (data) => {
                        setSendingToUserId(null);
                        if (data.success) {
                          toast.success(`Friend request sent to ${result.full_name}`);
                          // Update status immediately
                          setRequestStatuses(prev => ({ ...prev, [result.user_id]: 'sent' }));
                        } else {
                          toast.error(data.error || 'Failed to send friend request');
                        }
                      },
                      onError: (error) => {
                        setSendingToUserId(null);
                        toast.error('Failed to send friend request. Please try again.');
                      }
                    }
                  );
                }}
                disabled={isSending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? 'Sending...' : 'Add Friend'}
              </button>
            );
          })()}
        </div>
      ))}
      
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoading}
          className="w-full py-3 text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg animate-pulse">
          <div className="w-14 h-14 bg-gray-300 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptySearchState() {
  return (
    <div className="text-center py-12 bg-white rounded-lg">
      <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
      <p className="text-gray-600 max-w-md mx-auto">
        Try searching with different keywords or check your spelling.
        You can search by name or username.
      </p>
    </div>
  );
}
