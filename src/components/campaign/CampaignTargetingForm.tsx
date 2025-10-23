// src/components/campaign/CampaignTargetingForm.tsx
// Campaign targeting form with follower segment targeting option

import React, { useState } from 'react';
import { Target, Users, Globe, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCampaignTargeting } from '../../hooks/useCampaignTargeting';
import { FollowerSegmentSelector } from './FollowerSegmentSelector';

interface CampaignTargetingFormProps {
  businessId: string;
  onTargetingChange?: (targeting: any) => void;
  className?: string;
}

export const CampaignTargetingForm: React.FC<CampaignTargetingFormProps> = ({
  businessId,
  onTargetingChange,
  className,
}) => {
  const {
    filters,
    reach,
    loading,
    updateFilters,
    resetFilters,
  } = useCampaignTargeting(businessId);

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const handleTargetFollowersToggle = (checked: boolean) => {
    updateFilters({ targetFollowers: checked });
    
    if (onTargetingChange) {
      onTargetingChange({
        ...filters,
        targetFollowers: checked,
      });
    }
  };

  const handleFiltersChange = (newFilters: any) => {
    updateFilters(newFilters);
    
    if (onTargetingChange) {
      onTargetingChange({
        ...filters,
        ...newFilters,
      });
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Target className="h-6 w-6 text-indigo-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Campaign Targeting</h2>
            <p className="text-sm text-gray-600">Define your campaign audience</p>
          </div>
        </div>
      </div>

      {/* Target Followers Toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="mt-0.5">
              <input
                type="checkbox"
                id="target-followers"
                checked={filters.targetFollowers}
                onChange={(e) => handleTargetFollowersToggle(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="target-followers"
                className="flex items-center space-x-2 text-base font-medium text-gray-900 cursor-pointer"
              >
                <Users className="h-5 w-5 text-indigo-600" />
                <span>Target My Followers Only</span>
              </label>
              <p className="mt-1 text-sm text-gray-600">
                Show this campaign only to users who follow your business
              </p>
            </div>
          </div>
        </div>

        {/* Follower Segment Selector */}
        {filters.targetFollowers && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <FollowerSegmentSelector
              businessId={businessId}
              onFiltersChange={handleFiltersChange}
            />
          </div>
        )}
      </div>

      {/* Public Targeting Options */}
      {!filters.targetFollowers && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Globe className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Public Targeting</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Your campaign will be shown to all users on the platform. You can apply filters to narrow your audience.
          </p>

          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Filters
          </button>

          {showAdvancedOptions && (
            <div className="mt-4 space-y-4">
              {/* Age Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age Range
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="13"
                    max="100"
                    placeholder="Min"
                    value={filters.ageRange?.min || ''}
                    onChange={(e) =>
                      updateFilters({
                        ageRange: {
                          min: parseInt(e.target.value) || 13,
                          max: filters.ageRange?.max || 100,
                        },
                      })
                    }
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    min="13"
                    max="100"
                    placeholder="Max"
                    value={filters.ageRange?.max || ''}
                    onChange={(e) =>
                      updateFilters({
                        ageRange: {
                          min: filters.ageRange?.min || 13,
                          max: parseInt(e.target.value) || 100,
                        },
                      })
                    }
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  value={filters.gender || 'all'}
                  onChange={(e) =>
                    updateFilters({ gender: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reach Estimate */}
      {reach && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Estimated Reach</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold text-indigo-600">
                  {reach.totalReach.toLocaleString()}
                </span>
                <span className="text-lg text-gray-600">potential viewers</span>
              </div>

              {filters.targetFollowers && reach.followerReach > 0 && (
                <div className="pt-4 border-t border-indigo-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">
                      {reach.followerReach.toLocaleString()}
                    </span>{' '}
                    of your followers match the selected criteria
                  </p>
                </div>
              )}

              {/* Demographic Breakdown */}
              {Object.keys(reach.breakdown.ageGroups).length > 0 && (
                <div className="pt-4 border-t border-indigo-200">
                  <p className="text-sm font-medium text-gray-900 mb-2">Age Distribution</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(reach.breakdown.ageGroups)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 3)
                      .map(([age, count]) => (
                        <span
                          key={age}
                          className="px-3 py-1 bg-white rounded-full text-xs font-medium text-indigo-700 border border-indigo-200"
                        >
                          {age}: {count}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reset Button */}
      {(filters.targetFollowers || filters.ageRange || filters.gender !== 'all') && (
        <div className="flex justify-end">
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default CampaignTargetingForm;
