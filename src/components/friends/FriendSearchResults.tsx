/**
 * Friend Search Results Component
 * Story 9.2.1: Global Friend Search
 */

import React, { useState, useEffect } from 'react';
import { Users, MapPin, Search, UserCheck, Clock, UserPlus } from 'lucide-react';
import { FriendSearchResult } from '@/services/friendSearchService';
import { useNavigate } from 'react-router-dom';
import { useSendFriendRequest } from '@/hooks/useFriendRequests';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { HighlightedText } from './HighlightedText';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useInView } from 'react-intersection-observer';

interface FriendSearchResultsProps {
  results: FriendSearchResult[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  searchQuery?: string;
  onUserClick?: (userId: string) => void;
}

export function FriendSearchResults({
  results,
  isLoading,
  onLoadMore,
  hasMore,
  searchQuery = '',
  onUserClick
}: FriendSearchResultsProps) {
  const navigate = useNavigate();
  const sendFriendRequest = useSendFriendRequest();
  const [sendingToUserId, setSendingToUserId] = useState<string | null>(null);
  const [requestStatuses, setRequestStatuses] = useState<Record<string, 'none' | 'sent' | 'received' | 'friends'>>({});
  const { ref, inView } = useInView();

  // Trigger load more when in view
  useEffect(() => {
    if (inView && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasMore, onLoadMore]);

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
          className="flex items-center justify-between p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
          onClick={() => onUserClick ? onUserClick(result.user_id) : navigate(`/profile/${result.user_id}`)}
        >
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <Avatar className="w-12 h-12">
              <AvatarImage src={result.avatar_url || undefined} alt={result.full_name} />
              <AvatarFallback>{result.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                <HighlightedText text={result.full_name} highlight={searchQuery} />
              </h3>
              {result.username && (
                <p className="text-sm text-gray-500 truncate">@{result.username}</p>
              )}
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                {(result.city || result.location) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {result.city || result.location}
                  </span>
                )}
                {result.mutual_friends_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {result.mutual_friends_count} mutual friends
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="ml-4 flex-shrink-0">
            {(() => {
              const status = requestStatuses[result.user_id];
              const isSending = sendingToUserId === result.user_id;

              if (status === 'friends') {
                return (
                  <Button
                    disabled
                    variant="ghost"
                    size="sm"
                    className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Friends
                  </Button>
                );
              }

              if (status === 'sent') {
                return (
                  <Button
                    disabled
                    variant="ghost"
                    size="sm"
                    className="bg-gray-100 text-gray-600"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Pending
                  </Button>
                );
              }

              if (status === 'received') {
                return (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/friends/requests');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    View Request
                  </Button>
                );
              }

              return (
                <Button
                  size="sm"
                  variant="outline"
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
                            setRequestStatuses(prev => ({ ...prev, [result.user_id]: 'sent' }));
                          } else {
                            toast.error(data.error || 'Failed to send friend request');
                          }
                        },
                        onError: () => {
                          setSendingToUserId(null);
                          toast.error('Failed to send friend request. Please try again.');
                        }
                      }
                    );
                  }}
                  disabled={isSending}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isSending ? 'Sending...' : 'Add'}
                </Button>
              );
            })()}
          </div>
        </div>
      ))}

      {hasMore && (
        <div ref={ref} className="h-4 flex justify-center py-4">
          {isLoading && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>}
        </div>
      )}
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg animate-pulse border border-gray-100">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-100 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptySearchState() {
  return (
    <div className="text-center py-12 bg-white rounded-lg border border-gray-100">
      <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">No results found</h3>
      <p className="text-gray-500 text-sm max-w-xs mx-auto">
        Try searching with different keywords or check your spelling.
      </p>
    </div>
  );
}
