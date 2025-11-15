import React from 'react';
import { useIsFollowing, useFollow } from '../hooks/useFollow';
import { useAuth } from '../contexts/AuthContext';

interface FollowButtonProps {
  userId: string;
  className?: string;
  showFollowingText?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

/**
 * Reusable Follow/Unfollow button component
 * - Shows "Follow" or "Following" state
 * - Handles loading states during mutations
 * - Includes hover effects on "Following" state
 * - Respects user authentication
 */
export const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  className = '',
  showFollowingText = true,
  onFollowChange,
}) => {
  const { user } = useAuth();
  const { data: isFollowingUser, isLoading } = useIsFollowing(userId);
  const { follow, unfollow, isFollowing: isMutating } = useFollow(userId);

  // Don't show button for current user
  if (!user || user.id === userId) {
    return null;
  }

  const handleClick = () => {
    if (isMutating) return;

    if (isFollowingUser) {
      unfollow();
      onFollowChange?.(false);
    } else {
      follow();
      onFollowChange?.(true);
    }
  };

  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const followButtonClasses = `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800`;
  
  const followingButtonClasses = `${baseClasses} bg-gray-200 text-gray-800 hover:bg-red-100 hover:text-red-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-red-900 dark:hover:text-red-400`;

  const buttonClasses = isFollowingUser ? followingButtonClasses : followButtonClasses;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || isMutating}
      className={`${buttonClasses} ${className}`}
      aria-label={isFollowingUser ? 'Unfollow user' : 'Follow user'}
    >
      {isLoading || isMutating ? (
        <span className="flex items-center gap-2">
          <svg 
            className="animate-spin h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        <span className="relative">
          {isFollowingUser ? (
            showFollowingText ? (
              <>
                <span className="group-hover:hidden">Following</span>
                <span className="hidden group-hover:inline">Unfollow</span>
              </>
            ) : (
              'Following'
            )
          ) : (
            'Follow'
          )}
        </span>
      )}
    </button>
  );
};

/**
 * Compact variant of FollowButton (icon only)
 */
interface CompactFollowButtonProps {
  userId: string;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export const CompactFollowButton: React.FC<CompactFollowButtonProps> = ({
  userId,
  className = '',
  onFollowChange,
}) => {
  const { user } = useAuth();
  const { data: isFollowingUser, isLoading } = useIsFollowing(userId);
  const { follow, unfollow, isFollowing: isMutating } = useFollow(userId);

  if (!user || user.id === userId) {
    return null;
  }

  const handleClick = () => {
    if (isMutating) return;

    if (isFollowingUser) {
      unfollow();
      onFollowChange?.(false);
    } else {
      follow();
      onFollowChange?.(true);
    }
  };

  const baseClasses = 'p-2 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const followClasses = `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
  const followingClasses = `${baseClasses} bg-gray-200 text-gray-800 hover:bg-red-100 hover:text-red-600 dark:bg-gray-700 dark:text-gray-200`;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || isMutating}
      className={`${isFollowingUser ? followingClasses : followClasses} ${className}`}
      aria-label={isFollowingUser ? 'Unfollow user' : 'Follow user'}
      title={isFollowingUser ? 'Unfollow' : 'Follow'}
    >
      {isLoading || isMutating ? (
        <svg 
          className="animate-spin h-5 w-5" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : isFollowingUser ? (
        // Checkmark icon for "Following" state
        <svg 
          className="h-5 w-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M5 13l4 4L19 7" 
          />
        </svg>
      ) : (
        // Plus icon for "Follow" state
        <svg 
          className="h-5 w-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 4v16m8-8H4" 
          />
        </svg>
      )}
    </button>
  );
};
