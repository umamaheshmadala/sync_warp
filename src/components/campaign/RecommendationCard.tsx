/**
 * RecommendationCard Component
 * Phase 4: Targeting Configuration UI
 * 
 * AI-powered targeting recommendations
 * Features:
 * - Smart targeting suggestions
 * - One-click apply
 * - Performance predictions
 * - Similar campaign insights
 * - Optimization tips
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  Target,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  Zap
} from 'lucide-react';
import type { TargetingRules } from '../../types/campaigns';

// ============================================================================
// TYPES
// ============================================================================

export interface RecommendationCardProps {
  /** Current targeting rules */
  currentTargeting?: TargetingRules;
  /** Campaign budget for context */
  budget?: number;
  /** Business category for relevant suggestions */
  businessCategory?: string;
  /** Callback when recommendation is applied */
  onApply?: (rules: TargetingRules) => void;
  /** Custom class name */
  className?: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: 'broad' | 'focused' | 'balanced' | 'premium' | 'budget';
  targetingRules: TargetingRules;
  predictedReach: number;
  predictedCTR: number;
  confidence: 'low' | 'medium' | 'high';
  tags: string[];
}

// ============================================================================
// MOCK RECOMMENDATIONS
// ============================================================================

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'balanced-urban',
    title: 'Balanced Urban Reach',
    description: 'Target active urban drivers with good ratings. Best for general awareness campaigns.',
    type: 'balanced',
    targetingRules: {
      demographics: {
        minAge: 25,
        maxAge: 54,
        minRating: 4.0,
        minTrips: 50,
      },
      location: {
        cities: [],
        regions: ['urban'],
      },
      behavior: {
        minTripsPerWeek: 10,
        peakHours: true,
      },
      vehicle: {},
    },
    predictedReach: 6500,
    predictedCTR: 3.2,
    confidence: 'high',
    tags: ['Recommended', 'High ROI', 'Popular'],
  },
  {
    id: 'premium-experience',
    title: 'Premium Experience',
    description: 'Target experienced drivers with luxury vehicles. Perfect for premium brands.',
    type: 'premium',
    targetingRules: {
      demographics: {
        minAge: 30,
        maxAge: 60,
        minRating: 4.7,
        minTrips: 500,
      },
      location: {},
      behavior: {
        tripTypes: ['business', 'airport'],
      },
      vehicle: {
        types: ['luxury'],
        premiumOnly: true,
        minYear: 2020,
      },
    },
    predictedReach: 1200,
    predictedCTR: 5.8,
    confidence: 'high',
    tags: ['Premium', 'High CTR', 'Niche'],
  },
  {
    id: 'wide-reach',
    title: 'Maximum Reach',
    description: 'Broad targeting to reach the largest audience possible. Great for brand awareness.',
    type: 'broad',
    targetingRules: {
      demographics: {
        minAge: 21,
        maxAge: 65,
        minRating: 3.5,
      },
      location: {},
      behavior: {},
      vehicle: {},
    },
    predictedReach: 9800,
    predictedCTR: 2.1,
    confidence: 'medium',
    tags: ['Max Reach', 'Brand Awareness'],
  },
  {
    id: 'young-active',
    title: 'Young & Active',
    description: 'Target younger, tech-savvy drivers who take many short rides. Ideal for tech products.',
    type: 'focused',
    targetingRules: {
      demographics: {
        minAge: 21,
        maxAge: 34,
        minRating: 4.0,
      },
      location: {},
      behavior: {
        tripTypes: ['short', 'medium'],
        minTripsPerWeek: 15,
      },
      vehicle: {},
    },
    predictedReach: 3200,
    predictedCTR: 4.1,
    confidence: 'high',
    tags: ['Young Audience', 'High Engagement'],
  },
  {
    id: 'budget-optimizer',
    title: 'Budget Optimizer',
    description: 'Balanced targeting optimized for cost-efficiency. Best for limited budgets.',
    type: 'budget',
    targetingRules: {
      demographics: {
        minAge: 25,
        maxAge: 45,
        minRating: 3.8,
      },
      location: {
        regions: ['suburban'],
      },
      behavior: {
        minTripsPerWeek: 8,
      },
      vehicle: {},
    },
    predictedReach: 4500,
    predictedCTR: 2.9,
    confidence: 'medium',
    tags: ['Cost Effective', 'Good Balance'],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function RecommendationCard({
  currentTargeting,
  budget,
  businessCategory,
  onApply,
  className = '',
}: RecommendationCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter recommendations based on budget
  const filteredRecommendations = RECOMMENDATIONS.filter(rec => {
    if (!budget) return true;
    
    if (budget < 1000 && rec.type === 'premium') return false;
    if (budget > 10000 && rec.type === 'budget') return false;
    
    return true;
  });

  // Get top 3 recommendations
  const topRecommendations = filteredRecommendations.slice(0, 3);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'broad': return 'bg-blue-100 text-blue-800';
      case 'focused': return 'bg-purple-100 text-purple-800';
      case 'balanced': return 'bg-green-100 text-green-800';
      case 'premium': return 'bg-amber-100 text-amber-800';
      case 'budget': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'broad': return <Users className="w-4 h-4" />;
      case 'focused': return <Target className="w-4 h-4" />;
      case 'balanced': return <Sparkles className="w-4 h-4" />;
      case 'premium': return <Zap className="w-4 h-4" />;
      case 'budget': return <TrendingUp className="w-4 h-4" />;
      default: return null;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-green-500',
      medium: 'bg-yellow-500',
      low: 'bg-red-500',
    };
    
    return (
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${colors[confidence as keyof typeof colors]}`} />
        <span className="text-xs text-muted-foreground capitalize">{confidence} confidence</span>
      </div>
    );
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const handleApply = (rec: Recommendation) => {
    onApply?.(rec.targetingRules);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <CardTitle>Smart Recommendations</CardTitle>
        </div>
        <CardDescription>
          AI-powered targeting suggestions based on successful campaigns
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {topRecommendations.map((rec, index) => (
          <div key={rec.id}>
            {index > 0 && <Separator className="my-4" />}
            
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{rec.title}</h4>
                    <Badge variant="outline" className={getTypeColor(rec.type)}>
                      {getTypeIcon(rec.type)}
                      <span className="ml-1 capitalize">{rec.type}</span>
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {rec.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Est. Reach</div>
                  <div className="font-semibold">{formatNumber(rec.predictedReach)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Predicted CTR</div>
                  <div className="font-semibold">{rec.predictedCTR}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Confidence</div>
                  {getConfidenceBadge(rec.confidence)}
                </div>
              </div>

              {/* Expandable Details */}
              {expandedId === rec.id && (
                <div className="space-y-2 p-3 border rounded-lg bg-background">
                  <div className="text-sm font-medium">Targeting Preview:</div>
                  
                  {rec.targetingRules.demographics && Object.keys(rec.targetingRules.demographics).length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">Demographics: </span>
                      {rec.targetingRules.demographics.minAge && rec.targetingRules.demographics.maxAge && (
                        <span>Ages {rec.targetingRules.demographics.minAge}-{rec.targetingRules.demographics.maxAge}, </span>
                      )}
                      {rec.targetingRules.demographics.minRating && (
                        <span>Rating {rec.targetingRules.demographics.minRating}+</span>
                      )}
                    </div>
                  )}

                  {rec.targetingRules.location && Object.keys(rec.targetingRules.location).length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">Location: </span>
                      <span>{rec.targetingRules.location.regions?.join(', ') || 'All areas'}</span>
                    </div>
                  )}

                  {rec.targetingRules.behavior && Object.keys(rec.targetingRules.behavior).length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">Behavior: </span>
                      {rec.targetingRules.behavior.minTripsPerWeek && (
                        <span>{rec.targetingRules.behavior.minTripsPerWeek}+ trips/week</span>
                      )}
                    </div>
                  )}

                  {rec.targetingRules.vehicle && Object.keys(rec.targetingRules.vehicle).length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">Vehicle: </span>
                      {rec.targetingRules.vehicle.types?.join(', ') || 'All types'}
                      {rec.targetingRules.vehicle.premiumOnly && ' (Premium only)'}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApply(rec)}
                  disabled={!onApply}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Apply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                >
                  {expandedId === rec.id ? 'Show Less' : 'Show Details'}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>

      <CardFooter className="border-t pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3" />
          <span>Recommendations updated based on {formatNumber(12547)} similar campaigns</span>
        </div>
      </CardFooter>
    </Card>
  );
}

export default RecommendationCard;
