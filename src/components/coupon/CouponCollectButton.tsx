// CouponCollectButton.tsx
// Button component to collect coupons to wallet with loading states

import React, { useState, useEffect } from 'react';
import { Star, Loader2, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useUserCoupons } from '../../hooks/useCoupons';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export interface CouponCollectButtonProps {
  /** Coupon ID to collect */
  couponId: string;
  
  /** Coupon title for toast messages */
  couponTitle?: string;
  
  /** Display variant - icon (compact) or button (with text) */
  variant?: 'icon' | 'button';
  
  /** Size of the button */
  size?: 'sm' | 'default' | 'lg' | 'icon';
  
  /** Additional CSS classes */
  className?: string;
  
  /** Source of collection (for analytics) */
  source?: string;
  
  /** Callback when collect status changes */
  onCollectChange?: (isCollected: boolean) => void;

  /** Click handler to prevent propagation */
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Button component to collect coupons to wallet
 * 
 * Features:
 * - Star icon that fills when collected
 * - Loading spinner during API calls
 * - Toast notifications
 * - Two variants: icon-only or button with text
 * - Handles authentication prompts
 * 
 * @example
 * // Icon variant (compact, for coupon cards)
 * <CouponCollectButton couponId="123" couponTitle="50% OFF" variant="icon" />
 * 
 * // Button variant (with text)
 * <CouponCollectButton couponId="123" couponTitle="50% OFF" variant="button" />
 */
export function CouponCollectButton({
  couponId,
  couponTitle,
  variant = 'icon',
  size,
  className,
  source = 'search',
  onCollectChange,
  onClick
}: CouponCollectButtonProps) {
  const { user } = useAuthStore();
  const { collectCoupon } = useUserCoupons();
  const [isCollected, setIsCollected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if coupon is already collected
  useEffect(() => {
    const checkCollectionStatus = async () => {
      if (!user) {
        setIsCollected(false);
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_coupon_collections')
          .select('id')
          .eq('user_id', user.id)
          .eq('coupon_id', couponId)
          .eq('status', 'active')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking collection status:', error);
        }

        setIsCollected(!!data);
      } catch (error) {
        console.error('Error checking collection status:', error);
      } finally {
        setChecking(false);
      }
    };

    checkCollectionStatus();
  }, [user, couponId]);

  const handleCollect = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onClick) {
      onClick(e);
    }

    // Check authentication
    if (!user) {
      toast.error('Please sign in to collect coupons');
      return;
    }

    // Prevent multiple simultaneous requests
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const success = await collectCoupon(couponId, source);
      
      if (success) {
        setIsCollected(true);
        onCollectChange?.(true);
      }
    } catch (error) {
      console.error('Error collecting coupon:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine button size based on variant if not explicitly set
  const buttonSize = size || (variant === 'icon' ? 'icon' : 'sm');

  // Icon variant (compact)
  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={handleCollect}
        disabled={loading || checking || isCollected}
        aria-label={isCollected ? 'Already collected' : 'Collect coupon'}
        className={cn(
          'relative transition-all duration-200',
          'hover:scale-110 active:scale-95',
          isCollected && 'cursor-default',
          className
        )}
        title={isCollected ? 'Already in wallet' : 'Collect to wallet'}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : isCollected ? (
          <Check
            className="h-5 w-5 text-yellow-500"
          />
        ) : (
          <Star
            className={cn(
              'h-5 w-5 transition-all duration-200',
              'text-gray-400 hover:text-yellow-500'
            )}
          />
        )}
      </Button>
    );
  }

  // Button variant (with text)
  return (
    <Button
      onClick={handleCollect}
      disabled={loading || checking || isCollected}
      variant={isCollected ? 'default' : 'outline'}
      size={buttonSize}
      className={cn(
        'transition-all duration-200',
        isCollected && 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200 cursor-default',
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Collecting...
        </>
      ) : isCollected ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Collected
        </>
      ) : (
        <>
          <Star className="mr-2 h-4 w-4" />
          Collect
        </>
      )}
    </Button>
  );
}

export default CouponCollectButton;
