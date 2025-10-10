// src/components/business/BusinessCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Star, 
  Users, 
  Calendar, 
  CheckCircle,
  Briefcase,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Business } from '../../types/business';

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

  const handleClick = () => {
    navigate(`/business/${business.id}`);
  };

  const daysOld = Math.ceil(
    (Date.now() - new Date(business.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      onClick={handleClick}
      className="
        group relative bg-white rounded-lg shadow-sm border border-gray-200
        hover:shadow-lg hover:border-blue-300 
        transition-all duration-200 cursor-pointer
        overflow-hidden
      "
    >
      {/* New badge */}
      {showAge && daysOld <= 7 && (
        <div className="absolute top-3 right-3 z-10">
          <span className="
            inline-flex items-center gap-1 px-2.5 py-1 
            bg-green-500 text-white text-xs font-semibold 
            rounded-full shadow-sm
          ">
            <Calendar className="w-3 h-3" />
            New
          </span>
        </div>
      )}

      {/* Cover Image or Placeholder */}
      <div className="relative h-32 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
        {business.cover_image_url ? (
          <img
            src={business.cover_image_url}
            alt={business.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Briefcase className="w-12 h-12 text-white opacity-50" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Logo & Title */}
        <div className="flex items-start gap-3 mb-3">
          {/* Logo */}
          <div className="flex-shrink-0">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name}
                className="w-12 h-12 rounded-lg object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Title & Category */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {business.name}
              </h3>
              {business.is_verified && (
                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">
              {business.category}
            </p>
          </div>
        </div>

        {/* Description */}
        {business.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {business.description}
          </p>
        )}

        {/* Stats */}
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
              <Users className="w-3.5 h-3.5" />
              <span>{business.follower_count} followers</span>
            </div>
          )}
        </div>

        {/* Location */}
        {business.city && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {business.city}{business.state && `, ${business.state}`}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Owner info */}
          {showOwner && business.owner && (
            <div className="flex items-center gap-2">
              {business.owner.avatar_url ? (
                <img
                  src={business.owner.avatar_url}
                  alt={business.owner.full_name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                  {business.owner.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs text-gray-600 truncate">
                {business.owner.full_name}
              </span>
            </div>
          )}

          {/* Age */}
          {showAge && (
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(business.created_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
