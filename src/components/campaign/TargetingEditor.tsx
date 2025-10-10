/**
 * TargetingEditor Component
 * Phase 4: Targeting Configuration UI
 * 
 * Comprehensive targeting rules editor with:
 * - Demographics (age, gender)
 * - Location (city, regions)
 * - Behavior (trip patterns, preferences)
 * - Vehicle type
 * - Real-time validation
 */

import React, { useState, useEffect } from 'react';
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
  Car, 
  AlertTriangle,
  CheckCircle2,
  Info
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

const VEHICLE_TYPES = [
  { label: 'Sedan', value: 'sedan' },
  { label: 'SUV', value: 'suv' },
  { label: 'Luxury', value: 'luxury' },
  { label: 'Electric', value: 'electric' },
  { label: 'Van', value: 'van' },
];

const TRIP_TYPES = [
  { label: 'Short rides (<5km)', value: 'short' },
  { label: 'Medium rides (5-15km)', value: 'medium' },
  { label: 'Long rides (>15km)', value: 'long' },
  { label: 'Airport trips', value: 'airport' },
  { label: 'Business trips', value: 'business' },
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
  const [rules, setRules] = useState<TargetingRules>(value || {
    demographics: {},
    location: {},
    behavior: {},
    vehicle: {},
  });
  
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [activeTab, setActiveTab] = useState('demographics');

  // Validate rules whenever they change
  useEffect(() => {
    if (showValidation) {
      validateRules();
    }
  }, [rules, showValidation]);

  // Notify parent of changes
  useEffect(() => {
    onChange?.(rules);
  }, [rules, onChange]);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateRules = () => {
    const errors: ValidationError[] = [];

    // Check if any targeting is set
    const hasAnyTargeting = 
      Object.keys(rules.demographics || {}).length > 0 ||
      Object.keys(rules.location || {}).length > 0 ||
      Object.keys(rules.behavior || {}).length > 0 ||
      Object.keys(rules.vehicle || {}).length > 0;

    if (!hasAnyTargeting) {
      errors.push({
        field: 'general',
        message: 'No targeting rules set. Campaign will target all drivers.',
        severity: 'warning',
      });
    }

    // Check age range validity
    if (rules.demographics?.minAge && rules.demographics?.maxAge) {
      if (rules.demographics.minAge > rules.demographics.maxAge) {
        errors.push({
          field: 'demographics',
          message: 'Minimum age cannot be greater than maximum age',
          severity: 'error',
        });
      }
    }

    // Check location specificity
    if (rules.location?.cities && rules.location.cities.length > 10) {
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

  const updateDemographics = (key: string, value: any) => {
    setRules(prev => ({
      ...prev,
      demographics: {
        ...prev.demographics,
        [key]: value,
      },
    }));
  };

  const updateLocation = (key: string, value: any) => {
    setRules(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [key]: value,
      },
    }));
  };

  const updateBehavior = (key: string, value: any) => {
    setRules(prev => ({
      ...prev,
      behavior: {
        ...prev.behavior,
        [key]: value,
      },
    }));
  };

  const updateVehicle = (key: string, value: any) => {
    setRules(prev => ({
      ...prev,
      vehicle: {
        ...prev.vehicle,
        [key]: value,
      },
    }));
  };

  const toggleArrayValue = (category: keyof TargetingRules, field: string, value: string) => {
    setRules(prev => {
      const categoryData = prev[category] || {};
      const currentArray = (categoryData[field] as string[]) || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(v => v !== value)
        : [...currentArray, value];
      
      return {
        ...prev,
        [category]: {
          ...categoryData,
          [field]: newArray,
        },
      };
    });
  };

  const clearRules = () => {
    setRules({
      demographics: {},
      location: {},
      behavior: {},
      vehicle: {},
    });
  };

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
              value={rules.demographics?.minAge || ''}
              onChange={(e) => updateDemographics('minAge', parseInt(e.target.value) || undefined)}
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
              value={rules.demographics?.maxAge || ''}
              onChange={(e) => updateDemographics('maxAge', parseInt(e.target.value) || undefined)}
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
          {GENDERS.map((gender) => (
            <Badge
              key={gender.value}
              variant={rules.demographics?.gender === gender.value ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => !readOnly && updateDemographics('gender', gender.value)}
            >
              {gender.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Experience Level */}
      <div className="space-y-3">
        <Label htmlFor="minTrips">Minimum Completed Trips</Label>
        <Input
          id="minTrips"
          type="number"
          min={0}
          value={rules.demographics?.minTrips || ''}
          onChange={(e) => updateDemographics('minTrips', parseInt(e.target.value) || undefined)}
          disabled={readOnly}
          placeholder="e.g., 100"
        />
        <p className="text-sm text-muted-foreground">
          Target drivers with at least this many completed trips
        </p>
      </div>

      {/* Driver Rating */}
      <div className="space-y-3">
        <Label htmlFor="minRating">Minimum Driver Rating</Label>
        <Input
          id="minRating"
          type="number"
          min={1}
          max={5}
          step={0.1}
          value={rules.demographics?.minRating || ''}
          onChange={(e) => updateDemographics('minRating', parseFloat(e.target.value) || undefined)}
          disabled={readOnly}
          placeholder="4.5"
        />
        <p className="text-sm text-muted-foreground">
          Target drivers with rating above this threshold (1-5 scale)
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
          value={(rules.location?.cities || []).join(', ')}
          onChange={(e) => {
            const cities = e.target.value
              .split(',')
              .map(c => c.trim())
              .filter(Boolean);
            updateLocation('cities', cities);
          }}
          disabled={readOnly}
        />
        <p className="text-sm text-muted-foreground">
          Target drivers operating in specific cities
        </p>
      </div>

      {/* Regions */}
      <div className="space-y-3">
        <Label>Regions/Zones</Label>
        <Input
          placeholder="Enter regions (comma-separated)"
          value={(rules.location?.regions || []).join(', ')}
          onChange={(e) => {
            const regions = e.target.value
              .split(',')
              .map(r => r.trim())
              .filter(Boolean);
            updateLocation('regions', regions);
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
          value={rules.location?.radius || ''}
          onChange={(e) => updateLocation('radius', parseInt(e.target.value) || undefined)}
          disabled={readOnly}
          placeholder="10"
        />
        <p className="text-sm text-muted-foreground">
          Target drivers within this radius from your business location
        </p>
      </div>
    </div>
  );

  const renderBehaviorTab = () => (
    <div className="space-y-6">
      {/* Trip Types */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Preferred Trip Types
        </Label>
        <div className="flex flex-wrap gap-2">
          {TRIP_TYPES.map((tripType) => {
            const isSelected = (rules.behavior?.tripTypes || []).includes(tripType.value);
            return (
              <Badge
                key={tripType.value}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => !readOnly && toggleArrayValue('behavior', 'tripTypes', tripType.value)}
              >
                {isSelected && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {tripType.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Activity Level */}
      <div className="space-y-3">
        <Label htmlFor="minTripsPerWeek">Minimum Trips Per Week</Label>
        <Input
          id="minTripsPerWeek"
          type="number"
          min={1}
          value={rules.behavior?.minTripsPerWeek || ''}
          onChange={(e) => updateBehavior('minTripsPerWeek', parseInt(e.target.value) || undefined)}
          disabled={readOnly}
          placeholder="10"
        />
      </div>

      {/* Peak Hours */}
      <div className="space-y-3">
        <Label>Active During Peak Hours</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rules.behavior?.peakHours || false}
              onChange={(e) => updateBehavior('peakHours', e.target.checked)}
              disabled={readOnly}
            />
            <span className="text-sm">Target drivers active during rush hours</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderVehicleTab = () => (
    <div className="space-y-6">
      {/* Vehicle Types */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Car className="w-4 h-4" />
          Vehicle Types
        </Label>
        <div className="flex flex-wrap gap-2">
          {VEHICLE_TYPES.map((vehicleType) => {
            const isSelected = (rules.vehicle?.types || []).includes(vehicleType.value);
            return (
              <Badge
                key={vehicleType.value}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => !readOnly && toggleArrayValue('vehicle', 'types', vehicleType.value)}
              >
                {isSelected && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {vehicleType.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Vehicle Year */}
      <div className="space-y-3">
        <Label htmlFor="minYear">Minimum Vehicle Year</Label>
        <Input
          id="minYear"
          type="number"
          min={2000}
          max={new Date().getFullYear()}
          value={rules.vehicle?.minYear || ''}
          onChange={(e) => updateVehicle('minYear', parseInt(e.target.value) || undefined)}
          disabled={readOnly}
          placeholder="2018"
        />
      </div>

      {/* Premium Only */}
      <div className="space-y-3">
        <Label>Premium Vehicles Only</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rules.vehicle?.premiumOnly || false}
              onChange={(e) => updateVehicle('premiumOnly', e.target.checked)}
              disabled={readOnly}
            />
            <span className="text-sm">Only show ads to premium/luxury vehicles</span>
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
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="vehicle">
              <Car className="w-4 h-4 mr-2" />
              Vehicle
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

          <TabsContent value="vehicle" className="space-y-4 mt-6">
            {renderVehicleTab()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default TargetingEditor;
