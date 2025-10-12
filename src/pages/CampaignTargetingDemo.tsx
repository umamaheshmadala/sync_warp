/**
 * Campaign Targeting Demo Page
 * Interactive demo to test all three backend-integrated components
 */

import { useState } from 'react';
import { TargetingValidator } from '../components/campaign/TargetingValidator';
import { ReachEstimator } from '../components/campaign/ReachEstimator';
import { RecommendationCard } from '../components/campaign/RecommendationCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import type { TargetingRules } from '../types/campaigns';
import { Target, Users, Sparkles, Play, RefreshCw } from 'lucide-react';

export function CampaignTargetingDemo() {
  // Sample targeting rules
  const [targetingRules, setTargetingRules] = useState<TargetingRules>({
    age_ranges: ['25-34', '35-44'],
    income_levels: ['middle', 'upper_middle'],
    cities: ['New York', 'Los Angeles'],
    min_activity_score: 50,
    drivers_only: true,
  });

  // For recommendations
  const [businessId] = useState('demo-business-123');
  
  // UI state
  const [activeTab, setActiveTab] = useState('validator');

  // Handler for applying recommendations
  const handleApplyRecommendation = (rules: TargetingRules) => {
    setTargetingRules(rules);
    setActiveTab('validator');
  };

  // Reset to default targeting
  const resetTargeting = () => {
    setTargetingRules({
      age_ranges: ['25-34', '35-44'],
      income_levels: ['middle', 'upper_middle'],
      cities: ['New York', 'Los Angeles'],
      min_activity_score: 50,
      drivers_only: true,
    });
  };

  // Preset scenarios
  const presetScenarios = {
    broad: {
      age_ranges: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
      min_activity_score: 10,
    },
    focused: {
      age_ranges: ['25-34'],
      income_levels: ['upper_middle', 'high'],
      min_activity_score: 80,
      drivers_only: true,
    },
    premium: {
      age_ranges: ['35-44', '45-54', '55-64'],
      income_levels: ['high'],
      interests: ['luxury', 'premium_dining'],
      min_activity_score: 90,
      drivers_only: true,
    },
    budget: {
      age_ranges: ['18-24', '25-34'],
      min_activity_score: 20,
    },
  };

  const applyPreset = (preset: keyof typeof presetScenarios) => {
    setTargetingRules(presetScenarios[preset]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Target className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Campaign Targeting System
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Test the backend-integrated targeting components with real-time validation, 
            reach estimation, and AI-powered recommendations.
          </p>
          <div className="flex gap-2 justify-center">
            <Badge variant="outline" className="bg-green-50">
              ✅ Async Validation
            </Badge>
            <Badge variant="outline" className="bg-blue-50">
              ✅ Real-time Estimates
            </Badge>
            <Badge variant="outline" className="bg-purple-50">
              ✅ AI Recommendations
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Quick Start Scenarios
            </CardTitle>
            <CardDescription>
              Try these preset targeting configurations to see different validation results
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => applyPreset('broad')} variant="outline">
              🌐 Broad Reach
            </Button>
            <Button onClick={() => applyPreset('focused')} variant="outline">
              🎯 Focused Targeting
            </Button>
            <Button onClick={() => applyPreset('premium')} variant="outline">
              💎 Premium Audience
            </Button>
            <Button onClick={() => applyPreset('budget')} variant="outline">
              💰 Budget Friendly
            </Button>
            <Separator orientation="vertical" className="h-8" />
            <Button onClick={resetTargeting} variant="ghost">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset to Default
            </Button>
          </CardContent>
        </Card>

        {/* Current Targeting Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Current Targeting Configuration</CardTitle>
            <CardDescription>
              This is the targeting configuration being tested across all components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {targetingRules.age_ranges && targetingRules.age_ranges.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Age Ranges</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {targetingRules.age_ranges.map(age => (
                      <Badge key={age} variant="secondary">{age}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {targetingRules.income_levels && targetingRules.income_levels.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Income Levels</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {targetingRules.income_levels.map(income => (
                      <Badge key={income} variant="secondary">{income}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {targetingRules.cities && targetingRules.cities.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Cities</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {targetingRules.cities.map(city => (
                      <Badge key={city} variant="secondary">{city}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {targetingRules.interests && targetingRules.interests.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Interests</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {targetingRules.interests.map(interest => (
                      <Badge key={interest} variant="secondary">{interest}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {targetingRules.min_activity_score && (
                <div>
                  <Label className="text-xs text-muted-foreground">Min Activity Score</Label>
                  <div className="mt-1">
                    <Badge variant="secondary">{targetingRules.min_activity_score}</Badge>
                  </div>
                </div>
              )}
              {targetingRules.drivers_only && (
                <div>
                  <Label className="text-xs text-muted-foreground">Target Type</Label>
                  <div className="mt-1">
                    <Badge variant="secondary">Drivers Only</Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Components Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="validator" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Targeting Validator
            </TabsTrigger>
            <TabsTrigger value="estimator" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Reach Estimator
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="validator" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Targeting Validation</CardTitle>
                <CardDescription>
                  Validates targeting rules with backend service - shows errors, warnings, and suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TargetingValidator 
                  targetingRules={targetingRules}
                  useMockData={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estimator" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audience Reach Estimation</CardTitle>
                <CardDescription>
                  Live audience size estimation with demographic breakdown and cost projections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReachEstimator 
                  targetingRules={targetingRules}
                  useMockData={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Recommendations</CardTitle>
                <CardDescription>
                  Smart targeting suggestions based on successful campaigns and business profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecommendationCard 
                  businessId={businessId}
                  onApply={handleApplyRecommendation}
                  useMockData={false}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Testing Guide */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle>💡 Testing Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm">🎯 Targeting Validator</h4>
              <p className="text-sm text-muted-foreground">
                Switch between presets to see different validation results. 
                "Broad Reach" will show warnings, "Premium" will validate cleanly.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm">👥 Reach Estimator</h4>
              <p className="text-sm text-muted-foreground">
                Watch the numbers update in real-time as you change targeting. 
                Notice the confidence level and demographic breakdowns.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm">✨ AI Recommendations</h4>
              <p className="text-sm text-muted-foreground">
                Click "Apply" on any recommendation to instantly test it in the other components.
                Shows personalized suggestions based on your business profile.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CampaignTargetingDemo;
