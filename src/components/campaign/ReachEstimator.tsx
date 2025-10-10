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

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Eye,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import type { TargetingRules } from '../../types/campaigns';

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
}

interface ReachEstimate {
  totalDrivers: number;
  matchingDrivers: number;
  reachPercentage: number;
  estimatedImpressions: number;
  estimatedCostPerImpression: number;
  breakdown: {
    byAge?: Record<string, number>;
    byLocation?: Record<string, number>;
    byVehicleType?: Record<string, number>;
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

        // TODO: Replace with actual API call
        // const response = await fetch('/api/campaigns/estimate-reach', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ targetingRules, cityId }),
        //   signal: controller.signal,
        // });
        // const data = await response.json();

        // Simulate API call with mock data
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!isMounted) return;

        // Mock estimate calculation
        const mockEstimate = calculateMockEstimate(targetingRules);
        setEstimate(mockEstimate);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (!isMounted) return;
        
        console.error('Error fetching reach estimate:', err);
        setError('Failed to estimate reach. Please try again.');
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
  // MOCK CALCULATION (Replace with actual API)
  // ============================================================================

  const calculateMockEstimate = (rules: TargetingRules): ReachEstimate => {
    let baseDrivers = 10000;
    let reachFactor = 1.0;

    // Apply demographic filters
    if (rules.demographics) {
      if (rules.demographics.minAge || rules.demographics.maxAge) {
        reachFactor *= 0.6;
      }
      if (rules.demographics.gender && rules.demographics.gender !== 'all') {
        reachFactor *= 0.5;
      }
      if (rules.demographics.minTrips) {
        reachFactor *= 0.7;
      }
      if (rules.demographics.minRating) {
        reachFactor *= 0.8;
      }
    }

    // Apply location filters
    if (rules.location) {
      if (rules.location.cities && rules.location.cities.length > 0) {
        reachFactor *= 0.4;
      }
      if (rules.location.radius) {
        reachFactor *= 0.5;
      }
    }

    // Apply behavior filters
    if (rules.behavior) {
      if (rules.behavior.tripTypes && rules.behavior.tripTypes.length > 0) {
        reachFactor *= 0.7;
      }
      if (rules.behavior.minTripsPerWeek) {
        reachFactor *= 0.75;
      }
    }

    // Apply vehicle filters
    if (rules.vehicle) {
      if (rules.vehicle.types && rules.vehicle.types.length > 0) {
        reachFactor *= 0.6;
      }
      if (rules.vehicle.premiumOnly) {
        reachFactor *= 0.3;
      }
    }

    const matchingDrivers = Math.round(baseDrivers * reachFactor);
    const reachPercentage = (reachFactor * 100);
    const estimatedImpressions = matchingDrivers * 15; // Assume 15 impressions per driver per month
    const estimatedCostPerImpression = 0.05; // $0.05 per impression

    // Generate confidence level
    const confidence: 'low' | 'medium' | 'high' = 
      reachPercentage > 50 ? 'high' :
      reachPercentage > 20 ? 'medium' : 'low';

    return {
      totalDrivers: baseDrivers,
      matchingDrivers,
      reachPercentage,
      estimatedImpressions,
      estimatedCostPerImpression,
      breakdown: {
        byAge: {
          '18-24': Math.round(matchingDrivers * 0.2),
          '25-34': Math.round(matchingDrivers * 0.35),
          '35-44': Math.round(matchingDrivers * 0.25),
          '45+': Math.round(matchingDrivers * 0.2),
        },
        byLocation: {
          'Urban': Math.round(matchingDrivers * 0.6),
          'Suburban': Math.round(matchingDrivers * 0.3),
          'Rural': Math.round(matchingDrivers * 0.1),
        },
        byVehicleType: {
          'Sedan': Math.round(matchingDrivers * 0.5),
          'SUV': Math.round(matchingDrivers * 0.3),
          'Luxury': Math.round(matchingDrivers * 0.2),
        },
      },
      confidence,
      lastUpdated: new Date(),
    };
  };

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
              Matching Drivers
            </div>
            <div className="text-3xl font-bold">
              {formatNumber(estimate.matchingDrivers)}
            </div>
            <div className="text-sm text-muted-foreground">
              out of {formatNumber(estimate.totalDrivers)} total
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
              <DollarSign className="w-4 h-4" />
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

            {/* By Vehicle Type */}
            {estimate.breakdown.byVehicleType && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">By Vehicle Type</div>
                <div className="space-y-1">
                  {Object.entries(estimate.breakdown.byVehicleType).map(([vehicle, count]) => (
                    <div key={vehicle} className="flex items-center justify-between text-sm">
                      <span>{vehicle}</span>
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
                    ? 'Your targeting looks balanced. You\'ll reach a good portion of relevant drivers.'
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
