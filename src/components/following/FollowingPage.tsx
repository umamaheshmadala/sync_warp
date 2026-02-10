// src/components/following/FollowingPage.tsx
// Main page for managing followed businesses

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Settings, X, Users, ChevronDown } from 'lucide-react';
import { useBusinessFollowing } from '../../hooks/useBusinessFollowing';
import { FollowButton } from './FollowButton';
import NotificationPreferencesModal from './NotificationPreferencesModal';
import { StandardBusinessCard, type StandardBusinessCardData } from '../common';
import { StorefrontShareButton } from '../Sharing/StorefrontShareButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
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
    // Apply sorting
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.followed_at).getTime() - new Date(a.followed_at).getTime());
    } else if (sortBy === 'alphabetical') {
      filtered.sort((a, b) =>
        (a.business?.business_name || '').localeCompare(b.business?.business_name || '')
      );
    } else if (sortBy === 'most_active') {
      // Sort by number of active coupons/offers
      filtered.sort((a, b) =>
        (b.business?.active_coupons_count || 0) - (a.business?.active_coupons_count || 0)
      );
    }

    return filtered;
  }, [followedBusinesses, searchQuery, sortBy]);

  // Loading state
  if (loading && followedBusinesses.length === 0) {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Search and Filters - Always inline */}
        <div className="flex flex-row items-center gap-2 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search followed businesses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortBy)}
            >
              <SelectTrigger className="w-full sm:w-[180px] bg-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Followed</SelectItem>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
                <SelectItem value="most_active">Most Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          <div className="flex flex-col gap-[10px] px-4">
            {filteredBusinesses.map((follow) => {
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
                active_coupons_count: follow.business?.active_coupons_count
              };

              return (
                <StandardBusinessCard
                  key={follow.id}
                  business={businessData}
                  onCardClick={(id) => navigate(getBusinessUrl(id, follow.business?.business_name || 'business'))}
                  showChevron={false}
                  variant="search"
                  actionButton={
                    <div className="flex items-center gap-2">
                      {/* Share Button */}
                      <StorefrontShareButton
                        businessId={follow.business_id}
                        businessName={follow.business?.business_name || ''}
                        businessImageUrl={follow.business?.logo_url}
                        showLabel={false}
                        showIcon={true}
                        showModal={true}
                        className="p-2.5 w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 border-none shadow-none"
                        variant="ghost"
                      />

                      {/* Settings/Notification Preferences Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBusiness({
                            id: follow.business_id,
                            name: follow.business?.business_name || 'Business'
                          });
                        }}
                        className="p-2.5 w-10 h-10 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800 border-none shadow-none flex items-center justify-center transition-colors"
                        title="Notification preferences"
                      >
                        <Settings className="w-5 h-5" />
                      </button>

                      {/* Follow Button */}
                      <FollowButton
                        businessId={follow.business_id}
                        businessName={follow.business?.business_name}
                        variant="ghost"
                        size="sm"
                        showLabel={false}
                        className={cn(
                          "p-2.5 w-10 h-10 rounded-full border-none shadow-none transition-colors",
                          "bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800"
                        )}
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
