/**
 * TargetingEditor Component
 * Phase 4: Targeting Configuration UI
 * 
 * Comprehensive targeting rules editor with:
 * - Demographics (age, gender, rating)
 * - Location (city, regions, radius)
 * - Behavior (activity level, interests, driver status)
 * - Real-time validation
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  MapPin, 
  Users, 
  Activity, 
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles
} from 'lucide-react';
import type { TargetingRules } from '../../types/campaigns';

// ============================================================================
// TYPES
// ============================================================================

export interface TargetingEditorProps {
  /** Initial targeting rules */
  value?: TargetingRules;
  /** Callback when targeting rules change */
  onChange?: (rules: TargetingRules) => void;
  /** Campaign ID for context */
  campaignId?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Show validation errors */
  showValidation?: boolean;
  /** Custom class name */
  className?: string;
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AGE_RANGES = [
  { label: '18-24', value: '18-24' },
  { label: '25-34', value: '25-34' },
  { label: '35-44', value: '35-44' },
  { label: '45-54', value: '45-54' },
  { label: '55+', value: '55+' },
];

const GENDERS = [
  { label: 'All', value: 'all' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const INTEREST_CATEGORIES = [
  { label: 'Food & Dining', value: 'food' },
  { label: 'Shopping', value: 'shopping' },
  { label: 'Entertainment', value: 'entertainment' },
  { label: 'Health & Wellness', value: 'health' },
  { label: 'Travel & Hotels', value: 'travel' },
  { label: 'Education', value: 'education' },
  { label: 'Services', value: 'services' },
  { label: 'Sports & Fitness', value: 'sports' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function TargetingEditor({
  value,
  onChange,
  campaignId,
  readOnly = false,
  showValidation = true,
  className = '',
}: TargetingEditorProps) {
  const [rules, setRules] = useState<TargetingRules>(value || {});
  
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [activeTab, setActiveTab] = useState('demographics');

  // Validate rules whenever they change
  useEffect(() => {
    if (showValidation) {
      validateRules();
    }
  }, [rules, showValidation]);

  // Notify parent of changes (omit onChange from deps to prevent infinite loop)
  useEffect(() => {
    onChange?.(rules);
  }, [rules]);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateRules = () => {
    const errors: ValidationError[] = [];

    // Check if any targeting is set
    const hasAnyTargeting = 
      (rules.age_ranges && rules.age_ranges.length > 0) ||
      (rules.gender && rules.gender.length > 0) ||
      (rules.income_levels && rules.income_levels.length > 0) ||
      (rules.cities && rules.cities.length > 0) ||
      (rules.interests && rules.interests.length > 0) ||
      rules.min_activity_score !== undefined ||
      rules.drivers_only === true;

    if (!hasAnyTargeting) {
      errors.push({
        field: 'general',
        message: 'No targeting rules set. Campaign will target all users.',
        severity: 'warning',
      });
    }

    // Check location specificity
    if (rules.cities && rules.cities.length > 10) {
      errors.push({
        field: 'location',
        message: 'Too many cities selected. Consider using regions instead.',
        severity: 'info',
      });
    }

    setValidationErrors(errors);
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const updateRule = (key: string, value: any) => {
    setRules(prev => ({
      ...prev,
      [key]: value,
    }));
  };


  const toggleArrayValue = (field: keyof TargetingRules, value: string) => {
    setRules(prev => {
      const currentArray = (prev[field] as string[]) || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(v => v !== value)
        : [...currentArray, value];
      
      return {
        ...prev,
        [field]: newArray,
      };
    });
  };

  const clearRules = () => {
    setRules({});
  };

  // Helper to extract min/max age from age_ranges array
  const getAgeFromRanges = (): { min: number; max: number } => {
    if (!rules.age_ranges || rules.age_ranges.length === 0) {
      return { min: 18, max: 65 };
    }
    // Parse first range like '25-45'
    const range = rules.age_ranges[0];
    const [min, max] = range.split('-').map(n => parseInt(n.trim()));
    return { min: min || 18, max: max || 65 };
  };

  const [localMinAge, setLocalMinAge] = useState<string>('');
  const [localMaxAge, setLocalMaxAge] = useState<string>('');

  // Update local state when rules change
  useEffect(() => {
    const { min, max } = getAgeFromRanges();
    setLocalMinAge(min.toString());
    setLocalMaxAge(max.toString());
  }, [rules.age_ranges]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderValidationAlerts = () => {
    if (!showValidation || validationErrors.length === 0) return null;

    return (
      <div className="space-y-2 mb-4">
        {validationErrors.map((error, index) => (
          <Alert
            key={index}
            variant={error.severity === 'error' ? 'destructive' : 'default'}
            className={
              error.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              error.severity === 'info' ? 'border-blue-500 bg-blue-50' : ''
            }
          >
            {error.severity === 'error' && <AlertTriangle className="h-4 w-4" />}
            {error.severity === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
            {error.severity === 'info' && <Info className="h-4 w-4 text-blue-600" />}
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ))}
      </div>
    );
  };

  const renderDemographicsTab = () => (
    <div className="space-y-6">
      {/* Age Range */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Age Range
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minAge" className="text-sm text-muted-foreground">
              Minimum Age
            </Label>
            <Input
              id="minAge"
              type="number"
              min={18}
              max={100}
              value={localMinAge}
              onChange={(e) => {
                const value = e.target.value;
                setLocalMinAge(value);
                const min = parseInt(value) || 18;
                const max = parseInt(localMaxAge) || 65;
                const range = `${min}-${max}`;
                updateRule('age_ranges', [range]);
              }}
              disabled={readOnly}
              placeholder="18"
            />
          </div>
          <div>
            <Label htmlFor="maxAge" className="text-sm text-muted-foreground">
              Maximum Age
            </Label>
            <Input
              id="maxAge"
              type="number"
              min={18}
              max={100}
              value={localMaxAge}
              onChange={(e) => {
                const value = e.target.value;
                setLocalMaxAge(value);
                const max = parseInt(value) || 65;
                const min = parseInt(localMinAge) || 18;
                const range = `${min}-${max}`;
                updateRule('age_ranges', [range]);
              }}
              disabled={readOnly}
              placeholder="65"
            />
          </div>
        </div>
      </div>

      {/* Gender */}
      <div className="space-y-3">
        <Label>Gender</Label>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((gender) => {
            const isSelected = (rules.gender || []).includes(gender.value);
            return (
              <Badge
                key={gender.value}
                variant={isSelected ? 'default' : 'outline'}
                className={`cursor-pointer px-4 py-2 text-sm ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => !readOnly && toggleArrayValue('gender', gender.value)}
              >
                {isSelected && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                {gender.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* User Rating */}
      <div className="space-y-3">
        <Label htmlFor="minRating">Minimum User Rating</Label>
        <p className="text-sm text-muted-foreground">
          Target users with rating above this threshold (1-5 scale)
        </p>
      </div>
    </div>
  );

  const renderLocationTab = () => (
    <div className="space-y-6">
      {/* Cities */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Cities
        </Label>
        <Input
          placeholder="Enter city names (comma-separated)"
          value={(rules.cities || []).join(', ')}
          onChange={(e) => {
            const cities = e.target.value
              .split(',')
              .map(c => c.trim())
              .filter(Boolean);
            updateRule('cities', cities);
          }}
          disabled={readOnly}
        />
        <p className="text-sm text-muted-foreground">
          Target users in specific cities (e.g., Mumbai, Delhi, Bangalore)
        </p>
      </div>

      {/* Regions */}
      <div className="space-y-3">
        <Label>Regions/Zones</Label>
        <Input
          placeholder="Enter regions (comma-separated)"
          value={''}
          onChange={(e) => {
            // Regions not in TargetingRules type, skip for now
          }}
          disabled={readOnly}
        />
      </div>

      {/* Radius Targeting */}
      <div className="space-y-3">
        <Label htmlFor="radius">Radius (km)</Label>
        <Input
          id="radius"
          type="number"
          min={1}
          value={rules.radius_km || ''}
          onChange={(e) => updateRule('radius_km', parseInt(e.target.value) || undefined)}
          disabled={readOnly}
          placeholder="10"
        />
        <p className="text-sm text-muted-foreground">
          Target users within this radius from your business location
        </p>
      </div>
    </div>
  );

  const renderBehaviorTab = () => (
    <div className="space-y-6">
      {/* Interest Categories */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Interest Categories
        </Label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_CATEGORIES.map((interest) => {
            const isSelected = (rules.interests || []).includes(interest.value as any);
            return (
              <Badge
                key={interest.value}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => !readOnly && toggleArrayValue('interests', interest.value)}
              >
                {isSelected && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {interest.label}
              </Badge>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          Target users interested in specific coupon categories
        </p>
      </div>

      {/* Activity Level */}
      <div className="space-y-3">
        <Label htmlFor="minActivityScore">Minimum Activity Score</Label>
        <Input
          id="minActivityScore"
          type="number"
          min={0}
          max={100}
          value={rules.min_activity_score || ''}
          onChange={(e) => updateRule('min_activity_score', parseInt(e.target.value) || undefined)}
          disabled={readOnly}
          placeholder="20"
        />
        <p className="text-sm text-muted-foreground">
          Target users with high engagement (0-100 scale)
        </p>
      </div>

      {/* Driver Status */}
      <div className="space-y-3">
        <Label>Target Power Users (Drivers)</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rules.drivers_only || false}
              onChange={(e) => updateRule('drivers_only', e.target.checked)}
              disabled={readOnly}
            />
            <span className="text-sm">Target only power users who actively share and drive coupon activity</span>
          </label>
        </div>
      </div>
    </div>
  );


  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Targeting Configuration</CardTitle>
            <CardDescription>
              Define who will see your campaign ads
            </CardDescription>
          </div>
          {!readOnly && (
            <Button variant="ghost" size="sm" onClick={clearRules}>
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderValidationAlerts()}
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="demographics">
              <Users className="w-4 h-4 mr-2" />
              Demographics
            </TabsTrigger>
            <TabsTrigger value="location">
              <MapPin className="w-4 h-4 mr-2" />
              Location
            </TabsTrigger>
            <TabsTrigger value="behavior">
              <Activity className="w-4 h-4 mr-2" />
              Behavior
            </TabsTrigger>
          </TabsList>

          <TabsContent value="demographics" className="space-y-4 mt-6">
            {renderDemographicsTab()}
          </TabsContent>

          <TabsContent value="location" className="space-y-4 mt-6">
            {renderLocationTab()}
          </TabsContent>

          <TabsContent value="behavior" className="space-y-4 mt-6">
            {renderBehaviorTab()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default TargetingEditor;
