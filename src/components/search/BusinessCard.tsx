// BusinessCard.tsx
// Component for displaying business information in search results
// Shows business details, active coupon count, ratings, and location

import React from 'react';
import { MapPin, Star, Users, Tag, ChevronRight, Ticket } from 'lucide-react';
import { SearchBusiness } from '../../services/searchService';
import SimpleSaveButton from '../favorites/SimpleSaveButton';
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
  // Handle business click
  const handleBusinessClick = () => {
    if (onBusinessClick) {
      onBusinessClick(business.id);
    }
  };

  // Get business type display
  const getBusinessTypeDisplay = () => {
    if (!business.business_type) return '';
    
    // Format business type for display
    return business.business_type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get coupon count display
  const getCouponCountDisplay = () => {
    if (business.activeCouponsCount === 0) return 'No active offers';
    if (business.activeCouponsCount === 1) return '1 active offer';
    return `${business.activeCouponsCount} active offers`;
  };
  
  // Get coupon indicator color based on count
  const getCouponIndicatorColor = () => {
    if (business.activeCouponsCount === 0) return 'text-gray-400';
    if (business.activeCouponsCount <= 2) return 'text-yellow-500';
    if (business.activeCouponsCount <= 5) return 'text-orange-500';
    return 'text-green-500';
  };

  // Compact variant for mobile or tight spaces
  if (variant === 'compact') {
    return (
      <div
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleBusinessClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 
              className="text-sm font-semibold text-gray-900 truncate"
              dangerouslySetInnerHTML={{ __html: business.highlightedName || business.business_name }}
            />
            
            <div className="flex items-center space-x-3 mt-1">
              {business.business_type && (
                <span className="text-xs text-gray-500">
                  {getBusinessTypeDisplay()}
                </span>
              )}
              
              {business.rating && (
                <div className="flex items-center">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-600 ml-1">{business.rating}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-1">
            {showCouponCount && (
              <div className="flex items-center space-x-1 text-xs">
                <Ticket className={`w-3 h-3 ${getCouponIndicatorColor()}`} />
                <span className={business.activeCouponsCount > 0 ? 'text-indigo-600' : 'text-gray-500'}>
                  {getCouponCountDisplay()}
                </span>
              </div>
            )}
              
              {showDistance && business.distance && (
                <div className="text-xs text-gray-500 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {getFormattedDistance ? getFormattedDistance(business.distance) : formatDistance(business.distance, getPreferredDistanceUnit())}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-shrink-0 ml-3 flex items-center space-x-2">
            <SimpleSaveButton itemId={business.id} itemType="business" variant="compact" />
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  // Featured variant for hero/prominent display
  if (variant === 'featured') {
    return (
      <div
        className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg text-white p-6 cursor-pointer hover:shadow-xl transition-shadow relative overflow-hidden"
        onClick={handleBusinessClick}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-full -mr-8 -mt-8" />
        <div className="absolute bottom-0 left-0 w-12 h-12 bg-white opacity-10 rounded-full -ml-6 -mb-6" />
        
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 
                className="text-xl font-bold mb-1"
                dangerouslySetInnerHTML={{ __html: business.highlightedName || business.business_name }}
              />
              
              {business.business_type && (
                <div className="bg-white bg-opacity-20 backdrop-blur-sm px-2 py-1 rounded text-sm">
                  {getBusinessTypeDisplay()}
                </div>
              )}
            </div>
            
            {business.rating && (
              <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-2 rounded-lg flex items-center">
                <Star className="w-4 h-4 text-yellow-300 fill-current mr-1" />
                <span className="text-sm font-semibold">{business.rating}</span>
              </div>
            )}
          </div>
          
          {business.description && (
            <p className="text-blue-100 text-sm mb-4 line-clamp-2">
              {business.description}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SimpleSaveButton itemId={business.id} itemType="business" variant="default" />
              
              {business.address && (
                <div className="flex items-center text-blue-100">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="text-sm">{business.address}</span>
                </div>
              )}
              
              {showDistance && business.distance && (
                <div className="flex items-center text-blue-200 text-sm">
                  <span>{getFormattedDistance ? getFormattedDistance(business.distance) : formatDistance(business.distance, getPreferredDistanceUnit())} away</span>
                </div>
              )}
            </div>
            
            {showCouponCount && (
              <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-1">
                <Ticket className={`w-4 h-4 ${getCouponIndicatorColor()}`} />
                <span>{getCouponCountDisplay()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow relative group"
      onClick={handleBusinessClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 
              className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors"
              dangerouslySetInnerHTML={{ __html: business.highlightedName || business.business_name }}
            />
            
            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
              <SimpleSaveButton itemId={business.id} itemType="business" variant="compact" />
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mb-3">
            {business.business_type && (
              <div className="flex items-center">
                <Tag className="w-4 h-4 text-gray-400 mr-1" />
                <span className="text-sm text-gray-600">
                  {getBusinessTypeDisplay()}
                </span>
              </div>
            )}
            
            {business.rating && (
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                <span className="text-sm font-medium text-gray-700">{business.rating}</span>
                <span className="text-xs text-gray-500 ml-1">rating</span>
              </div>
            )}
            
            {showDistance && business.distance && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                {getFormattedDistance ? getFormattedDistance(business.distance) : formatDistance(business.distance, getPreferredDistanceUnit())} away
              </div>
            )}
          </div>
          
          {business.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {business.description}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          {business.address && (
            <div className="flex items-center text-gray-500">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="text-sm truncate max-w-[200px]">{business.address}</span>
            </div>
          )}
        </div>
        
        {showCouponCount && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${
            business.activeCouponsCount > 0
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            <Ticket className={`w-4 h-4 ${getCouponIndicatorColor()}`} />
            <span>{getCouponCountDisplay()}</span>
          </div>
        )}
      </div>
      
      {/* Relevance score indicator (for debugging/admin) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-50">
          Score: {business.relevanceScore}
        </div>
      )}
    </div>
  );
};

export default BusinessCard;