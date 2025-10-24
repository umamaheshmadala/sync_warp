// CompactOfferCard.tsx
// Compact 3-line offer card for storefront overview display

import React from 'react';
import { Share2, Clock, Tag, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { Offer } from '../../types/offers';

interface CompactOfferCardProps {
  offer: Offer;
  onShare?: (offer: Offer) => void;
  onClick?: (offer: Offer) => void;
  highlighted?: boolean;
}

export const CompactOfferCard: React.FC<CompactOfferCardProps> = ({
  offer,
  onShare,
  onClick,
  highlighted = false,
}) => {
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(offer);
  };

  return (
    <div
      onClick={() => onClick?.(offer)}
      className={`
        bg-white border-2 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer
        ${highlighted ? 'border-indigo-500 ring-2 ring-indigo-100 animate-pulse' : 'border-gray-200 hover:border-gray-300'}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        {offer.icon_image_url ? (
          <img
            src={offer.icon_image_url}
            alt={offer.title}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Tag className="w-8 h-8 text-indigo-600" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Title & Code */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 truncate">{offer.title}</h4>
            <span className="text-xs font-mono text-indigo-600 flex-shrink-0">
              {offer.offer_code}
            </span>
          </div>

          {/* Line 2: Description */}
          <p className="text-sm text-gray-600 line-clamp-1 mb-2">
            {offer.description || 'No description provided'}
          </p>

          {/* Line 3: Validity & Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center text-xs text-gray-500 gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Until {format(new Date(offer.valid_until), 'MMM d, yyyy')}</span>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactOfferCard;
