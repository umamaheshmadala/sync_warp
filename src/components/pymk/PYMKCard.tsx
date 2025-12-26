/**
 * PYMK Card Component
 * Story 9.3.5: People You May Know Cards
 */

import React, { useState } from 'react';
import { Users, X, Loader2, UserPlus } from 'lucide-react';
import { PYMKSuggestion } from '@/services/friendService';
import { useFriendActions } from '@/hooks/friends/useFriendActions';
import { useDismissPYMK } from '@/hooks/usePYMK';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface PYMKCardProps {
  recommendation: PYMKSuggestion;
}

export function PYMKCard({ recommendation }: PYMKCardProps) {
  const navigate = useNavigate();
  const { sendRequest } = useFriendActions();
  const dismissSuggestion = useDismissPYMK();
  const [requestSent, setRequestSent] = useState(false);

  const handleAddFriend = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendRequest.mutate(recommendation.id, {
      onSuccess: () => {
        setRequestSent(true);
        toast.success(`Friend request sent to ${recommendation.full_name}`);
      },
      onError: (error: any) => {
        toast.error(error?.message || 'Failed to send friend request');
      }
    });
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissSuggestion.mutate(recommendation.id);
  };

  const handleCardClick = () => {
    navigate(`/profile/${recommendation.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="relative bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-3 flex flex-col items-center h-full"
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        disabled={dismissSuggestion.isPending}
        className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full transition-colors z-10"
        title="Dismiss suggestion"
      >
        {dismissSuggestion.isPending ? (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        ) : (
          <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
        )}
      </button>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-2 w-full">
        <img
          src={recommendation.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(recommendation.full_name)}&background=random`}
          alt={recommendation.full_name}
          className="w-16 h-16 rounded-full object-cover mb-2 border border-gray-100"
        />
        <h3 className="font-semibold text-gray-900 text-sm text-center truncate w-full px-1" title={recommendation.full_name}>
          {recommendation.full_name}
        </h3>
      </div>

      {/* Mutual Friends Avatars Only */}
      <div className="mb-3 h-6 w-full flex justify-center">
        {recommendation.mutual_friends && recommendation.mutual_friends.length > 0 ? (
          <div className="flex -space-x-2">
            {recommendation.mutual_friends.slice(0, 3).map(mf => (
              <img
                key={mf.id}
                src={mf.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(mf.full_name)}`}
                className="w-6 h-6 rounded-full border-2 border-white bg-gray-100"
                title={mf.full_name}
                alt={mf.full_name}
              />
            ))}
            {recommendation.mutual_friends.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 font-medium">
                +{recommendation.mutual_friends.length - 3}
              </div>
            )}
          </div>
        ) : (
          /* Spacer to keep card height consistent even if no mutual friends */
          <div className="h-6" />
        )}
      </div>

      {/* Add Friend button */}
      <div className="mt-auto w-full">
        <button
          onClick={handleAddFriend}
          disabled={sendRequest.isPending || requestSent}
          className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center ${requestSent
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          {sendRequest.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : requestSent ? (
            'Request Sent'
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Add
            </>
          )}
        </button>
      </div>
    </div>
  );
}
