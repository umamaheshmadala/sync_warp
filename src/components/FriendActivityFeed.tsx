// src/components/FriendActivityFeed.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Share2, 
  MessageCircle, 
  ShoppingBag, 
  Star, 
  UserPlus,
  Clock,
  Eye,
  Gift,
  TrendingUp,
  Filter,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useFriends } from '../hooks/useFriends';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import type { FriendActivity } from '../services/friendService';

interface FriendActivityFeedProps {
  className?: string;
  limit?: number;
  showFilters?: boolean;
}

type ActivityFilter = 'all' | 'saves' | 'shares' | 'social' | 'purchases';

const FriendActivityFeed: React.FC<FriendActivityFeedProps> = ({ 
  className = '', 
  limit = 20,
  showFilters = true 
}) => {
  const { friendActivities, friends, loading, refreshActivities } = useFriends();
  const { triggerHaptic } = useHapticFeedback();
  
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter activities based on selected filter
  const getFilteredActivities = () => {
    let filtered = friendActivities;
    
    switch (filter) {
      case 'saves':
        filtered = filtered.filter(a => a.type === 'deal_save');
        break;
      case 'shares':
        filtered = filtered.filter(a => a.type === 'deal_share');
        break;
      case 'social':
        filtered = filtered.filter(a => ['friend_add', 'profile_update'].includes(a.type));
        break;
      case 'purchases':
        filtered = filtered.filter(a => a.type === 'deal_purchase');
        break;
      default:
        // 'all' - no filter
        break;
    }
    
    return filtered.slice(0, limit);
  };

  const filteredActivities = getFilteredActivities();

  // Get activity icon and styling
  const getActivityIcon = (activity: FriendActivity) => {
    const iconClass = "h-4 w-4";
    
    switch (activity.type) {
      case 'deal_save':
        return <Heart className={`${iconClass} text-red-500`} />;
      case 'deal_share':
        return <Share2 className={`${iconClass} text-blue-500`} />;
      case 'deal_purchase':
        return <ShoppingBag className={`${iconClass} text-green-500`} />;
      case 'deal_view':
        return <Eye className={`${iconClass} text-gray-500`} />;
      case 'friend_add':
        return <UserPlus className={`${iconClass} text-indigo-500`} />;
      case 'profile_update':
        return <Star className={`${iconClass} text-yellow-500`} />;
      default:
        return <Clock className={`${iconClass} text-gray-400`} />;
    }
  };

  // Get activity description
  const getActivityDescription = (activity: FriendActivity) => {
    const friend = friends.find(f => f.friend_profile.user_id === activity.user_id);
    const friendName = friend?.friend_profile.full_name || 'Someone';
    
    switch (activity.type) {
      case 'deal_save':
        return `${friendName} saved "${activity.deal_title}"`;
      case 'deal_share':
        return activity.message 
          ? `${friendName} shared "${activity.deal_title}": ${activity.message}`
          : `${friendName} shared "${activity.deal_title}"`;
      case 'deal_purchase':
        return `${friendName} purchased "${activity.deal_title}"`;
      case 'deal_view':
        return `${friendName} viewed "${activity.deal_title}"`;
      case 'friend_add':
        return `${friendName} joined your network`;
      case 'profile_update':
        return `${friendName} updated their profile`;
      default:
        return `${friendName} performed an action`;
    }
  };

  // Get activity color scheme
  const getActivityColorScheme = (activity: FriendActivity) => {
    switch (activity.type) {
      case 'deal_save':
        return 'bg-red-50 border-red-200';
      case 'deal_share':
        return 'bg-blue-50 border-blue-200';
      case 'deal_purchase':
        return 'bg-green-50 border-green-200';
      case 'deal_view':
        return 'bg-gray-50 border-gray-200';
      case 'friend_add':
        return 'bg-indigo-50 border-indigo-200';
      case 'profile_update':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerHaptic('light');
    
    try {
      await refreshActivities();
      triggerHaptic('success');
    } catch (error) {
      console.error('Error refreshing activities:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFilterChange = (newFilter: ActivityFilter) => {
    setFilter(newFilter);
    triggerHaptic('light');
  };

  const filterButtons = [
    { id: 'all' as const, label: 'All', icon: TrendingUp },
    { id: 'saves' as const, label: 'Saves', icon: Heart },
    { id: 'shares' as const, label: 'Shares', icon: Share2 },
    { id: 'social' as const, label: 'Social', icon: UserPlus },
    { id: 'purchases' as const, label: 'Purchases', icon: ShoppingBag },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Friend Activity</h3>
            <p className="text-sm text-gray-500">See what your friends are up to</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Refresh activities"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
            {filterButtons.map((button) => {
              const Icon = button.icon;
              const isActive = filter === button.id;
              
              return (
                <button
                  key={button.id}
                  onClick={() => handleFilterChange(button.id)}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive 
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{button.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8 px-4">
            <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {filter === 'all' ? 'No activity yet' : `No ${filter} activity`}
            </h3>
            <p className="text-sm text-gray-500">
              {filter === 'all' 
                ? 'Your friends\' activities will appear here'
                : 'Try selecting a different filter'
              }
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredActivities.map((activity) => {
                const friend = friends.find(f => f.friend_profile.user_id === activity.user_id);
                const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });
                
                return (
                  <motion.div
                    key={activity.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border ${getActivityColorScheme(activity)}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    layout
                  >
                    {/* Friend Avatar */}
                    <div className="relative flex-shrink-0">
                      {friend?.friend_profile.avatar_url ? (
                        <img
                          src={friend.friend_profile.avatar_url}
                          alt={friend.friend_profile.full_name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {friend?.friend_profile.full_name.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      
                      {/* Activity Icon Badge */}
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                        {getActivityIcon(activity)}
                      </div>
                    </div>

                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 break-words">
                        {getActivityDescription(activity)}
                      </p>
                      
                      <div className="flex items-center mt-1 space-x-2">
                        <p className="text-xs text-gray-500">{timeAgo}</p>
                        
                        {/* Additional metadata */}
                        {activity.deal_id && (
                          <>
                            <span className="text-xs text-gray-300">•</span>
                            <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                              View Deal
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredActivities.length >= limit && (
        <div className="border-t border-gray-200 px-4 py-3">
          <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            View more activities
          </button>
        </div>
      )}
    </div>
  );
};

export default FriendActivityFeed;