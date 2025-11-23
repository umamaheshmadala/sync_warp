/**
 * FriendCard Component
 * Story 9.3.1: Friends List Component
 * 
 * Individual friend card with avatar, status, and quick actions
 */

import React, { useState } from 'react';
import { MessageCircle, UserMinus } from 'lucide-react';
import { OnlineStatusBadge, OnlineStatusDot } from '../status/OnlineStatusBadge';
import { useFriendActions } from '../../hooks/friends/useFriendActions';
import type { Friend } from '../../types/friends';

interface FriendCardProps {
  friend: Friend;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function FriendCard({ friend, style, onClick }: FriendCardProps) {
  const { unfriend, sendMessage } = useFriendActions();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleUnfriend = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleSendMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendMessage(friend.id);
  };

  const confirmUnfriend = () => {
    unfriend(friend.id);
    setShowConfirm(false);
  };

  // Get initials for avatar fallback
  const initials = friend.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <div
        style={style}
        className="flex items-center gap-3 p-4 hover:bg-gray-50 transition border-b border-gray-100 cursor-pointer"
        data-testid="friend-card"
        onClick={onClick}
      >
        {/* Avatar with online badge */}
        <div className="relative flex-shrink-0">
          {friend.avatar_url ? (
            <img
              src={friend.avatar_url}
              alt={friend.full_name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {initials}
            </div>
          )}
          <OnlineStatusDot userId={friend.id} />
        </div>

        {/* Friend info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{friend.full_name}</h3>
          <OnlineStatusBadge userId={friend.id} lastActive={friend.last_active} />
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleSendMessage}
            className="p-2 hover:bg-blue-50 rounded-lg transition text-blue-600"
            aria-label="Send message"
            title="Send message"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button
            onClick={handleUnfriend}
            className="p-2 hover:bg-red-50 rounded-lg transition text-red-600"
            aria-label="Unfriend"
            title="Unfriend"
          >
            <UserMinus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Unfriend Confirmation Dialog */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Unfriend {friend.full_name}?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove this person from your friends?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnfriend}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Unfriend
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
