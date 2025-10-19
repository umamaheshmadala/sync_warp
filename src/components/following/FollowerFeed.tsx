// src/components/following/FollowerFeed.tsx
// Live feed of updates from followed businesses

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Tag, Ticket, Megaphone, TrendingDown, RefreshCw, Filter } from 'lucide-react';
import { useFollowerUpdates, FollowerUpdate } from '../../hooks/useFollowerUpdates';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';

type UpdateFilter = 'all' | 'new_product' | 'new_offer' | 'new_coupon' | 'announcement';

const FollowerFeed: React.FC = () => {
  const navigate = useNavigate();
  const { updates, loading, hasMore, loadMore, refresh, error, filterByType, currentFilter } = useFollowerUpdates();

  // Group updates by time period
  const groupedUpdates = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const groups: { [key: string]: FollowerUpdate[] } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    updates.forEach(update => {
      const updateDate = new Date(update.created_at);
      if (updateDate >= today) {
        groups.today.push(update);
      } else if (updateDate >= yesterday) {
        groups.yesterday.push(update);
      } else if (updateDate >= thisWeek) {
        groups.thisWeek.push(update);
      } else {
        groups.older.push(update);
      }
    });

    return groups;
  }, [updates]);

  // Get icon for update type
  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'new_product':
        return <Package className="h-5 w-5 text-indigo-600" />;
      case 'new_offer':
        return <Tag className="h-5 w-5 text-green-600" />;
      case 'new_coupon':
        return <Ticket className="h-5 w-5 text-yellow-600" />;
      case 'announcement':
        return <Megaphone className="h-5 w-5 text-purple-600" />;
      case 'price_drop':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  // Get background color for update type
  const getUpdateBgColor = (type: string) => {
    switch (type) {
      case 'new_product':
        return 'bg-indigo-50 border-indigo-200';
      case 'new_offer':
        return 'bg-green-50 border-green-200';
      case 'new_coupon':
        return 'bg-yellow-50 border-yellow-200';
      case 'announcement':
        return 'bg-purple-50 border-purple-200';
      case 'price_drop':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Get label for update type
  const getUpdateLabel = (type: string) => {
    switch (type) {
      case 'new_product':
        return 'New Product';
      case 'new_offer':
        return 'New Offer';
      case 'new_coupon':
        return 'New Coupon';
      case 'announcement':
        return 'Announcement';
      case 'price_drop':
        return 'Price Drop';
      case 'back_in_stock':
        return 'Back in Stock';
      default:
        return 'Update';
    }
  };

  // Handle update click
  const handleUpdateClick = (update: FollowerUpdate) => {
    // Navigate to appropriate page based on update type
    if (update.entity_id) {
      switch (update.update_type) {
        case 'new_product':
          navigate(`/products/${update.entity_id}`);
          break;
        case 'new_offer':
        case 'new_coupon':
          navigate(`/business/${update.business_id}`);
          break;
        default:
          navigate(`/business/${update.business_id}`);
      }
    } else {
      navigate(`/business/${update.business_id}`);
    }
  };

  // Render update card
  const renderUpdateCard = (update: FollowerUpdate) => (
    <motion.div
      key={update.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow',
        getUpdateBgColor(update.update_type)
      )}
      onClick={() => handleUpdateClick(update)}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          {getUpdateIcon(update.update_type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Business name and type */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-gray-900 truncate">
              {update.business?.business_name || 'Unknown Business'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white bg-opacity-50 font-medium">
              {getUpdateLabel(update.update_type)}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-medium text-gray-900 mb-1">{update.title}</h3>

          {/* Description */}
          {update.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{update.description}</p>
          )}

          {/* Metadata */}
          {update.metadata && (
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              {update.metadata.price && (
                <span className="font-medium">₹{update.metadata.price}</span>
              )}
              {update.metadata.discount_value && (
                <span className="text-green-600 font-medium">
                  {update.metadata.discount_value}% OFF
                </span>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div className="mt-2 text-xs text-gray-500">
            {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Render time group
  const renderTimeGroup = (title: string, updates: FollowerUpdate[]) => {
    if (updates.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {title}
        </h3>
        <div className="space-y-3">
          {updates.map(renderUpdateCard)}
        </div>
      </div>
    );
  };

  // Loading state
  if (loading && updates.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading updates...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-500 mb-4">Error loading updates</div>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header with filters */}
      <div className="sticky top-0 bg-white z-10 pb-4 mb-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Updates Feed</h2>
          <button
            onClick={refresh}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-5 w-5 text-gray-600", loading && "animate-spin")} />
          </button>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          {[
            { value: 'all', label: 'All' },
            { value: 'new_product', label: 'Products' },
            { value: 'new_offer', label: 'Offers' },
            { value: 'new_coupon', label: 'Coupons' },
            { value: 'announcement', label: 'Announcements' },
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => filterByType(filter.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                currentFilter === filter.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Updates list */}
      {updates.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No updates yet</h3>
          <p className="text-gray-600 mb-6">
            Follow some businesses to see their latest updates here
          </p>
          <button
            onClick={() => navigate('/following')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Manage Following
          </button>
        </div>
      ) : (
        <>
          {renderTimeGroup('Today', groupedUpdates.today)}
          {renderTimeGroup('Yesterday', groupedUpdates.yesterday)}
          {renderTimeGroup('This Week', groupedUpdates.thisWeek)}
          {renderTimeGroup('Older', groupedUpdates.older)}

          {/* Load more button */}
          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FollowerFeed;
