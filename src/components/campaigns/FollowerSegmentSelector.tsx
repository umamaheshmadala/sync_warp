// src/components/campaigns/FollowerSegmentSelector.tsx
// Component for selecting follower segments when creating campaigns

import React, { useState, useEffect } from 'react';
import { Users, Filter, TrendingUp, MapPin, Calendar, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface FollowerSegmentSelectorProps {
  businessId: string;
  onSegmentChange: (config: FollowerSegmentConfig) => void;
  className?: string;
}

export interface FollowerSegmentConfig {
  targetFollowersOnly: boolean;
  filters: {
    ageMin?: number;
    ageMax?: number;
    gender?: string;
    city?: string;
    interests?: string[];
  };
  estimatedReach: number;
}

interface FollowerStats {
  total: number;
  byAge: Record<string, number>;
  byGender: Record<string, number>;
  topCities: Array<{ city: string; count: number }>;
  topInterests: string[];
}

export const FollowerSegmentSelector: React.FC<FollowerSegmentSelectorProps> = ({
  businessId,
  onSegmentChange,
  className,
}) => {
  const [targetFollowersOnly, setTargetFollowersOnly] = useState(false);
  const [filters, setFilters] = useState<FollowerSegmentConfig['filters']>({});
  const [stats, setStats] = useState<FollowerStats | null>(null);
  const [estimatedReach, setEstimatedReach] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load follower statistics
  useEffect(() => {
    if (!businessId) return;

    const loadStats = async () => {
      setLoading(true);
      try {
        // Get all followers with profiles
        const { data: followers, error } = await supabase
          .from('business_followers')
          .select(`
            id,
            user_id,
            profiles (
              date_of_birth,
              city,
              interests
            )
          `)
          .eq('business_id', businessId)
          .eq('is_active', true);

        if (error) throw error;

        if (!followers || followers.length === 0) {
          setStats({
            total: 0,
            byAge: {},
            byGender: {},
            topCities: [],
            topInterests: [],
          });
          return;
        }

        // Calculate statistics
        const byAge: Record<string, number> = {};
        const byGender: Record<string, number> = {};
        const cityCount: Record<string, number> = {};
        const interestCount: Record<string, number> = {};

        followers.forEach((f: any) => {
          const profile = f.profiles;
          if (profile) {
            // Calculate age from date_of_birth
            if (profile.date_of_birth) {
              const birthDate = new Date(profile.date_of_birth);
              const today = new Date();
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }

              const ageGroup = age < 25 ? '18-24' :
                              age < 35 ? '25-34' :
                              age < 45 ? '35-44' : '45+';
              byAge[ageGroup] = (byAge[ageGroup] || 0) + 1;
            }

            // City
            if (profile.city) {
              cityCount[profile.city] = (cityCount[profile.city] || 0) + 1;
            }

            // Interests
            if (Array.isArray(profile.interests)) {
              profile.interests.forEach((interest: string) => {
                interestCount[interest] = (interestCount[interest] || 0) + 1;
              });
            }
          }
        });

        const topCities = Object.entries(cityCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([city, count]) => ({ city, count }));

        const topInterests = Object.entries(interestCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([interest]) => interest);

        setStats({
          total: followers.length,
          byAge,
          byGender: { 'Not specified': followers.length },
          topCities,
          topInterests,
        });

        setEstimatedReach(followers.length);
      } catch (err) {
        console.error('Error loading follower stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [businessId]);

  // Calculate estimated reach when filters change
  useEffect(() => {
    if (!stats || !targetFollowersOnly) {
      setEstimatedReach(0);
      onSegmentChange({
        targetFollowersOnly: false,
        filters: {},
        estimatedReach: 0,
      });
      return;
    }

    // Simple estimation based on filters
    let reach = stats.total;

    // Age filter
    if (filters.ageMin || filters.ageMax) {
      const ageGroups = Object.keys(stats.byAge);
      const filteredGroups = ageGroups.filter(group => {
        const [min, max] = group.split('-').map(n => n === '+' ? 100 : parseInt(n));
        const matchesMin = !filters.ageMin || max >= filters.ageMin;
        const matchesMax = !filters.ageMax || min <= filters.ageMax;
        return matchesMin && matchesMax;
      });
      
      reach = filteredGroups.reduce((sum, group) => sum + (stats.byAge[group] || 0), 0);
    }

    // City filter (rough estimate - assume 30% match if city specified)
    if (filters.city) {
      const cityMatch = stats.topCities.find(c => c.city.toLowerCase().includes(filters.city!.toLowerCase()));
      reach = cityMatch ? cityMatch.count : Math.floor(reach * 0.3);
    }

    setEstimatedReach(reach);
    onSegmentChange({
      targetFollowersOnly,
      filters,
      estimatedReach: reach,
    });
  }, [targetFollowersOnly, filters, stats, onSegmentChange]);

  const handleToggleFollowers = (checked: boolean) => {
    setTargetFollowersOnly(checked);
    if (!checked) {
      setFilters({});
    }
  };

  const handleFilterChange = (key: keyof FollowerSegmentConfig['filters'], value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-sm text-gray-600 mt-2">Loading follower data...</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Toggle for follower-only targeting */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Users className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={targetFollowersOnly}
                onChange={(e) => handleToggleFollowers(e.target.checked)}
                className="h-5 w-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 mr-3"
              />
              <div>
                <span className="text-lg font-semibold text-gray-900">Target My Followers</span>
                <p className="text-sm text-gray-600 mt-1">
                  Send this campaign only to users who follow your business
                </p>
              </div>
            </label>
            
            {stats && (
              <div className="mt-3 flex items-center space-x-2 text-sm text-indigo-600">
                <Users className="h-4 w-4" />
                <span className="font-medium">{stats.total} total followers</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter options (only show if targeting followers) */}
      {targetFollowersOnly && stats && stats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Narrow Your Audience (Optional)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Age Range Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Calendar className="h-4 w-4 inline mr-2" />
                Age Range
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  placeholder="Min"
                  min="18"
                  max="100"
                  value={filters.ageMin || ''}
                  onChange={(e) => handleFilterChange('ageMin', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  min="18"
                  max="100"
                  value={filters.ageMax || ''}
                  onChange={(e) => handleFilterChange('ageMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              {stats.byAge && Object.keys(stats.byAge).length > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  Distribution: {Object.entries(stats.byAge).map(([range, count]) => `${range}: ${count}`).join(', ')}
                </div>
              )}
            </div>

            {/* City Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <MapPin className="h-4 w-4 inline mr-2" />
                City
              </label>
              <input
                type="text"
                placeholder="Enter city name"
                value={filters.city || ''}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {stats.topCities.length > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  Top: {stats.topCities.slice(0, 3).map(c => `${c.city} (${c.count})`).join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Estimated Reach */}
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <span className="font-medium text-gray-900">Estimated Reach</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-600">{estimatedReach}</div>
                <div className="text-xs text-gray-600">
                  {stats.total > 0 ? Math.round((estimatedReach / stats.total) * 100) : 0}% of followers
                </div>
              </div>
            </div>
            
            {estimatedReach === 0 && (
              <div className="mt-3 flex items-start space-x-2 text-sm text-amber-700 bg-amber-50 rounded p-2">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>No followers match your filters. Try adjusting the criteria.</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* No followers message */}
      {targetFollowersOnly && stats && stats.total === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <Users className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">No Followers Yet</h3>
          <p className="text-sm text-gray-600">
            You don't have any followers yet. Build your audience first before targeting followers in campaigns.
          </p>
        </div>
      )}
    </div>
  );
};

export default FollowerSegmentSelector;
