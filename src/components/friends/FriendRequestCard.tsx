/**
 * Friend Request Card Component  
 * Story 9.3.2: Friend Requests UI
 * 
 * Individual friend request card with actions
 */

import React, { useState } from 'react';
import { Check, X, Users, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRequestActions } from '../../hooks/friends/useRequestActions';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface FriendRequestCardProps {
  request: {
    id: string;
    sender: {
      id: string;
      full_name: string;
      email: string;
      avatar_url?: string;
    };
    receiver: {
      id: string;
      full_name: string;
      email: string;
      avatar_url?: string;
    };
    message?: string;
    created_at: string;
    mutual_friends_count?: number;
  };
  type: 'received' | 'sent';
  onProfileClick?: (userId: string) => void;
}

export function FriendRequestCard({ request, type, onProfileClick }: FriendRequestCardProps) {
  const { acceptRequest, rejectRequest, cancelRequest, isLoading } = useRequestActions();
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const otherUser = type === 'received' ? request.sender : request.receiver;

  if (!otherUser) {
    return null;
  }

  // Generate initials for avatar fallback
  const initials = otherUser.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleReject = () => {
    rejectRequest(request.id);
    setShowRejectDialog(false);
  };

  return (
    <>
      <div
        className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onProfileClick?.(otherUser.id)}
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {otherUser.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt={otherUser.full_name}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {initials}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {otherUser.full_name}
            </h3>

            {/* Mutual friends count */}
            {request.mutual_friends_count !== undefined && request.mutual_friends_count > 0 && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                <Users className="w-4 h-4" />
                <span>
                  {request.mutual_friends_count} mutual friend{request.mutual_friends_count !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Request message preview */}
            {request.message && (
              <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                "{request.message}"
              </p>
            )}

            {/* Timestamp */}
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {type === 'received' ? (
              <>
                <button
                  onClick={() => acceptRequest(request.id)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Accept
                </button>
                <button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </>
            ) : (
              <button
                onClick={() => cancelRequest(request.id)}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reject Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={handleReject}
        title="Reject Friend Request?"
        message={`Are you sure you want to reject the friend request from ${otherUser.full_name}?`}
        confirmText="Reject"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
