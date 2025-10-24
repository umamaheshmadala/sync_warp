// =====================================================
// Story 4.12: Business Offers Management
// Component: OfferCard - Display individual offer
// =====================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Eye, 
  Share2, 
  MousePointerClick, 
  MoreVertical,
  Clock,
  CheckCircle,
  Pause,
  Archive
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';
import type { Offer } from '../../types/offers';

interface OfferCardProps {
  offer: Offer;
  onShare?: (offer: Offer) => void;
  onEdit?: (offer: Offer) => void;
  onActivate?: (offer: Offer) => void;
  onPause?: (offer: Offer) => void;
  onArchive?: (offer: Offer) => void;
  onDelete?: (offer: Offer) => void;
  showActions?: boolean;
  showStats?: boolean;
}

export function OfferCard({
  offer,
  onShare,
  onEdit,
  onActivate,
  onPause,
  onArchive,
  onDelete,
  showActions = true,
  showStats = true,
}: OfferCardProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = React.useState(false);

  // Status badge configuration
  const statusConfig = {
    draft: { 
      icon: Clock, 
      label: 'Draft', 
      className: 'bg-gray-100 text-gray-700 border-gray-200' 
    },
    active: { 
      icon: CheckCircle, 
      label: 'Active', 
      className: 'bg-green-100 text-green-700 border-green-200' 
    },
    paused: { 
      icon: Pause, 
      label: 'Paused', 
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200' 
    },
    expired: { 
      icon: Calendar, 
      label: 'Expired', 
      className: 'bg-red-100 text-red-700 border-red-200' 
    },
    archived: { 
      icon: Archive, 
      label: 'Archived', 
      className: 'bg-gray-100 text-gray-500 border-gray-200' 
    },
  };

  const currentStatus = statusConfig[offer.status];
  const StatusIcon = currentStatus.icon;

  // Check if offer is currently valid
  const now = new Date();
  const isValid = isAfter(now, new Date(offer.valid_from)) && 
                  isBefore(now, new Date(offer.valid_until));
  const isExpired = isAfter(now, new Date(offer.valid_until));

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      {/* Header with Icon and Status */}
      <div className="relative p-6 border-b border-gray-100">
        <div className="flex items-start gap-4">
          {/* Icon */}
          {offer.icon_image_url ? (
            <img
              src={offer.icon_image_url}
              alt={offer.title}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          )}

          {/* Title and Code */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 
                  className="text-lg font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-purple-600"
                  onClick={() => navigate(`/offers/${offer.id}`)}
                >
                  {offer.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Code: <span className="font-mono font-semibold text-purple-600">{offer.offer_code}</span>
                </p>
              </div>

              {/* Status Badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${currentStatus.className}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">{currentStatus.label}</span>
              </div>
            </div>

            {/* Description */}
            {offer.description && (
              <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                {offer.description}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          {showActions && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10">
                  {onEdit && (
                    <button
                      onClick={() => { onEdit(offer); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  )}
                  {onActivate && offer.status !== 'active' && (
                    <button
                      onClick={() => { onActivate(offer); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Activate
                    </button>
                  )}
                  {onPause && offer.status === 'active' && (
                    <button
                      onClick={() => { onPause(offer); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Pause
                    </button>
                  )}
                  {onArchive && (
                    <button
                      onClick={() => { onArchive(offer); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Archive
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => { onDelete(offer); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Validity Period */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(offer.valid_from), 'MMM d, yyyy')} - {format(new Date(offer.valid_until), 'MMM d, yyyy')}
            </span>
          </div>
          {isExpired ? (
            <span className="text-red-600 font-medium">Expired</span>
          ) : isValid ? (
            <span className="text-green-600 font-medium">Active Now</span>
          ) : (
            <span className="text-gray-500">Scheduled</span>
          )}
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Eye className="w-4 h-4 text-blue-600" />
                <span className="text-xl font-semibold text-gray-900">{offer.view_count}</span>
              </div>
              <span className="text-xs text-gray-500">Views</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Share2 className="w-4 h-4 text-purple-600" />
                <span className="text-xl font-semibold text-gray-900">{offer.share_count}</span>
              </div>
              <span className="text-xs text-gray-500">Shares</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <MousePointerClick className="w-4 h-4 text-green-600" />
                <span className="text-xl font-semibold text-gray-900">{offer.click_count}</span>
              </div>
              <span className="text-xs text-gray-500">Clicks</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Created {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
        </span>
        {onShare && (
          <button
            onClick={() => onShare(offer)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        )}
      </div>
    </div>
  );
}

export default OfferCard;
