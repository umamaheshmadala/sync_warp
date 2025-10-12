/**
 * Targeting Components Demo Page
 * 
 * Interactive demo showing all Phase 4 targeting components:
 * - TargetingEditor
 * - ReachEstimator
 * - TargetingValidator
 * - RecommendationCard
 */

import React, { useState } from 'react';
import { TargetingEditor } from '../components/campaign/TargetingEditor';
import { ReachEstimator } from '../components/campaign/ReachEstimator';
import { TargetingValidator } from '../components/campaign/TargetingValidator';
import { RecommendationCard } from '../components/campaign/RecommendationCard';
import type { TargetingRules } from '../types/campaigns';

export default function TargetingDemo() {
  const [targetingRules, setTargetingRules] = useState<TargetingRules>({
    demographics: {},
    location: {},
    behavior: {},
  });

  const [budget] = useState<number>(5000);
  const [showCode, setShowCode] = useState<boolean>(false);

  const handleTargetingChange = (rules: TargetingRules) => {
    setTargetingRules(rules);
  };

  const handleRecommendationApply = (rules: TargetingRules) => {
    setTargetingRules(rules);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetTargeting = () => {
    setTargetingRules({
      demographics: {},
      location: {},
      behavior: {},
    });
  };

  const loadSampleTargeting = () => {
    setTargetingRules({
      demographics: {
        minAge: 25,
        maxAge: 45,
        minRating: 4.0,
        gender: 'all',
      },
      location: {
        cities: ['Mumbai', 'Delhi', 'Bangalore'],
        radius: 25,
      },
      behavior: {
        minActivityScore: 80,
        isDriver: true,
        interests: ['food', 'shopping', 'entertainment'],
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Targeting Components Demo</h1>
              <p className="text-muted-foreground">
                Interactive demonstration of Phase 4 targeting configuration UI
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Phase 4
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                4 Components
              </Badge>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-4">
            <Button onClick={loadSampleTargeting} variant="outline" size="sm">
              <Code className="w-4 h-4 mr-2" />
              Load Sample Data
            </Button>
            <Button onClick={resetTargeting} variant="outline" size="sm">
              Reset All
            </Button>
            <Button onClick={() => setShowCode(!showCode)} variant="ghost" size="sm">
              {showCode ? 'Hide' : 'Show'} JSON
            </Button>
          </div>

          {/* JSON Preview */}
          {showCode && (
            <Card className="mt-4 bg-slate-50">
              <CardHeader>
                <CardTitle className="text-sm">Current Targeting Rules (JSON)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto max-h-48 bg-slate-900 text-green-400 p-4 rounded">
                  {JSON.stringify(targetingRules, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Components</TabsTrigger>
            <TabsTrigger value="editor">
              <Target className="w-4 h-4 mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="estimator">
              <BarChart3 className="w-4 h-4 mr-2" />
              Estimator
            </TabsTrigger>
            <TabsTrigger value="validator">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Validator
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Recommendations
            </TabsTrigger>
          </TabsList>

          {/* All Components View */}
          <TabsContent value="all" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Targeting Editor */}
                <div>
                  <div className="mb-4">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      <Target className="w-6 h-6" />
                      1. Targeting Editor
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Configure demographic, location, and behavioral targeting
                    </p>
                  </div>
                  <TargetingEditor
                    value={targetingRules}
                    onChange={handleTargetingChange}
                    showValidation={false}
                  />
                </div>

                {/* AI Recommendations */}
                <div>
                  <div className="mb-4">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      <Sparkles className="w-6 h-6" />
                      4. AI Recommendations
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Smart targeting suggestions based on similar campaigns
                    </p>
                  </div>
                  <RecommendationCard
                    currentTargeting={targetingRules}
                    budget={budget}
                    onApply={handleRecommendationApply}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Reach Estimator */}
                <div>
                  <div className="mb-4">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      <BarChart3 className="w-6 h-6" />
                      2. Reach Estimator
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Real-time audience size and cost estimation
                    </p>
                  </div>
                  <ReachEstimator
                    targetingRules={targetingRules}
                    budget={budget}
                    updateInterval={3000}
                  />
                </div>

                {/* Targeting Validator */}
                <div>
                  <div className="mb-4">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6" />
                      3. Targeting Validator
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Real-time validation with errors, warnings, and tips
                    </p>
                  </div>
                  <TargetingValidator
                    targetingRules={targetingRules}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Individual Component Views */}
          <TabsContent value="editor">
            <Card>
              <CardHeader>
                <CardTitle>Targeting Editor Component</CardTitle>
                <CardDescription>
                  Full-featured targeting rules editor with tabs for different categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TargetingEditor
                  value={targetingRules}
                  onChange={handleTargetingChange}
                  showValidation={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estimator">
            <Card>
              <CardHeader>
                <CardTitle>Reach Estimator Component</CardTitle>
                <CardDescription>
                  Real-time audience estimation with demographic breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReachEstimator
                  targetingRules={targetingRules}
                  budget={budget}
                  updateInterval={3000}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validator">
            <Card>
              <CardHeader>
                <CardTitle>Targeting Validator Component</CardTitle>
                <CardDescription>
                  Intelligent validation with categorized feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TargetingValidator
                  targetingRules={targetingRules}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle>AI Recommendation Component</CardTitle>
                <CardDescription>
                  Smart targeting suggestions with performance predictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecommendationCard
                  currentTargeting={targetingRules}
                  budget={budget}
                  onApply={handleRecommendationApply}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Features Overview */}
        <Separator className="my-8" />
        
        <Card className="bg-slate-50">
          <CardHeader>
            <CardTitle>Component Features</CardTitle>
            <CardDescription>
              All components are production-ready with these features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">TargetingEditor</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ 3 category tabs</li>
                  <li>✓ Badge-based selection</li>
                  <li>✓ Real-time validation</li>
                  <li>✓ Clear all functionality</li>
                  <li>✓ Read-only mode</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">ReachEstimator</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Live updates</li>
                  <li>✓ Demographic breakdown</li>
                  <li>✓ Cost projections</li>
                  <li>✓ Confidence indicators</li>
                  <li>✓ Progress visualizations</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">TargetingValidator</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Error detection</li>
                  <li>✓ Warning messages</li>
                  <li>✓ Best practice tips</li>
                  <li>✓ Conflict detection</li>
                  <li>✓ Category badges</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">RecommendationCard</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ 5 strategies</li>
                  <li>✓ Performance predictions</li>
                  <li>✓ One-click apply</li>
                  <li>✓ Budget-aware filtering</li>
                  <li>✓ Expandable details</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
