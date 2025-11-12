// src/components/following/FollowingPage.tsx
// Main page for managing followed businesses

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Search as SearchIcon, Settings, X, Users } from 'lucide-react';
import { useBusinessFollowing } from '../../hooks/useBusinessFollowing';
import { FollowButton } from './FollowButton';
import NotificationPreferencesModal from './NotificationPreferencesModal';
import { StandardBusinessCard, type StandardBusinessCardData } from '../common';
import { cn } from '../../lib/utils';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';

type SortBy = 'recent' | 'alphabetical' | 'most_active';

const FollowingPage: React.FC = () => {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const { followedBusinesses, loading, error, totalFollowing } = useBusinessFollowing();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [selectedBusiness, setSelectedBusiness] = useState<{ id: string; name: string } | null>(null);

  // Update page title dynamically
  useEffect(() => {
    document.title = `Following (${totalFollowing}) - SynC`;
  }, [totalFollowing]);

  // Filter and sort followed businesses
  const filteredBusinesses = useMemo(() => {
    let filtered = [...followedBusinesses];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(fb => 
        fb.business?.business_name?.toLowerCase().includes(query) ||
        fb.business?.business_type?.toLowerCase().includes(query) ||
        fb.business?.address?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.followed_at).getTime() - new Date(a.followed_at).getTime());
    } else if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => 
        (a.business?.business_name || '').localeCompare(b.business?.business_name || '')
      );
    }
    // 'most_active' would require additional data from updates

    return filtered;
  }, [followedBusinesses, searchQuery, sortBy]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your followed businesses...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">Error: {error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <h1 className="text-xs font-bold text-gray-900 flex items-center">
              <UserCheck className="h-6 w-6 text-indigo-600 mr-2" />
              Following
            </h1>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="recent">Recently Followed</option>
            <option value="alphabetical">Alphabetical</option>
            <option value="most_active">Most Active</option>
          </select>
        </div>

        {/* Business List */}
        {filteredBusinesses.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No businesses found' : 'No businesses yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? 'Try adjusting your search' 
                : 'Start following businesses to see updates from them'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('/search')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Discover Businesses
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map((follow) => {
              // Debug: Log business data to verify image URLs
              console.log('🔍 [FollowingPage] Business data:', {
                business_id: follow.business_id,
                business_name: follow.business?.business_name,
                logo_url: follow.business?.logo_url,
                cover_image_url: follow.business?.cover_image_url,
                has_business: !!follow.business
              });

              const businessData: StandardBusinessCardData = {
                id: follow.business_id,
                business_name: follow.business?.business_name,
                business_type: follow.business?.business_type,
                address: follow.business?.address,
                rating: follow.business?.rating,
                review_count: follow.business?.review_count,
                follower_count: follow.business?.follower_count,
                logo_url: follow.business?.logo_url,
                cover_image_url: follow.business?.cover_image_url,
                description: follow.business?.description,
              };

              return (
                <StandardBusinessCard
                  key={follow.id}
                  business={businessData}
                  onCardClick={(id) => navigate(getBusinessUrl(id, follow.business?.business_name || 'business'))}
                  showChevron={false}
                  actionButton={
                    <div className="flex items-center space-x-2">
                      {/* Settings/Notification Preferences Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBusiness({
                            id: follow.business_id,
                            name: follow.business?.business_name || 'Business'
                          });
                        }}
                        className="h-8 w-8 rounded-full bg-white/90 p-0 shadow-md backdrop-blur hover:bg-indigo-50 flex items-center justify-center transition-colors"
                        title="Notification preferences"
                      >
                        <Settings className="h-4 w-4 text-gray-600 hover:text-indigo-600" />
                      </button>
                      
                      {/* Follow Button */}
                      <FollowButton
                        businessId={follow.business_id}
                        businessName={follow.business?.business_name}
                        variant="ghost"
                        size="sm"
                        showLabel={false}
                        className="h-8 w-8 rounded-full bg-white/90 p-0 shadow-md backdrop-blur hover:bg-green-50"
                      />
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Notification Preferences Modal */}
      {selectedBusiness && (
        <NotificationPreferencesModal
          businessId={selectedBusiness.id}
          businessName={selectedBusiness.name}
          isOpen={!!selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
          currentPreferences={
            followedBusinesses.find(fb => fb.business_id === selectedBusiness.id)?.notification_preferences
          }
          currentChannel={
            followedBusinesses.find(fb => fb.business_id === selectedBusiness.id)?.notification_channel
          }
        />
      )}
    </div>
  );
};

export default FollowingPage;
