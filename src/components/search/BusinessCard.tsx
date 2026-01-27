// BusinessCard.tsx
// Component for displaying business information in search results
// Shows business details, active coupon count, ratings, and location
// Now uses StandardBusinessCard for consistency across the application

import React from 'react';
import { SearchBusiness } from '../../services/searchService';
import { FollowButton } from '../following/FollowButton';
import { StandardBusinessCard, type StandardBusinessCardData } from '../common';
import { formatDistance, getPreferredDistanceUnit } from '../../utils/locationUtils';

interface BusinessCardProps {
  business: SearchBusiness;
  onBusinessClick?: (businessId: string) => void;
  variant?: 'default' | 'compact' | 'featured';
  showDistance?: boolean;
  showCouponCount?: boolean;
  getFormattedDistance?: (distanceInMeters?: number) => string | null;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  business,
  onBusinessClick,
  variant = 'default',
  showDistance = false,
  showCouponCount = true,
  getFormattedDistance
}) => {
  // Convert SearchBusiness to StandardBusinessCardData
  const businessData: StandardBusinessCardData = {
    id: business.id,
    business_name: business.business_name,
    business_type: business.business_type,
    address: business.address,
    rating: business.rating,
    review_count: business.review_count,
    follower_count: business.follower_count,
    activeCouponsCount: business.activeCouponsCount,
    logo_url: business.logo_url,
    cover_image_url: business.cover_image_url,
    description: business.description,
    highlightedName: business.highlightedName,
    recommendation_badge: business.recommendation_badge,
    recommendation_percentage: business.recommendation_percentage,
    approved_review_count: business.approved_review_count,
  };

  // Compact variant for mobile or tight spaces
  if (variant === 'compact') {
    return (
      <StandardBusinessCard
        business={businessData}
        onCardClick={onBusinessClick}
        variant="compact"
        showCouponCount={showCouponCount}
        actionButton={
          <FollowButton
            businessId={business.id}
            businessName={business.business_name}
            variant="ghost"
            size="sm"
            showLabel={false}
            className="h-8 w-8 rounded-full bg-white/90 p-0 shadow-sm hover:bg-green-50"
          />
        }
      />
    );
  }

  // Featured variant - keep custom styling for promotional display
  if (variant === 'featured') {
    // For featured, we might keep the special gradient design
    // But for now, use StandardBusinessCard for consistency
    return (
      <StandardBusinessCard
        business={businessData}
        onCardClick={onBusinessClick}
        showCouponCount={showCouponCount}
        actionButton={
          <FollowButton
            businessId={business.id}
            businessName={business.business_name}
            variant="ghost"
            size="sm"
            showLabel={false}
            className="h-8 w-8 rounded-full bg-white/90 p-0 shadow-md backdrop-blur hover:bg-green-50"
          />
        }
      />
    );
  }

  // Default variant
  return (
    <StandardBusinessCard
      business={businessData}
      onCardClick={onBusinessClick}
      showCouponCount={showCouponCount}
      actionButton={
        <FollowButton
          businessId={business.id}
          businessName={business.business_name}
          variant="ghost"
          size="sm"
          showLabel={false}
          className="h-8 w-8 rounded-full bg-white/90 p-0 shadow-md backdrop-blur hover:bg-green-50"
        />
      }
    />
  );
};

export default BusinessCard;