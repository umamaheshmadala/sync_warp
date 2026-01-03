// UnifiedCouponCard.tsx
// Single unified coupon card design used across the entire application
// Simple, minimal design - all actions handled in modal

import React from 'react';
import { Clock, MapPin, Star, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CouponCollectButton } from '../coupon/CouponCollectButton';
import { ShareButton } from '../Sharing/ShareButton';

export interface UnifiedCouponData {
  id: string;
  title: string;
  description?: string;
  discount_type?: string;
  discount_value?: number;
  type?: string;
  value?: number;
  valid_until?: string;
  expires_at?: string;
  business_name: string;
  business?: {
    id?: string;
    business_name: string;
    rating?: number;
  };
  business_rating?: number;
  isCollected?: boolean;
  status?: string;
  // Highlighted fields for search results
  highlightedTitle?: string;
  highlightedDescription?: string;
  // Coupon count (for displaying how many copies user has)
  couponCount?: number;
}

interface UnifiedCouponCardProps {
  coupon: UnifiedCouponData;
  onClick: () => void;
  isExpired?: boolean;
  isRedeemed?: boolean;
  showStatusBadge?: boolean;
  statusText?: string;
  showCouponCount?: boolean; // Whether to show the coupon count badge
}

export const UnifiedCouponCard: React.FC<UnifiedCouponCardProps> = ({
  coupon,
  onClick,
  isExpired = false,
  isRedeemed = false,
  showStatusBadge = false,
  statusText,
  showCouponCount = false
}) => {
  // Calculate discount display
  const getDiscountDisplay = () => {
    const discountType = coupon.discount_type || coupon.type;
    const discountValue = coupon.discount_value ?? coupon.value;

    // Validate discount value exists
    if (discountValue === undefined || discountValue === null) {
      console.error('❌ [UnifiedCouponCard] Missing discount value for coupon:', coupon.id);
      return 'ERROR';
    }

    switch (discountType) {
      case 'percentage':
        return `${discountValue}% OFF`;
      case 'fixed_amount':
      case 'fixed':
        return `₹${discountValue} OFF`;
      case 'buy_x_get_y':
        return 'BOGO';
      case 'free_item':
        return 'FREE';
      default:
        return `₹${discountValue} OFF`;
    }
  };

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (isExpired) {
      return { text: 'Expired', isUrgent: true, isExpired: true };
    }

    const expiryDate = new Date(coupon.valid_until || coupon.expires_at || '');
    if (!coupon.valid_until && !coupon.expires_at) {
      return { text: 'No expiry', isUrgent: false, isExpired: false };
    }

    const now = new Date();
    
    if (expiryDate <= now) {
      return { text: 'Expired', isUrgent: true, isExpired: true };
    }

    const diffInHours = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return { 
        text: diffInHours === 1 ? '1 hour left' : `${diffInHours} hours left`, 
        isUrgent: true,
        isExpired: false
      };
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return { 
        text: diffInDays === 1 ? '1 day left' : `${diffInDays} days left`, 
        isUrgent: diffInDays <= 3,
        isExpired: false
      };
    }

    return { 
      text: formatDistanceToNow(expiryDate, { addSuffix: true }), 
      isUrgent: false,
      isExpired: false
    };
  };

  const timeRemaining = getTimeRemaining();
  const discountDisplay = getDiscountDisplay();
  const businessName = coupon.business?.business_name || coupon.business_name;
  const businessRating = coupon.business?.rating || coupon.business_rating;

  // Debug: Log business name resolution
  console.log('🏫 [UnifiedCouponCard] Business name resolution:', {
    couponId: coupon.id,
    couponTitle: coupon.title,
    businessNameFromNested: coupon.business?.business_name,
    businessNameDirect: coupon.business_name,
    resolvedBusinessName: businessName,
    businessObject: coupon.business
  });

  // Validate required data
  if (!businessName) {
    console.error('❌ [UnifiedCouponCard] Missing business name for coupon:', coupon.id, coupon);
  }

  // Determine if card should be grayed out
  const isInactive = isExpired || isRedeemed || timeRemaining.isExpired;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border p-6 cursor-pointer transition-all relative ${
        isInactive
          ? 'border-gray-200 opacity-60 grayscale hover:shadow-sm' 
          : 'border-gray-200 hover:shadow-md hover:border-blue-300'
      }`}
      onClick={onClick}
    >
      {/* Action buttons - top right corner */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <div onClick={(e) => e.stopPropagation()}>
          <ShareButton
            shareableType="coupon"
            shareableId={coupon.id}
            shareableTitle={coupon.title}
            shareableDescription={coupon.description}
            variant="icon"
            className="h-8 w-8 rounded-full bg-white/90 shadow-md backdrop-blur hover:bg-blue-50"
          />
        </div>
        <CouponCollectButton
          couponId={coupon.id}
          couponTitle={coupon.title}
          variant="icon"
          size="icon"
          className="h-8 w-8 rounded-full bg-white/90 p-0 shadow-md backdrop-blur hover:bg-yellow-50"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Top row: Discount badge and time remaining */}
      <div className="flex items-start justify-between mb-4">
        <div className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg font-bold text-lg">
          {discountDisplay}
        </div>
        
        <div className={`text-sm font-medium flex items-center ${
          timeRemaining.isExpired 
            ? 'text-red-600' 
            : timeRemaining.isUrgent 
            ? 'text-orange-600' 
            : 'text-gray-600'
        }`}>
          <Clock className="w-4 h-4 mr-1" />
          {timeRemaining.text}
        </div>
      </div>
      
      {/* Title and description */}
      <div className="mb-4">
        <h3 
          className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2"
          dangerouslySetInnerHTML={{ 
            __html: coupon.highlightedTitle || coupon.title 
          }}
        />
        
        {coupon.description && (
          <p 
            className="text-gray-600 text-sm line-clamp-2"
            dangerouslySetInnerHTML={{ 
              __html: coupon.highlightedDescription || coupon.description 
            }}
          />
        )}
      </div>
      
      {/* Bottom row: Business info */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center min-w-0 flex-1">
          <MapPin className="w-4 h-4 mr-1 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900 truncate">{businessName}</span>
          
          {businessRating && (
            <div className="flex items-center ml-3 flex-shrink-0">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-xs text-gray-500 ml-1">{businessRating}</span>
            </div>
          )}
        </div>

        {/* Status Badge (if applicable) */}
        {showStatusBadge && statusText && (
          <div className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
            statusText.toLowerCase() === 'active' 
              ? 'bg-green-100 text-green-800'
              : statusText.toLowerCase() === 'expired'
              ? 'bg-red-100 text-red-800'
              : statusText.toLowerCase() === 'redeemed'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {statusText.toUpperCase()}
          </div>
        )}
      </div>

      {/* Removed conflicting 'Saved' banner - collection state now shown via star/check icon */}

      {/* Coupon count badge - shows how many copies user has */}
      {showCouponCount && coupon.couponCount && coupon.couponCount > 1 && (
        <div className="absolute top-3 right-3">
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md">
            x{coupon.couponCount}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedCouponCard;
