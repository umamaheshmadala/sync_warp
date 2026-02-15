// StandardBusinessCard.tsx
// Unified business card component used across the application
// Provides consistent UI with customizable action buttons per context

import React from 'react';
import { MapPin, Star, Ticket, ChevronRight, Users } from 'lucide-react';
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
  local_area?: string; // Added for precise filtering
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
  variant?: 'default' | 'compact' | 'search';
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
  // Normalize field names
  const businessName = business.business_name || business.name || 'Unknown Business';
  const businessType = business.business_type || business.category || '';

  // Custom Address Logic: Prefer "Local Area, City" format
  let displayLocation = '';

  // Helper to extract city/area from address if city field is missing
  const extractCityFromAddress = (addr: string) => {
    if (!addr) return '';
    const parts = addr.split(',').map(p => p.trim());
    // If we have "Door, Area, City", return "Area, City" or just "City"
    if (parts.length >= 2) {
      // Return last two parts if available, otherwise just last
      return parts.slice(-2).join(', ');
    }
    return addr;
  };

  if (business.local_area && business.city) {
    displayLocation = `${business.local_area}, ${business.city}`;
  } else if (business.city) {
    // If specific local_area is missing, try to see if we can get it from address, 
    // BUT user specifically asked for "Local Area, City" and cited "Labbipet, Vijayawada".
    // If we only have city "Vijayawada", and address might contain area.
    displayLocation = business.city;
  } else {
    // Fallback: If city is missing, try to extract useful info from address
    // This handles the case where TU1 has "59-11-9/A" (Door No) in address but might have city data elsewhere or implicitly.
    // If address looks like a full address, try to show the tail end.
    displayLocation = extractCityFromAddress(business.address || '') || 'Location N/A';
  }

  const couponCount = business.activeCouponsCount ?? business.active_coupons_count ?? 0;
  const displayName = business.highlightedName || businessName;

  // Handle card click
  const handleClick = () => {
    // Prevent navigation if user is selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

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

  // Search variant (Horizontal layout with pop-out avatar) - Matching SearchBusinessCard.tsx
  if (variant === 'search') {
    return (
      <div
        className={cn(
          "bg-white rounded-2xl shadow-sm border border-gray-100 p-4 pl-12 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer relative overflow-visible ml-4", // ml-4 to account for avatar
          className
        )}
        style={{ minHeight: '100px' }}
        onClick={handleClick}
      >
        {/* Pop-out Avatar */}
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-4 border-white shadow-lg bg-white overflow-hidden flex-shrink-0 z-20">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={businessName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
              {businessName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 pl-2">
          {/* Row 1: Name + Badge */}
          <div className="flex items-center gap-2">
            <h3
              className="font-semibold text-gray-900 text-base truncate leading-tight group-hover:text-indigo-600 transition-colors"
              dangerouslySetInnerHTML={{ __html: displayName }}
            />

            {business.recommendation_badge && (
              <RecommendationBadge
                tier={business.recommendation_badge}
                size="sm"
                showLabel={false}
              />
            )}
          </div>

          {/* Row 2: City | Stats - FIXED ALIGNMENT with Grid */}
          <div className="grid grid-cols-[1fr_auto] gap-4 text-sm text-gray-600 items-center">
            {/* Address Section */}
            <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
              <span className="truncate font-medium" title={displayLocation}>
                {displayLocation}
              </span>
            </div>

            {/* Stats Group - Grouped to keep them close together */}
            <div className="flex items-center gap-3">
              {/* Active Offers */}
              <div className="flex items-center gap-1.5" title="Active Offers">
                <Ticket className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                <span className="font-semibold">{couponCount}</span>
              </div>

              {/* Followers */}
              <div className="flex items-center gap-1.5" title="Followers">
                <Users className="w-5 h-5 text-teal-500 flex-shrink-0" />
                <span className="font-semibold">
                  {business.follower_count !== undefined ? business.follower_count : 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action button container - mimicking SearchBusinessCard's right section */}
        {actionButton && (
          <div
            className="flex items-center gap-2 pl-4 self-stretch"
            onClick={(e) => e.stopPropagation()}
          >
            {actionButton}
          </div>
        )}
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
              className="text-[15px] font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors"
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

          {business.follower_count !== undefined && (
            <div className="flex items-center gap-1">
              <span>
                {business.follower_count} {business.follower_count === 1 ? 'follower' : 'followers'}
              </span>
            </div>
          )}
        </div>

        {/* Location */}
        {displayLocation && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{displayLocation}</span>
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
