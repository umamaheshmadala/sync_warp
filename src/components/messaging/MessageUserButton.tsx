/**
 * Message User Button Component
 * Story 9.1.9: Messaging Integration
 * 
 * Button to message a user with friendship validation
 * Shows appropriate state based on friendship status
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useCreateConversation, useCanMessageUser } from '../../hooks/useConversationsEnhanced';
import { toast } from 'react-toastify';

interface MessageUserButtonProps {
  userId: string;
  username: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function MessageUserButton({
  userId,
  username,
  variant = 'primary',
  size = 'md',
  showIcon = true,
  fullWidth = false,
  className = '',
}: MessageUserButtonProps) {
  const navigate = useNavigate();
  const { data: canMessage, isLoading } = useCanMessageUser(userId);
  const createConversation = useCreateConversation();

  const handleClick = async () => {
    try {
      const conversationId = await createConversation.mutateAsync(userId);
      navigate(`/messages/${conversationId}`);
      toast.success(`Opening conversation with ${username}`);
    } catch (error: any) {
      toast.error(error.message || 'Cannot send message');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <button
        disabled
        className={`btn btn-${variant} btn-${size} ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        {showIcon && <MessageCircle className="w-4 h-4 mr-2" />}
        Loading...
      </button>
    );
  }

  // Not friends - show disabled state
  if (!canMessage) {
    return (
      <button
        disabled
        className={`btn btn-disabled btn-${size} ${fullWidth ? 'w-full' : ''} ${className}`}
        title="You can only message your friends"
      >
        {showIcon && <MessageCircle className="w-4 h-4 mr-2" />}
        Send Friend Request First
      </button>
    );
  }

  // Friends - show active message button
  return (
    <button
      onClick={handleClick}
      disabled={createConversation.isPending}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {showIcon && <MessageCircle className="w-4 h-4 mr-2" />}
      {createConversation.isPending ? 'Opening...' : `Message ${username}`}
    </button>
  );
}

/**
 * Compact version for small spaces
 */
export function MessageUserButtonCompact({
  userId,
  username,
  className = '',
}: Omit<MessageUserButtonProps, 'variant' | 'size' | 'showIcon' | 'fullWidth'>) {
  return (
    <MessageUserButton
      userId={userId}
      username=""
      variant="ghost"
      size="sm"
      showIcon={true}
      className={className}
    />
  );
}
