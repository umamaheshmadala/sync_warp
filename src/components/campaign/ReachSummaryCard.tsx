/**
 * ReachSummaryCard Component
 * Shows a visual summary of how estimated reach was calculated
 * Temporary component for debugging reach calculations
 */

import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Users, Filter, MapPin, Activity, Calculator } from 'lucide-react';
import type { TargetingRules } from '../../types/campaigns';

export interface ReachSummaryCardProps {
  targetingRules: TargetingRules;
  totalReach: number;
  demographicsCount?: number;
  locationCount?: number;
  behaviorCount?: number;
  className?: string;
}

export function ReachSummaryCard({
  targetingRules,
  totalReach,
  demographicsCount,
  locationCount,
  behaviorCount,
  className = '',
}: ReachSummaryCardProps) {
  // Debug: log what the card receives
  console.log('📋 ReachSummaryCard received:', {
    targetingRules,
    totalReach,
    demographicsCount,
    locationCount,
    behaviorCount
  });

  const formatNumber = (num?: number) => {
    return num !== undefined ? num.toLocaleString() : 'N/A';
  };

  const calculatePercentage = (count?: number, total?: number) => {
    if (count === undefined || total === undefined || total === 0) return 0;
    return (count / total) * 100;
  };

  // Extract active filters from FLAT structure
  const activeFilters = {
    demographics: {
      ageRanges: targetingRules.age_ranges || [],
      gender: targetingRules.gender || [],
      incomeRanges: targetingRules.income_levels || [],
    },
    location: {
      lat: targetingRules.center_lat,
      lng: targetingRules.center_lng,
      radiusKm: targetingRules.radius_km,
    },
    behavior: {
      interests: targetingRules.interests || [],
      minPurchases: targetingRules.min_purchases,
      isDriver: targetingRules.drivers_only,
    },
  };

  const hasFilters = 
    activeFilters.demographics.ageRanges.length > 0 ||
    activeFilters.demographics.gender.length > 0 ||
    activeFilters.demographics.incomeRanges.length > 0 ||
    activeFilters.location.lat !== undefined ||
    activeFilters.behavior.interests.length > 0 ||
    activeFilters.behavior.minPurchases !== undefined ||
    activeFilters.behavior.isDriver === true;

  return (
    <Card className={`border-2 border-amber-200 bg-amber-50/30 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <Calculator className="w-5 h-5" />
          Reach Calculation Summary
        </CardTitle>
        <p className="text-sm text-amber-700">
          {hasFilters ? 'Showing how filters affect your audience size' : 'No filters applied - showing all users'}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filter Pipeline Visualization */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-gray-900">Filter Pipeline</h4>
          
          {/* Step 1: Demographics */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm">Step 1: Demographics</span>
              </div>
              <Badge variant={activeFilters.demographics.ageRanges.length > 0 || activeFilters.demographics.gender.length > 0 ? 'default' : 'secondary'}>
                {activeFilters.demographics.ageRanges.length > 0 || activeFilters.demographics.gender.length > 0 || activeFilters.demographics.incomeRanges.length > 0 ? 'Active' : 'All Users'}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {formatNumber(demographicsCount)}
            </div>
            {demographicsCount && (
              <Progress value={100} className="h-2 mb-2" />
            )}
            <div className="text-xs text-gray-600 space-y-1">
              {activeFilters.demographics.ageRanges.length > 0 && (
                <div>Age: {activeFilters.demographics.ageRanges.join(', ')}</div>
              )}
              {activeFilters.demographics.gender.length > 0 && (
                <div>Gender: {activeFilters.demographics.gender.join(', ')}</div>
              )}
              {activeFilters.demographics.incomeRanges.length > 0 && (
                <div>Income: {activeFilters.demographics.incomeRanges.join(', ')}</div>
              )}
              {!hasFilters && <div>No demographic filters</div>}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="text-gray-400 text-2xl">↓</div>
          </div>

          {/* Step 2: Location */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-sm">Step 2: Location</span>
              </div>
              <Badge variant={activeFilters.location.lat ? 'default' : 'secondary'}>
                {activeFilters.location.lat ? 'Active' : 'All Locations'}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-orange-600 mb-2">
              {formatNumber(locationCount)}
            </div>
            {locationCount && demographicsCount && (
              <Progress value={calculatePercentage(locationCount, demographicsCount)} className="h-2 mb-2" />
            )}
            <div className="text-xs text-gray-600">
              {activeFilters.location.lat ? (
                <div>
                  Lat: {activeFilters.location.lat.toFixed(4)}, Lng: {activeFilters.location.lng?.toFixed(4)} 
                  <br />Radius: {activeFilters.location.radiusKm} km
                </div>
              ) : (
                <div>No location filter</div>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="text-gray-400 text-2xl">↓</div>
          </div>

          {/* Step 3: Behavior */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-sm">Step 3: Behavior</span>
              </div>
              <Badge variant={activeFilters.behavior.interests.length > 0 || activeFilters.behavior.isDriver ? 'default' : 'secondary'}>
                {activeFilters.behavior.interests.length > 0 || activeFilters.behavior.isDriver || activeFilters.behavior.minPurchases ? 'Active' : 'All Behaviors'}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {formatNumber(behaviorCount)}
            </div>
            {behaviorCount && locationCount && (
              <Progress value={calculatePercentage(behaviorCount, locationCount)} className="h-2 mb-2" />
            )}
            <div className="text-xs text-gray-600 space-y-1">
              {activeFilters.behavior.interests.length > 0 && (
                <div>Interests: {activeFilters.behavior.interests.join(', ')}</div>
              )}
              {activeFilters.behavior.minPurchases && (
                <div>Min Purchases: {activeFilters.behavior.minPurchases}</div>
              )}
              {activeFilters.behavior.isDriver && (
                <div>Driver Only: Yes</div>
              )}
              {activeFilters.behavior.interests.length === 0 && !activeFilters.behavior.isDriver && !activeFilters.behavior.minPurchases && (
                <div>No behavior filters</div>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="text-gray-400 text-2xl">↓</div>
          </div>

          {/* Final Result */}
          <div className="bg-green-100 border-2 border-green-600 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-5 h-5 text-green-700" />
              <span className="font-bold text-base text-green-900">Final Estimated Reach</span>
            </div>
            <div className="text-4xl font-bold text-green-700 mb-2">
              {formatNumber(totalReach)}
            </div>
            <div className="text-sm text-green-800">
              Users matching ALL filter criteria
            </div>
          </div>
        </div>

        {/* Formula Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <div className="font-semibold text-blue-900 mb-2">📐 Calculation Formula:</div>
          <div className="font-mono text-xs text-blue-800 space-y-1">
            <div>Start: {formatNumber(demographicsCount)} users (after demographics filter)</div>
            <div>× {locationCount && demographicsCount ? `${calculatePercentage(locationCount, demographicsCount).toFixed(1)}%` : 'N/A'} (location match rate)</div>
            <div>× {behaviorCount && locationCount ? `${calculatePercentage(behaviorCount, locationCount).toFixed(1)}%` : 'N/A'} (behavior match rate)</div>
            <div className="border-t border-blue-300 pt-1 font-bold">= {formatNumber(totalReach)} final reach</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReachSummaryCard;
