// StandardBusinessCard.tsx
// Unified business card component used across the application
// Provides consistent UI with customizable action buttons per context

import React from 'react';
import { MapPin, Star, Ticket, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RecommendationBadge } from '../business/RecommendationBadge';
import { BadgeTier } from '../../services/badgeService';

export interface StandardBusinessCardData {
  id: string;
  business_name?: string;
  name?: string; // Alternative name field
  business_type?: string;
  category?: string; // Alternative category field
  address?: string;
  city?: string;
  state?: string;
  rating?: number;
  review_count?: number;
  follower_count?: number;
  activeCouponsCount?: number;
  active_coupons_count?: number;
  logo_url?: string;
  cover_image_url?: string;
  description?: string;
  // For highlighted search results
  highlightedName?: string;

  // Badge Data
  recommendation_badge?: BadgeTier;
  recommendation_percentage?: number;
  approved_review_count?: number;
}

interface StandardBusinessCardProps {
  business: StandardBusinessCardData;
  onCardClick?: (businessId: string) => void;
  variant?: 'default' | 'compact';
  showChevron?: boolean;
  showCouponCount?: boolean;
  actionButton?: React.ReactNode; // Customizable action button (e.g., FollowButton, SaveButton)
  className?: string;
}

export const StandardBusinessCard: React.FC<StandardBusinessCardProps> = ({
  business,
  onCardClick,
  variant = 'default',
  showChevron = true,
  showCouponCount = true,
  actionButton,
  className,
}) => {
  // Debug: Log incoming business data
  console.log('🎴 [StandardBusinessCard] Rendering with data:', {
    business_id: business.id,
    business_name: business.business_name || business.name,
    logo_url: business.logo_url,
    cover_image_url: business.cover_image_url,
    has_logo: !!business.logo_url,
    has_cover: !!business.cover_image_url
  });

  // Normalize field names
  const businessName = business.business_name || business.name || 'Unknown Business';
  const businessType = business.business_type || business.category || '';
  const location = business.address || (business.city && business.state ? `${business.city}, ${business.state}` : business.city || '');
  const couponCount = business.activeCouponsCount ?? business.active_coupons_count ?? 0;
  const displayName = business.highlightedName || businessName;

  // Handle card click
  const handleClick = () => {
    if (onCardClick) {
      onCardClick(business.id);
    }
  };

  // Get business type display
  const getBusinessTypeDisplay = () => {
    if (!businessType) return '';
    return businessType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get coupon count display with color
  const getCouponDisplay = () => {
    if (couponCount === 0) return { text: 'No active offers', color: 'text-gray-500' };
    if (couponCount === 1) return { text: '1 active offer', color: 'text-indigo-600' };
    return { text: `${couponCount} active offers`, color: 'text-indigo-600' };
  };

  const couponDisplay = getCouponDisplay();

  // Compact variant (for tight spaces or mobile)
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          "bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow group",
          className
        )}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-3">
            <h3
              className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors"
              dangerouslySetInnerHTML={{ __html: displayName }}
            />

            <div className="flex items-center space-x-3 mt-1">
              {business.recommendation_badge && (
                <RecommendationBadge
                  tier={business.recommendation_badge}
                  showLabel={false}
                  size="sm"
                />
              )}

              {businessType && (
                <span className="text-xs text-gray-500">
                  {getBusinessTypeDisplay()}
                </span>
              )}

              {business.rating && (
                <div className="flex items-center">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-600 ml-1">{business.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {showCouponCount && (
              <div className={cn("flex items-center space-x-1 text-xs mt-1", couponDisplay.color)}>
                <Ticket className="w-3 h-3" />
                <span>{couponDisplay.text}</span>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center space-x-2">
            {actionButton}
            {showChevron && <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </div>
    );
  }

  // Default variant (standard card layout matching the image)
  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 overflow-visible cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all group relative",
        className
      )}
      onClick={handleClick}
    >
      {/* Action button in top-right */}
      {actionButton && (
        <div className="absolute top-3 right-3 z-30">
          {actionButton}
        </div>
      )}

      {/* Cover Image or Gradient - Hidden on mobile, shown on desktop */}
      <div className="hidden md:block relative h-32 bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden rounded-t-lg">
        {business.cover_image_url ? (
          <img
            src={business.cover_image_url}
            alt={businessName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-4xl font-bold opacity-30">
              {businessName.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 md:p-4 md:pt-0">
        {/* Logo & Title Row */}
        <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-3 relative">
          {/* Logo - smaller on mobile, positioned above cover on desktop */}
          <div className="flex-shrink-0 md:-mt-8 relative z-20">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={businessName}
                className="w-10 h-10 md:w-16 md:h-16 rounded-lg object-cover border-2 md:border-4 border-white shadow-md md:shadow-lg"
              />
            ) : (
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm md:text-xl shadow-md md:shadow-lg border-2 md:border-4 border-white">
                {businessName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Title & Category */}
          <div className="flex-1 min-w-0 md:pt-2">
            <h3
              className="text-base font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors"
              dangerouslySetInnerHTML={{ __html: displayName }}
            />
            {businessType && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {getBusinessTypeDisplay()}
              </p>
            )}

            {business.recommendation_badge && (
              <div className="mt-1">
                <RecommendationBadge
                  tier={business.recommendation_badge}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {business.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {business.description}
          </p>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
          {business.rating !== undefined && business.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="font-medium text-gray-900">
                {business.rating.toFixed(1)}
              </span>
              {business.review_count !== undefined && business.review_count > 0 && (
                <span>({business.review_count})</span>
              )}
            </div>
          )}

          {business.follower_count !== undefined && business.follower_count > 0 && (
            <div className="flex items-center gap-1">
              <span>{business.follower_count} followers</span>
            </div>
          )}
        </div>

        {/* Location */}
        {location && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}

        {/* Footer with Coupon Count */}
        {showCouponCount && (
          <div className="pt-3 border-t border-gray-100">
            <div className={cn(
              "flex items-center justify-center gap-1 text-sm font-medium",
              couponDisplay.color
            )}>
              <Ticket className="w-4 h-4" />
              <span>{couponDisplay.text}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StandardBusinessCard;
