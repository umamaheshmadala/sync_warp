/**
 * ReachEstimator Component
 * Phase 4: Targeting Configuration UI
 * 
 * Real-time audience size estimation based on targeting criteria
 * Features:
 * - Live updates as targeting changes
 * - Visual reach indicator
 * - Demographic breakdown
 * - Estimated impressions
 * - Cost projections
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import {
  Users,
  TrendingUp,
  IndianRupee,
  Eye,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import type { TargetingRules } from '../../types/campaigns';
import { targetingService } from '../../services/targetingService';

// ============================================================================
// TYPES
// ============================================================================

export interface ReachEstimatorProps {
  /** Targeting rules to estimate reach for */
  targetingRules: TargetingRules;
  /** Campaign budget for cost estimation */
  budget?: number;
  /** City ID for location-based estimates */
  cityId?: string;
  /** Update interval in milliseconds */
  updateInterval?: number;
  /** Custom class name */
  className?: string;
  /** Use mock data instead of real API */
  useMockData?: boolean;
  /** Callback when reach data updates */
  onReachUpdate?: (data: { total: number; demographics: number; location: number; behavior: number }) => void;
}

interface ReachEstimate {
  totalUsers: number;
  matchingUsers: number;
  reachPercentage: number;
  estimatedImpressions: number;
  estimatedCostPerImpression: number;
  breakdown: {
    byAge?: Record<string, number>;
    byLocation?: Record<string, number>;
  };
  confidence: 'low' | 'medium' | 'high';
  lastUpdated: Date;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReachEstimator({
  targetingRules,
  budget,
  cityId,
  updateInterval = 2000,
  className = '',
  useMockData = false,
  onReachUpdate,
}: ReachEstimatorProps) {
  const [estimate, setEstimate] = useState<ReachEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reach estimate
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchEstimate = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let audienceEstimate;
        if (useMockData) {
          // Use mock service for demo
          const { mockTargetingService } = await import('../../services/mockTargetingService');
          audienceEstimate = await mockTargetingService.estimateAudienceReach({
            targeting_rules: targetingRules,
            city_id: cityId
          });
        } else {
          // Call real targeting service
          audienceEstimate = await targetingService.estimateAudienceReach({
            targeting_rules: targetingRules,
            city_id: cityId
          });
        }

        if (!isMounted) return;

        // Convert to ReachEstimate format
        const totalReach = audienceEstimate.total_reach || 0;
        const usersCount = audienceEstimate.drivers_count || totalReach;

        const reachEstimate: ReachEstimate = {
          totalUsers: usersCount,
          matchingUsers: totalReach,
          reachPercentage: usersCount > 0
            ? (totalReach / usersCount) * 100
            : 100,
          estimatedImpressions: totalReach * 15, // 15 impressions per user per month
          estimatedCostPerImpression: 2, // ₹2 per impression
          breakdown: {
            byAge: audienceEstimate.breakdown_by_age,
            byLocation: audienceEstimate.breakdown_by_city,
          },
          confidence: audienceEstimate.confidence_level,
          lastUpdated: new Date(),
        };

        setEstimate(reachEstimate);

        // Notify parent component of reach data
        if (onReachUpdate && audienceEstimate) {
          onReachUpdate({
            total: audienceEstimate.total_reach || 0,
            demographics: audienceEstimate.demographics_count || 0,
            location: audienceEstimate.location_count || 0,
            behavior: audienceEstimate.behavior_count || 0
          });
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (!isMounted) return;

        console.error('Error fetching reach estimate:', err);
        setError(err.message || 'Failed to estimate reach. Please try again.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchEstimate();

    // Set up periodic updates
    const intervalId = setInterval(fetchEstimate, updateInterval);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(intervalId);
    };
  }, [targetingRules, cityId, updateInterval]);


  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <CheckCircle className="w-4 h-4" />;
      case 'medium': return <AlertCircle className="w-4 h-4" />;
      case 'low': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading && !estimate) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Estimating Reach...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!estimate) return null;

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const totalCost = budget || (estimate.estimatedImpressions * estimate.estimatedCostPerImpression);
  const actualCostPerImpression = budget
    ? budget / estimate.estimatedImpressions
    : estimate.estimatedCostPerImpression;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Estimated Reach</CardTitle>
            <CardDescription>
              Updated {estimate.lastUpdated.toLocaleTimeString()}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={getConfidenceColor(estimate.confidence)}
          >
            {getConfidenceIcon(estimate.confidence)}
            <span className="ml-1">{estimate.confidence} confidence</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Primary Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              Matching Users
            </div>
            <div className="text-3xl font-bold">
              {formatNumber(estimate.matchingUsers)}
            </div>
            <div className="text-sm text-muted-foreground">
              out of {formatNumber(estimate.totalUsers)} total
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              Reach Percentage
            </div>
            <div className="text-3xl font-bold">
              {estimate.reachPercentage.toFixed(1)}%
            </div>
            <Progress
              value={estimate.reachPercentage}
              className="h-2"
            />
          </div>
        </div>

        {/* Impression Estimates */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              Est. Monthly Impressions
            </div>
            <div className="text-2xl font-semibold">
              {formatNumber(estimate.estimatedImpressions)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IndianRupee className="w-4 h-4" />
              Est. Total Cost
            </div>
            <div className="text-2xl font-semibold">
              {formatCurrency(totalCost)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(actualCostPerImpression)} per impression
            </div>
          </div>
        </div>

        {/* Demographic Breakdown */}
        {estimate.breakdown && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-sm">Audience Breakdown</h4>

            {/* By Age */}
            {estimate.breakdown.byAge && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">By Age Group</div>
                <div className="space-y-1">
                  {Object.entries(estimate.breakdown.byAge).map(([age, count]) => (
                    <div key={age} className="flex items-center justify-between text-sm">
                      <span>{age}</span>
                      <span className="font-medium">{formatNumber(count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By Location */}
            {estimate.breakdown.byLocation && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">By Location Type</div>
                <div className="space-y-1">
                  {Object.entries(estimate.breakdown.byLocation).map(([location, count]) => (
                    <div key={location} className="flex items-center justify-between text-sm">
                      <span>{location}</span>
                      <span className="font-medium">{formatNumber(count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Insights */}
        <div className="pt-4 border-t">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium text-blue-900">Reach Insights</div>
                <div className="text-blue-700">
                  {estimate.reachPercentage > 50
                    ? 'Your targeting is broad. Consider narrowing criteria to reach more specific audiences.'
                    : estimate.reachPercentage > 20
                      ? 'Your targeting looks balanced. You\'ll reach a good portion of relevant users.'
                      : 'Your targeting is very specific. You may want to broaden criteria to increase reach.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReachEstimator;
