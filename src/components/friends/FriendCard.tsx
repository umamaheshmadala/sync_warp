import React, { useState, useEffect } from 'react';
import { MessageCircle, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OnlineStatusBadge, OnlineStatusDot } from '../status/OnlineStatusBadge';

import type { Friend } from '../../types/friends';
import { messagingService } from '../../services/messagingService'; // Import messaging service
import * as blockService from '../../services/blockService';

import type { Badge } from '../../services/friendLeaderboardService';

interface FriendCardProps {
  friend: Friend;
  badge?: Badge | null;
  style?: React.CSSProperties;
  onClick?: () => void;
}

import { useQueryClient } from '@tanstack/react-query';

export function FriendCard({ friend, badge, style, onClick }: FriendCardProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Check if this friend is blocked
  useEffect(() => {
    const checkBlockStatus = async () => {
      try {
        const blocked = await blockService.isUserBlocked(friend.id);
        setIsBlocked(blocked);
      } catch (error) {
        console.error('Failed to check block status:', error);
      }
    };

    checkBlockStatus();

    // Listen for block status changes
    const handleUpdate = () => {
      checkBlockStatus();
    };
    window.addEventListener('conversation-updated', handleUpdate);

    return () => {
      window.removeEventListener('conversation-updated', handleUpdate);
    };
  }, [friend.id]);



  const handleSendMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Create or get conversation before navigating
      const conversationId = await messagingService.createOrGetConversation(friend.id);

      // Invalidate queries to ensure sidebar updates
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      await queryClient.removeQueries({ queryKey: ['messages', conversationId] });

      navigate(`/messages/${conversationId}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      // Fallback navigation or error handling could go here
      navigate('/messages');
    }
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
        className="flex items-center gap-3 p-3 hover:bg-gray-50 transition cursor-pointer group"
        data-testid="friend-card"
        onClick={onClick}
      >
        {/* Avatar with online badge */}
        <div className="relative flex-shrink-0">
          {friend.avatar_url ? (
            <img
              src={friend.avatar_url}
              alt={friend.full_name}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {initials}
            </div>
          )}
          {/* Only show dot if we have status info (it might be hidden by privacy settings) */}
          {friend.is_online !== undefined && <OnlineStatusDot userId={friend.id} />}
        </div>

        {/* Friend info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors leading-snug">{friend.full_name}</h3>
            {badge && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 ${badge.color}`}>
                <span className="mr-1">{badge.emoji}</span>
                {badge.title}
              </span>
            )}
          </div>
          {/* Pass explicit null if hidden, or let the component handle undefined */}
          <OnlineStatusBadge
            userId={friend.id}
            lastActive={friend.last_active}
            showDot={false}
            hideOnlineText={false}
            className={friend.is_online === undefined ? 'invisible' : ''}
          />
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 flex-shrink-0">
          {isBlocked ? (
            <div
              className="h-8 w-8 flex items-center justify-center rounded-lg text-red-500 cursor-not-allowed"
              aria-label="User is blocked"
              title="User is blocked"
            >
              <Ban className="w-5 h-5" />
            </div>
          ) : (
            <button
              onClick={handleSendMessage}
              className="h-8 w-8 flex items-center justify-center hover:bg-blue-50 rounded-lg transition text-blue-600"
              aria-label="Send message"
              title="Send message"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          )}

        </div>
      </div>

      {/* Unfriend Confirmation Dialog */}

    </>
  );
}
