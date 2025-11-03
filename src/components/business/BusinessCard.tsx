// src/components/business/BusinessCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Business } from '../../types/business';
import { FollowButton } from '../following/FollowButton';
import { StandardBusinessCard, type StandardBusinessCardData } from '../common';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';

interface BusinessCardProps {
  business: Business;
  showOwner?: boolean;
  showAge?: boolean;
}

export function BusinessCard({ 
  business, 
  showOwner = true,
  showAge = true,
}: BusinessCardProps) {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();

  const daysOld = Math.ceil(
    (Date.now() - new Date(business.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const businessData: StandardBusinessCardData = {
    id: business.id,
    name: business.name,
    category: business.category,
    city: business.city,
    state: business.state,
    rating: business.rating,
    review_count: business.review_count,
    follower_count: business.follower_count,
    logo_url: business.logo_url,
    cover_image_url: business.cover_image_url,
    description: business.description,
  };

  return (
    <div className="relative">
      <StandardBusinessCard
        business={businessData}
        onCardClick={(id) => navigate(getBusinessUrl(id, business.name))}
        showChevron={false}
        showCouponCount={false}
        actionButton={
          <div className="flex items-center gap-2">
            <FollowButton
              businessId={business.id}
              businessName={business.name}
              variant="ghost"
              size="sm"
              showLabel={false}
              className="h-8 w-8 rounded-full bg-white/90 p-0 shadow-md backdrop-blur hover:bg-green-50"
            />
            {showAge && daysOld <= 7 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500 text-white text-xs font-semibold rounded-full shadow-sm">
                <Calendar className="w-3 h-3" />
                New
              </span>
            )}
          </div>
        }
      />
      {/* Additional info footer */}
      {(showOwner || showAge) && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 flex items-center justify-between text-xs">
          {showOwner && business.owner && (
            <div className="flex items-center gap-2">
              {business.owner.avatar_url ? (
                <img
                  src={business.owner.avatar_url}
                  alt={business.owner.full_name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                  {business.owner.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-gray-600 truncate">
                {business.owner.full_name}
              </span>
            </div>
          )}
          {showAge && (
            <span className="text-gray-500">
              {formatDistanceToNow(new Date(business.created_at), { addSuffix: true })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
