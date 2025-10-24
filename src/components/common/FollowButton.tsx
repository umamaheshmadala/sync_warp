// src/components/common/FollowButton.tsx
// Reusable Follow/Unfollow button component

import React, { useState, useEffect } from 'react';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { followBusiness, unfollowBusiness, isFollowing } from '../../lib/followerUtils';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface FollowButtonProps {
  businessId: string;
  userId: string;
  variant?: 'default' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  businessId,
  userId,
  variant = 'default',
  size = 'md',
  showIcon = true,
  onFollowChange,
  className,
}) => {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkFollowStatus();
  }, [businessId, userId]);

  const checkFollowStatus = async () => {
    setChecking(true);
    const status = await isFollowing(businessId, userId);
    setFollowing(status);
    setChecking(false);
  };

  const handleClick = async () => {
    setLoading(true);
    try {
      let success;
      if (following) {
        success = await unfollowBusiness(businessId, userId);
        if (success) {
          setFollowing(false);
          toast.success('Unfollowed successfully');
          onFollowChange?.(false);
        } else {
          toast.error('Failed to unfollow');
        }
      } else {
        success = await followBusiness(businessId, userId);
        if (success) {
          setFollowing(true);
          toast.success('Following!');
          onFollowChange?.(true);
        } else {
          toast.error('Failed to follow');
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyles = () => {
    const baseStyles = 'transition-all duration-200 font-medium rounded-lg flex items-center justify-center';
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const variantStyles = {
      default: following
        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
        : 'bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600',
      outline: following
        ? 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300'
        : 'bg-white text-indigo-600 hover:bg-indigo-50 border-2 border-indigo-600',
      text: following
        ? 'bg-transparent text-gray-600 hover:text-gray-900 hover:underline'
        : 'bg-transparent text-indigo-600 hover:text-indigo-700 hover:underline',
    };

    return cn(
      baseStyles,
      sizeStyles[size],
      variantStyles[variant],
      loading && 'opacity-50 cursor-not-allowed',
      className
    );
  };

  if (checking) {
    return (
      <button disabled className={getButtonStyles()}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={getButtonStyles()}
      aria-label={following ? 'Unfollow' : 'Follow'}
    >
      {loading ? (
        <Loader2 className={cn('animate-spin', showIcon && size !== 'sm' && 'mr-2', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      ) : showIcon ? (
        following ? (
          <UserMinus className={cn(size !== 'sm' && 'mr-2', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
        ) : (
          <UserPlus className={cn(size !== 'sm' && 'mr-2', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
        )
      ) : null}
      <span>{following ? 'Following' : 'Follow'}</span>
    </button>
  );
};

export default FollowButton;
