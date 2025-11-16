/**
 * PYMK Card Component
 * Story 9.2.2: People You May Know Engine
 */

import React, { useState } from 'react';
import { Users, X, Loader2 } from 'lucide-react';
import { PYMKRecommendation } from '@/services/recommendationService';
import { useSendFriendRequest } from '@/hooks/useFriendRequests';
import { useDismissPYMK } from '@/hooks/usePYMK';
import { useNavigate } from 'react-router-dom';
import { trackPYMKEvent } from '@/services/recommendationService';
import toast from 'react-hot-toast';

interface PYMKCardProps {
  recommendation: PYMKRecommendation;
}

export function PYMKCard({ recommendation }: PYMKCardProps) {
  const navigate = useNavigate();
  const sendFriendRequest = useSendFriendRequest();
  const dismissSuggestion = useDismissPYMK();
  const [requestSent, setRequestSent] = useState(false);

  const handleAddFriend = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackPYMKEvent('friend_request', recommendation.user_id);
    sendFriendRequest.mutate(
      { receiverId: recommendation.user_id },
      {
        onSuccess: (data) => {
          if (data.success) {
            setRequestSent(true);
            toast.success(`Friend request sent to ${recommendation.full_name}`);
          } else {
            toast.error(data.error || 'Failed to send friend request');
          }
        },
        onError: () => {
          toast.error('Failed to send friend request. Please try again.');
        }
      }
    );
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissSuggestion.mutate(recommendation.user_id, {
      onSuccess: () => {
        toast.success('Suggestion dismissed');
      },
      onError: () => {
        toast.error('Failed to dismiss suggestion');
      }
    });
  };

  const handleCardClick = () => {
    trackPYMKEvent('click', recommendation.user_id);
    navigate(`/profile/${recommendation.user_id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="relative bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-4"
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        disabled={dismissSuggestion.isPending}
        className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
        title="Dismiss suggestion"
      >
        {dismissSuggestion.isPending ? (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        ) : (
          <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
        )}
      </button>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-4">
        <img
          src={recommendation.avatar_url || '/default-avatar.png'}
          alt={recommendation.full_name}
          className="w-20 h-20 rounded-full object-cover mb-3"
        />
        <h3 className="font-semibold text-gray-900 text-center truncate w-full px-6">
          {recommendation.full_name}
        </h3>
        <p className="text-sm text-gray-500 text-center truncate w-full px-6">
          @{recommendation.username}
        </p>
      </div>

      {/* Reason */}
      <div className="flex items-center justify-center text-xs text-gray-600 mb-4">
        <Users className="w-3 h-3 mr-1 flex-shrink-0" />
        <span className="truncate">{recommendation.reason}</span>
      </div>

      {/* Add Friend button */}
      {requestSent ? (
        <button
          disabled
          className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 text-gray-600 cursor-not-allowed"
        >
          Request Sent
        </button>
      ) : (
        <button
          onClick={handleAddFriend}
          disabled={sendFriendRequest.isPending}
          className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sendFriendRequest.isPending ? (
            <span className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </span>
          ) : (
            'Add Friend'
          )}
        </button>
      )}
    </div>
  );
}
