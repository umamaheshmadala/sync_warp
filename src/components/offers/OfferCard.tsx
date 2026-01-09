// =====================================================
// Story 4.12: Business Offers Management
// Component: OfferCard - Display individual offer
// =====================================================

import React, { useEffect, useRef } from 'react';
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
  Archive,
  BarChart3,
  Copy,
  CalendarPlus,
  Zap,
  Tag
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';
import type { Offer } from '../../types/offers';
import { ShareButton } from '../Sharing/ShareButton';
import { getCategoryIcon } from '../../utils/iconMap';
import { FavoriteOfferButton } from '../favorites/FavoriteOfferButton';

interface OfferCardProps {
  offer: Offer;
  onShare?: (offer: Offer) => void;
  onEdit?: (offer: Offer) => void;
  onActivate?: (offer: Offer) => void;
  onPause?: (offer: Offer) => void;
  onArchive?: (offer: Offer) => void;
  onDelete?: (offer: Offer) => void;
  onViewAnalytics?: (offer: Offer) => void;
  onExtendExpiry?: (offer: Offer) => void;
  onDuplicate?: (offer: Offer) => void;
  onViewDetails?: (offer: Offer) => void;
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
  onViewAnalytics,
  onExtendExpiry,
  onDuplicate,
  onViewDetails,
  showActions = true,
  showStats = true,
}: OfferCardProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

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

  // Check if offer is currently valid (only for active status)
  const now = new Date();
  const isValid = offer.status === 'active' &&
    isAfter(now, new Date(offer.valid_from)) &&
    isBefore(now, new Date(offer.valid_until));
  const isExpired = isAfter(now, new Date(offer.valid_until));
  const isScheduled = isBefore(now, new Date(offer.valid_from));

  // Calculate trending status
  const isTrending = (offer.view_count + (offer.share_count * 2)) > 50;

  // Get Category Icon
  const CategoryIcon = offer.offer_type?.category?.icon_name
    ? getCategoryIcon(offer.offer_type.category.icon_name)
    : Calendar;

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
      onClick={() => onViewDetails && onViewDetails(offer)}
    >
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
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${offer.offer_type ? 'bg-purple-50' : 'bg-gradient-to-br from-purple-100 to-pink-100'
              }`}>
              <CategoryIcon className="w-8 h-8 text-purple-600" />
            </div>
          )}

          {/* Title and Code */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                  {offer.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Code: <span className="font-mono font-semibold text-purple-600">{offer.offer_code}</span>
                </p>
              </div>

              {/* Badges Container */}
              <div className="flex flex-wrap gap-2 mt-1">
                {/* Status Badge */}
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${currentStatus.className}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span className="text-xs font-semibold">{currentStatus.label}</span>
                </div>

                {/* Type Badge */}
                {offer.offer_type && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                    <Tag className="w-3 h-3" />
                    <span className="text-xs font-semibold line-clamp-1 max-w-[120px]">
                      {offer.offer_type.offer_name}
                    </span>
                  </div>
                )}

                {/* Trending Badge */}
                {isTrending && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                    <Zap className="w-3 h-3 fill-orange-700 text-orange-700" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Trending</span>
                  </div>
                )}
              </div>
            </div>

            {offer.description && (
              <p className="text-sm text-gray-600 mt-3 hidden lg:line-clamp-2">
                {offer.description}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          {showActions && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onViewAnalytics && (
                    <button
                      onClick={() => { onViewAnalytics(offer); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      View Analytics
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => { onEdit(offer); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={() => { onDuplicate(offer); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Duplicate
                    </button>
                  )}
                  {onExtendExpiry && (offer.status === 'expired' || offer.status === 'active') && (
                    <button
                      onClick={() => { onExtendExpiry(offer); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      Extend Expiry
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
          {offer.status === 'draft' ? (
            <span className="text-gray-500 font-medium">Draft</span>
          ) : isExpired ? (
            <span className="text-red-600 font-medium">Expired</span>
          ) : isValid ? (
            <span className="text-green-600 font-medium">Active Now</span>
          ) : isScheduled ? (
            <span className="text-blue-600 font-medium">Scheduled</span>
          ) : (
            <span className="text-gray-500">Inactive</span>
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
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Favorite Button - Story 4.13 */}
          <FavoriteOfferButton offerId={offer.id} className="text-xs px-3 py-1.5" />

          {/* Share Button */}
          <ShareButton
            shareableType="offer"
            shareableId={offer.id}
            shareableTitle={offer.title}
            shareableDescription={offer.description}
            shareableImageUrl={offer.icon_image_url}
            variant="default"
            className="px-4 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

export default OfferCard;
