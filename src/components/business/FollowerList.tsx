// src/components/business/FollowerList.tsx
// Detailed list of followers with search, filter, and sort capabilities

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Filter, UserX, Flag, Calendar, MapPin, TrendingUp, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import SuspiciousActivityReporter from './SuspiciousActivityReporter';

interface Follower {
  id: string;
  user_id: string;
  business_id: string;
  followed_at: string;
  notification_preferences: any;
  profiles?: {
    username: string;
    age?: number;
    gender?: string;
    city?: string;
    interests?: string[];
    driver_score?: number;
  };
}

type SortBy = 'recent' | 'active' | 'score';

const FollowerList: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [ageFilter, setAgeFilter] = useState<{ min?: number; max?: number }>({});
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedFollower, setSelectedFollower] = useState<{ id: string; username: string } | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [followerToRemove, setFollowerToRemove] = useState<{ relationshipId: string; username: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Load followers
  useEffect(() => {
    if (!businessId) return;

    const loadFollowers = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('business_followers')
          .select(`
            *,
            profiles (
              username,
              age,
              gender,
              city,
              interests,
              driver_score
            )
          `)
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('followed_at', { ascending: false });

        if (error) throw error;

        setFollowers(data as Follower[] || []);
      } catch (err) {
        console.error('Error loading followers:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFollowers();
  }, [businessId]);

  // Filter and sort followers
  const filteredFollowers = useMemo(() => {
    let filtered = [...followers];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.profiles?.username?.toLowerCase().includes(query) ||
        f.profiles?.city?.toLowerCase().includes(query)
      );
    }

    // Age filter
    if (ageFilter.min !== undefined) {
      filtered = filtered.filter(f => (f.profiles?.age || 0) >= ageFilter.min!);
    }
    if (ageFilter.max !== undefined) {
      filtered = filtered.filter(f => (f.profiles?.age || 0) <= ageFilter.max!);
    }

    // Gender filter
    if (genderFilter) {
      filtered = filtered.filter(f => f.profiles?.gender === genderFilter);
    }

    // City filter
    if (cityFilter) {
      filtered = filtered.filter(f => f.profiles?.city?.toLowerCase().includes(cityFilter.toLowerCase()));
    }

    // Sort
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.followed_at).getTime() - new Date(a.followed_at).getTime());
    } else if (sortBy === 'score') {
      filtered.sort((a, b) => (b.profiles?.driver_score || 0) - (a.profiles?.driver_score || 0));
    }

    return filtered;
  }, [followers, searchQuery, ageFilter, genderFilter, cityFilter, sortBy]);

  // Remove follower functionality
  const handleRemoveFollower = async () => {
    if (!followerToRemove) return;

    setIsRemoving(true);
    try {
      const { error } = await supabase
        .from('business_followers')
        .update({ is_active: false })
        .eq('id', followerToRemove.relationshipId);

      if (error) throw error;

      // Update local state optimistically
      setFollowers(prev => prev.filter(f => f.id !== followerToRemove.relationshipId));
      
      // Show success message
      console.log('Follower removed successfully');
      
      // Close dialog
      setRemoveConfirmOpen(false);
      setFollowerToRemove(null);
    } catch (err: any) {
      console.error('Error removing follower:', err);
      alert('Failed to remove follower. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading followers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Followers</h1>
        <p className="text-gray-600">{followers.length} total followers</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="recent">Recently Followed</option>
            <option value="active">Most Active</option>
            <option value="score">Highest Driver Score</option>
          </select>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-4 py-2 border rounded-lg transition-colors flex items-center space-x-2",
              showFilters ? "bg-indigo-50 border-indigo-600 text-indigo-600" : "border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Age Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={ageFilter.min || ''}
                  onChange={(e) => setAgeFilter({ ...ageFilter, min: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={ageFilter.max || ''}
                  onChange={(e) => setAgeFilter({ ...ageFilter, max: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                placeholder="Filter by city"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Followers List */}
      {filteredFollowers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <p className="text-gray-500">No followers found matching your criteria</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFollowers.map((follower) => (
            <motion.div
              key={follower.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                {/* Follower Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-indigo-600">
                        {follower.profiles?.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {follower.profiles?.username || 'Unknown User'}
                      </h3>
                      {follower.profiles?.age && follower.profiles?.gender && (
                        <p className="text-sm text-gray-500">
                          {follower.profiles.age} years • {follower.profiles.gender}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {/* City */}
                    {follower.profiles?.city && (
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{follower.profiles.city}</span>
                      </div>
                    )}

                    {/* Following Since */}
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{formatDistanceToNow(new Date(follower.followed_at), { addSuffix: true })}</span>
                    </div>

                    {/* Driver Score */}
                    {follower.profiles?.driver_score !== undefined && (
                      <div className="flex items-center text-gray-600">
                        <TrendingUp className="h-4 w-4 mr-2 text-gray-400" />
                        <span>Score: {follower.profiles.driver_score}</span>
                      </div>
                    )}

                    {/* Interests */}
                    {follower.profiles?.interests && follower.profiles.interests.length > 0 && (
                      <div className="col-span-2 md:col-span-1">
                        <div className="flex flex-wrap gap-1">
                          {follower.profiles.interests.slice(0, 2).map((interest) => (
                            <span
                              key={interest}
                              className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              {interest}
                            </span>
                          ))}
                          {follower.profiles.interests.length > 2 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              +{follower.profiles.interests.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove follower"
                    onClick={() => {
                      setFollowerToRemove({
                        relationshipId: follower.id,
                        username: follower.profiles?.username || 'Unknown User'
                      });
                      setRemoveConfirmOpen(true);
                    }}
                  >
                    <UserX className="h-5 w-5" />
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                    title="Report suspicious activity"
                    onClick={() => {
                      setSelectedFollower({
                        id: follower.user_id,
                        username: follower.profiles?.username || 'Unknown User'
                      });
                      setReportModalOpen(true);
                    }}
                  >
                    <Flag className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 text-center text-sm text-gray-600">
        Showing {filteredFollowers.length} of {followers.length} followers
      </div>

      {/* Report Modal */}
      {selectedFollower && (
        <SuspiciousActivityReporter
          isOpen={reportModalOpen}
          onClose={() => {
            setReportModalOpen(false);
            setSelectedFollower(null);
          }}
          followerId={selectedFollower.id}
          followerUsername={selectedFollower.username}
          businessId={businessId!}
        />
      )}

      {/* Remove Follower Confirmation Dialog */}
      {removeConfirmOpen && followerToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => !isRemoving && setRemoveConfirmOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Remove Follower?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to remove <strong>{followerToRemove.username}</strong> from your followers? They will no longer receive updates from your business.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setRemoveConfirmOpen(false);
                    setFollowerToRemove(null);
                  }}
                  disabled={isRemoving}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveFollower}
                  disabled={isRemoving}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isRemoving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Removing...
                    </>
                  ) : (
                    'Remove'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FollowerList;
