/**
 * Targeting Components Demo Page (Simplified)
 * 
 * Interactive demo without shadcn/ui dependencies
 */

import React, { useState } from 'react';
import { TargetingEditor } from '../components/campaign/TargetingEditor';
import { ReachEstimator } from '../components/campaign/ReachEstimator';
import { TargetingValidator } from '../components/campaign/TargetingValidator';
import { RecommendationCard } from '../components/campaign/RecommendationCard';
import type { TargetingRules } from '../types/campaigns';

export default function TargetingDemoSimple() {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Targeting Components Demo
              </h1>
              <p className="text-gray-600">
                Interactive demonstration of Phase 4 targeting configuration UI
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-sm font-medium">
                Phase 4
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-sm font-medium">
                4 Components
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={loadSampleTargeting}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              📝 Load Sample Data
            </button>
            <button
              onClick={resetTargeting}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              🔄 Reset All
            </button>
            <button
              onClick={() => setShowCode(!showCode)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {showCode ? '🙈 Hide' : '👁️ Show'} JSON
            </button>
          </div>

          {/* JSON Preview */}
          {showCode && (
            <div className="mt-4 bg-gray-900 rounded-lg p-4 overflow-auto max-h-64">
              <pre className="text-green-400 text-xs">
                {JSON.stringify(targetingRules, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Targeting Editor */}
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                  1. Targeting Editor
                </h2>
                <p className="text-sm text-gray-600">
                  Configure demographic, location, and behavioral targeting
                </p>
              </div>
              <TargetingEditor
                value={targetingRules}
                onChange={handleTargetingChange}
                businessLocation={{
                  lat: 16.5062,
                  lng: 80.6480,
                  address: 'Vijayawada, Andhra Pradesh'
                }}
                showValidation={false}
              />
            </div>

            {/* AI Recommendations */}
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                  4. AI Recommendations
                </h2>
                <p className="text-sm text-gray-600">
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
                <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                  2. Reach Estimator
                </h2>
                <p className="text-sm text-gray-600">
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
                <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                  3. Targeting Validator
                </h2>
                <p className="text-sm text-gray-600">
                  Real-time validation with errors, warnings, and tips
                </p>
              </div>
              <TargetingValidator
                targetingRules={targetingRules}
              />
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Component Features
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              All components are production-ready with these features
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">TargetingEditor</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ 3 category tabs</li>
                  <li>✓ Badge-based selection</li>
                  <li>✓ Real-time validation</li>
                  <li>✓ Clear all functionality</li>
                  <li>✓ Read-only mode</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">ReachEstimator</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ Live updates</li>
                  <li>✓ Demographic breakdown</li>
                  <li>✓ Cost projections</li>
                  <li>✓ Confidence indicators</li>
                  <li>✓ Progress visualizations</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">TargetingValidator</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ Error detection</li>
                  <li>✓ Warning messages</li>
                  <li>✓ Best practice tips</li>
                  <li>✓ Conflict detection</li>
                  <li>✓ Category badges</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">RecommendationCard</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ 5 strategies</li>
                  <li>✓ Performance predictions</li>
                  <li>✓ One-click apply</li>
                  <li>✓ Budget-aware filtering</li>
                  <li>✓ Expandable details</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
