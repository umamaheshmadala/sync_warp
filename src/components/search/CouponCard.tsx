// CouponCard.tsx
// Component for displaying coupon information in search results
// Includes collection functionality, business info, and coupon details

import React, { useState } from 'react';
import { Clock, MapPin, Star, Users, Tag, Gift, CheckCircle } from 'lucide-react';
import { SearchCoupon } from '../../services/searchService';
import { formatDistanceToNow } from 'date-fns';
import { SimpleSaveButton } from '../favorites/SimpleSaveButton';
import { formatDistance, getPreferredDistanceUnit } from '../../utils/locationUtils';
import { UnifiedCouponCard } from '../common/UnifiedCouponCard';

interface CouponCardProps {
  coupon: SearchCoupon;
  onCollect?: (couponId: string) => Promise<boolean>;
  onBusinessClick?: (businessId: string) => void;
  onCouponClick?: (couponId: string) => void;
  variant?: 'default' | 'compact' | 'featured';
  showBusiness?: boolean;
  showDistance?: boolean;
  getFormattedDistance?: (distanceInMeters?: number) => string | null;
}

export const CouponCard: React.FC<CouponCardProps> = ({
  coupon,
  onCollect,
  onBusinessClick,
  onCouponClick,
  variant = 'default',
  showBusiness = true,
  showDistance = false,
  getFormattedDistance
}) => {
  const [isCollecting, setIsCollecting] = useState(false);

  // Calculate discount display
  const getDiscountDisplay = () => {
    switch (coupon.discount_type) {
      case 'percentage':
        return `${coupon.discount_value}% OFF`;
      case 'fixed_amount':
        return `₹${coupon.discount_value} OFF`;
      case 'buy_x_get_y':
        return 'BOGO';
      case 'free_item':
        return 'FREE';
      default:
        return `₹${coupon.discount_value} OFF`;
    }
  };

  // Calculate time remaining
  const getTimeRemaining = () => {
    const now = new Date();
    const expiryDate = new Date(coupon.valid_until);
    
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

  // Handle collect coupon
  const handleCollect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!onCollect || coupon.isCollected || isCollecting) return;

    setIsCollecting(true);
    try {
      await onCollect(coupon.id);
    } finally {
      setIsCollecting(false);
    }
  };

  // Handle business click
  const handleBusinessClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBusinessClick) {
      onBusinessClick(coupon.business.id);
    }
  };

  // Handle coupon click
  const handleCouponClick = () => {
    if (onCouponClick) {
      onCouponClick(coupon.id);
    }
  };

  const timeRemaining = getTimeRemaining();
  const discountDisplay = getDiscountDisplay();

  // Compact variant for mobile or tight spaces
  if (variant === 'compact') {
    return (
      <div
        className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition-all ${
          timeRemaining.isExpired 
            ? 'border-gray-200 opacity-60 grayscale hover:shadow-sm' 
            : 'border-gray-200 hover:shadow-md hover:border-blue-300'
        }`}
        onClick={handleCouponClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <div className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm font-bold">
                {discountDisplay}
              </div>
              {timeRemaining.isUrgent && (
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  timeRemaining.isExpired 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-orange-100 text-orange-600'
                }`}>
                  <Clock className="inline w-3 h-3 mr-1" />
                  {timeRemaining.text}
                </div>
              )}
            </div>
            
            <h3 
              className="text-sm font-semibold text-gray-900 truncate"
              dangerouslySetInnerHTML={{ __html: coupon.highlightedTitle || coupon.title }}
            />
            
            <div className="flex items-center justify-between mt-2">
              {showBusiness && (
                <p 
                  className="text-xs text-gray-600 cursor-pointer hover:text-indigo-600 truncate"
                  onClick={handleBusinessClick}
                >
                  {coupon.business.business_name}
                </p>
              )}
              
              {showDistance && coupon.distance && (
                <div className="text-xs text-gray-500 flex items-center ml-2">
                  <MapPin className="w-3 h-3 mr-1" />
                  {getFormattedDistance ? getFormattedDistance(coupon.distance) : formatDistance(coupon.distance, getPreferredDistanceUnit())}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-shrink-0 ml-3 flex items-center space-x-2">
            <SimpleSaveButton 
              itemId={coupon.id} 
              itemType="coupon" 
              size="sm" 
              itemData={{
                title: coupon.title,
                description: coupon.description,
                business_name: coupon.business.business_name,
                discount_value: coupon.discount_value,
                discount_type: coupon.discount_type
              }}
            />
            
            {coupon.isCollected ? (
              <div className="flex items-center text-green-600 text-xs">
                <CheckCircle className="w-4 h-4 mr-1" />
                Saved
              </div>
            ) : (
              <button
                onClick={handleCollect}
                disabled={isCollecting || timeRemaining.isExpired}
                className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCollecting ? '...' : 'Collect'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Featured variant for hero/prominent display
  if (variant === 'featured') {
    return (
      <div
        className={`rounded-xl shadow-lg text-white p-6 cursor-pointer transition-all relative overflow-hidden ${
          timeRemaining.isExpired
            ? 'bg-gradient-to-r from-gray-400 to-gray-500 opacity-70 hover:shadow-lg'
            : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-xl'
        }`}
        onClick={handleCouponClick}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white opacity-10 rounded-full -ml-8 -mb-8" />
        
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-2 rounded-lg">
              <div className="text-2xl font-bold">{discountDisplay}</div>
            </div>
            
            {timeRemaining.isUrgent && (
              <div className="bg-red-500 bg-opacity-90 px-2 py-1 rounded text-xs font-medium flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {timeRemaining.text}
              </div>
            )}
          </div>
          
          <h3 
            className="text-xl font-bold mb-2"
            dangerouslySetInnerHTML={{ __html: coupon.highlightedTitle || coupon.title }}
          />
          
          <p 
            className="text-indigo-100 text-sm mb-4 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: coupon.highlightedDescription || coupon.description }}
          />
          
          {showBusiness && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="flex items-center cursor-pointer hover:text-indigo-200"
                  onClick={handleBusinessClick}
                >
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="text-sm">{coupon.business.business_name}</span>
                </div>
                
                {showDistance && coupon.distance && (
                  <div className="text-indigo-200 text-sm flex items-center">
                    <span>{getFormattedDistance ? getFormattedDistance(coupon.distance) : formatDistance(coupon.distance, getPreferredDistanceUnit())} away</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <SimpleSaveButton 
                  itemId={coupon.id} 
                  itemType="coupon" 
                  size="md" 
                  itemData={{
                    title: coupon.title,
                    description: coupon.description,
                    business_name: coupon.business.business_name,
                    discount_value: coupon.discount_value,
                    discount_type: coupon.discount_type
                  }}
                />
                
                {coupon.isCollected ? (
                  <div className="flex items-center text-green-200">
                    <CheckCircle className="w-5 h-5 mr-1" />
                    <span className="text-sm">Saved</span>
                  </div>
                ) : (
                  <button
                    onClick={handleCollect}
                    disabled={isCollecting || timeRemaining.isExpired}
                    className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCollecting ? 'Collecting...' : 'Collect Coupon'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant - use UnifiedCouponCard
  // Debug: Log coupon data
  console.log('🔍 [SearchCouponCard] Coupon data:', {
    id: coupon.id,
    title: coupon.title,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    business: coupon.business,
    business_name: coupon.business_name,
    businessNameFromBusiness: coupon.business?.business_name
  });

  // Extract business name - the business info comes from the join
  const businessName = coupon.business?.business_name || coupon.business_name || 'Unknown Business';
  
  console.log('🔍 [SearchCouponCard] Business name extraction:', {
    from_business_object: coupon.business?.business_name,
    from_direct_field: coupon.business_name,
    resolved: businessName,
    full_business_object: coupon.business
  });

  return (
    <UnifiedCouponCard
      coupon={{
        id: coupon.id,
        title: coupon.title,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        valid_until: coupon.valid_until,
        business_name: businessName,
        business: coupon.business,
        isCollected: coupon.isCollected,
        highlightedTitle: coupon.highlightedTitle,
        highlightedDescription: coupon.highlightedDescription
      }}
      onClick={handleCouponClick}
      isExpired={timeRemaining.isExpired}
    />
  );
};

export default CouponCard;