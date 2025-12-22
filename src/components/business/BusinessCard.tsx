// src/components/business/BusinessCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Business } from '../../types/business';
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

  return (
    <div
      onClick={() => navigate(getBusinessUrl(business.id, business.name))}
      className="bg-white rounded-xl md:rounded-2xl shadow-sm md:shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 relative"
    >
      {/* Desktop only: Show cover image */}
      <div className="hidden md:flex h-32 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 items-center justify-center relative">
        {business.cover_image_url ? (
          <img
            src={business.cover_image_url}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <div className="text-2xl mb-2">🏢</div>
            <p className="text-sm text-gray-600 font-medium">{business.category}</p>
          </div>
        )}
      </div>

      {/* Mobile and Desktop: Content section */}
      <div className="p-3 md:p-4">
        <div className="flex md:block items-start gap-2 md:gap-0">
          {/* Mobile only: Icon */}
          <div className="md:hidden flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center text-xl relative">
            {business.logo_url ? (
              <img src={business.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <span>🏢</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{business.name}</h3>
            <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3 truncate">
              {business.city}, {business.state}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-400 fill-current mr-1" />
                <span className="text-xs md:text-sm font-medium">{business.rating || 0}</span>
              </div>
              <span className="text-xs md:text-sm text-gray-500">({business.review_count || 0})</span>
            </div>

            {(showAge) && (
              <div className="mt-2 text-[10px] text-gray-400 md:hidden">
                {formatDistanceToNow(new Date(business.created_at), { addSuffix: true })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
