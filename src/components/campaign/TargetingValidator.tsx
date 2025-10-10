/**
 * TargetingValidator Component
 * Phase 4: Targeting Configuration UI
 * 
 * Validates targeting rules and provides feedback
 * Features:
 * - Real-time validation
 * - Error/warning/info messages
 * - Rule conflict detection
 * - Best practice suggestions
 * - Fix suggestions
 */

import React, { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2,
  XCircle,
  Lightbulb
} from 'lucide-react';
import type { TargetingRules } from '../../types/campaigns';

// ============================================================================
// TYPES
// ============================================================================

export interface TargetingValidatorProps {
  /** Targeting rules to validate */
  targetingRules: TargetingRules;
  /** Callback when user wants to fix an issue */
  onFix?: (fix: ValidationFix) => void;
  /** Show only errors */
  errorsOnly?: boolean;
  /** Custom class name */
  className?: string;
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  category: 'demographics' | 'location' | 'behavior' | 'vehicle' | 'general';
  title: string;
  message: string;
  fix?: ValidationFix;
}

export interface ValidationFix {
  id: string;
  label: string;
  action: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TargetingValidator({
  targetingRules,
  onFix,
  errorsOnly = false,
  className = '',
}: TargetingValidatorProps) {
  
  // Validate targeting rules
  const issues = useMemo(() => {
    return validateTargetingRules(targetingRules);
  }, [targetingRules]);

  // Filter issues based on errorsOnly prop
  const displayedIssues = useMemo(() => {
    if (errorsOnly) {
      return issues.filter(issue => issue.severity === 'error');
    }
    return issues;
  }, [issues, errorsOnly]);

  // Count issues by severity
  const issueCounts = useMemo(() => {
    return {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
      success: issues.filter(i => i.severity === 'success').length,
    };
  }, [issues]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <XCircle className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'info': return <Info className="h-5 w-5" />;
      case 'success': return <CheckCircle2 className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getVariant = (severity: string) => {
    switch (severity) {
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'default';
      case 'success': return 'default';
      default: return 'default';
    }
  };

  const getClassName = (severity: string) => {
    switch (severity) {
      case 'error': return 'border-red-500 bg-red-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      case 'info': return 'border-blue-500 bg-blue-50';
      case 'success': return 'border-green-500 bg-green-50';
      default: return '';
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'demographics': return 'bg-purple-100 text-purple-800';
      case 'location': return 'bg-blue-100 text-blue-800';
      case 'behavior': return 'bg-green-100 text-green-800';
      case 'vehicle': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (displayedIssues.length === 0) {
    return (
      <Alert className={`${className} border-green-500 bg-green-50`}>
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-green-900">All Good!</AlertTitle>
        <AlertDescription className="text-green-700">
          Your targeting configuration looks great. No issues found.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      {!errorsOnly && (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Validation Summary:</span>
          {issueCounts.errors > 0 && (
            <Badge variant="destructive">
              {issueCounts.errors} {issueCounts.errors === 1 ? 'Error' : 'Errors'}
            </Badge>
          )}
          {issueCounts.warnings > 0 && (
            <Badge className="bg-yellow-500 hover:bg-yellow-600">
              {issueCounts.warnings} {issueCounts.warnings === 1 ? 'Warning' : 'Warnings'}
            </Badge>
          )}
          {issueCounts.info > 0 && (
            <Badge className="bg-blue-500 hover:bg-blue-600">
              {issueCounts.info} {issueCounts.info === 1 ? 'Tip' : 'Tips'}
            </Badge>
          )}
        </div>
      )}

      {/* Issues List */}
      {displayedIssues.map((issue) => (
        <Alert
          key={issue.id}
          variant={getVariant(issue.severity)}
          className={getClassName(issue.severity)}
        >
          <div className="flex items-start gap-3">
            {getIcon(issue.severity)}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTitle className="mb-0">{issue.title}</AlertTitle>
                <Badge 
                  variant="outline" 
                  className={getCategoryBadgeColor(issue.category)}
                >
                  {issue.category}
                </Badge>
              </div>
              <AlertDescription>{issue.message}</AlertDescription>
              
              {issue.fix && onFix && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onFix(issue.fix!)}
                  className="mt-2"
                >
                  <Lightbulb className="w-3 h-3 mr-1" />
                  {issue.fix.label}
                </Button>
              )}
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

function validateTargetingRules(rules: TargetingRules): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check if any targeting is set
  const hasAnyTargeting = 
    hasAnyDemographics(rules.demographics) ||
    hasAnyLocation(rules.location) ||
    hasAnyBehavior(rules.behavior) ||
    hasAnyVehicle(rules.vehicle);

  if (!hasAnyTargeting) {
    issues.push({
      id: 'no-targeting',
      severity: 'warning',
      category: 'general',
      title: 'No Targeting Set',
      message: 'Campaign will target all drivers. Consider adding targeting criteria to reach specific audiences and improve ROI.',
    });
  }

  // Demographics validation
  if (rules.demographics) {
    // Age range validation
    if (rules.demographics.minAge && rules.demographics.maxAge) {
      if (rules.demographics.minAge > rules.demographics.maxAge) {
        issues.push({
          id: 'invalid-age-range',
          severity: 'error',
          category: 'demographics',
          title: 'Invalid Age Range',
          message: `Minimum age (${rules.demographics.minAge}) cannot be greater than maximum age (${rules.demographics.maxAge}).`,
        });
      } else if (rules.demographics.maxAge - rules.demographics.minAge < 5) {
        issues.push({
          id: 'narrow-age-range',
          severity: 'warning',
          category: 'demographics',
          title: 'Narrow Age Range',
          message: 'Your age range is very narrow. This may significantly limit your reach.',
        });
      }
    }

    // Rating validation
    if (rules.demographics.minRating) {
      if (rules.demographics.minRating > 4.8) {
        issues.push({
          id: 'high-rating-threshold',
          severity: 'warning',
          category: 'demographics',
          title: 'Very High Rating Requirement',
          message: 'Setting minimum rating above 4.8 will limit reach to only top-rated drivers.',
        });
      }
    }

    // Experience validation
    if (rules.demographics.minTrips && rules.demographics.minTrips > 1000) {
      issues.push({
        id: 'high-experience-requirement',
        severity: 'info',
        category: 'demographics',
        title: 'High Experience Requirement',
        message: 'Requiring 1000+ trips targets only experienced drivers. Great for premium campaigns!',
      });
    }
  }

  // Location validation
  if (rules.location) {
    if (rules.location.cities && rules.location.cities.length > 10) {
      issues.push({
        id: 'too-many-cities',
        severity: 'info',
        category: 'location',
        title: 'Many Cities Selected',
        message: 'You have selected many cities. Consider using regions for easier management.',
      });
    }

    if (rules.location.radius && rules.location.radius > 50) {
      issues.push({
        id: 'large-radius',
        severity: 'warning',
        category: 'location',
        title: 'Large Geographic Radius',
        message: 'Radius over 50km may be too broad. Consider targeting specific cities or smaller areas.',
      });
    }

    // Check for conflicting location criteria
    if (rules.location.cities?.length && rules.location.radius) {
      issues.push({
        id: 'conflicting-location',
        severity: 'warning',
        category: 'location',
        title: 'Conflicting Location Criteria',
        message: 'Both cities and radius are set. Make sure they don\'t overlap or conflict.',
      });
    }
  }

  // Behavior validation
  if (rules.behavior) {
    if (rules.behavior.minTripsPerWeek && rules.behavior.minTripsPerWeek > 40) {
      issues.push({
        id: 'very-active-requirement',
        severity: 'warning',
        category: 'behavior',
        title: 'Very High Activity Requirement',
        message: 'Requiring 40+ trips per week targets only the most active drivers (less than 5% of drivers).',
      });
    }

    if (rules.behavior.tripTypes && rules.behavior.tripTypes.length === 1) {
      issues.push({
        id: 'single-trip-type',
        severity: 'info',
        category: 'behavior',
        title: 'Single Trip Type',
        message: 'You\'re targeting only one trip type. Consider adding more types to increase reach.',
      });
    }
  }

  // Vehicle validation
  if (rules.vehicle) {
    if (rules.vehicle.premiumOnly) {
      issues.push({
        id: 'premium-only',
        severity: 'info',
        category: 'vehicle',
        title: 'Premium Vehicles Only',
        message: 'Premium-only targeting reduces reach to ~10-15% of drivers. Ensure your budget reflects this niche audience.',
      });
    }

    if (rules.vehicle.minYear && rules.vehicle.minYear > new Date().getFullYear() - 3) {
      issues.push({
        id: 'very-new-vehicles',
        severity: 'warning',
        category: 'vehicle',
        title: 'Very New Vehicles Required',
        message: 'Requiring vehicles from the last 3 years significantly limits reach. Consider expanding to 5+ years.',
      });
    }
  }

  // Check for overly restrictive targeting
  const restrictionCount = [
    rules.demographics?.minAge !== undefined,
    rules.demographics?.minRating !== undefined,
    rules.demographics?.minTrips !== undefined,
    rules.location?.cities && rules.location.cities.length > 0,
    rules.location?.radius !== undefined,
    rules.behavior?.minTripsPerWeek !== undefined,
    rules.vehicle?.types && rules.vehicle.types.length > 0,
    rules.vehicle?.premiumOnly === true,
  ].filter(Boolean).length;

  if (restrictionCount >= 5) {
    issues.push({
      id: 'overly-restrictive',
      severity: 'warning',
      category: 'general',
      title: 'Very Restrictive Targeting',
      message: 'You have many targeting criteria set. This may result in very low reach. Consider relaxing some constraints.',
    });
  }

  // Provide success message if well-balanced
  if (hasAnyTargeting && restrictionCount >= 2 && restrictionCount <= 4 && issues.filter(i => i.severity === 'error').length === 0) {
    issues.push({
      id: 'well-balanced',
      severity: 'success',
      category: 'general',
      title: 'Well-Balanced Targeting',
      message: 'Your targeting looks balanced with a good mix of criteria. This should provide good reach while maintaining relevance.',
    });
  }

  return issues;
}

// Helper functions
function hasAnyDemographics(demo?: any): boolean {
  return demo && Object.keys(demo).length > 0;
}

function hasAnyLocation(loc?: any): boolean {
  return loc && Object.keys(loc).length > 0;
}

function hasAnyBehavior(behavior?: any): boolean {
  return behavior && Object.keys(behavior).length > 0;
}

function hasAnyVehicle(vehicle?: any): boolean {
  return vehicle && Object.keys(vehicle).length > 0;
}

export default TargetingValidator;
