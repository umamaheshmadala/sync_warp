/**
 * Marketing Goals Step
 * Story 4B.4 - Enhanced Business Onboarding
 * Step 4: Select marketing objectives and targeting details (OPTIONAL)
 */

import React from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';

interface MarketingGoalsStepProps {
  businessId: string;
}

// Marketing goal options
const GOAL_OPTIONS = [
  {
    id: 'increase_foot_traffic',
    label: 'Increase Foot Traffic',
    description: 'Attract more customers to visit your physical location',
    icon: '🚶'
  },
  {
    id: 'boost_sales',
    label: 'Boost Sales',
    description: 'Increase revenue and transaction values',
    icon: '💰'
  },
  {
    id: 'build_awareness',
    label: 'Build Brand Awareness',
    description: 'Get your business noticed by more people in your area',
    icon: '📢'
  },
  {
    id: 'promote_event',
    label: 'Promote Event or Special',
    description: 'Drive attendance for specific events or promotions',
    icon: '🎉'
  },
  {
    id: 'customer_retention',
    label: 'Customer Retention',
    description: 'Keep existing customers coming back more often',
    icon: '🔄'
  },
  {
    id: 'new_customer_acquisition',
    label: 'New Customer Acquisition',
    description: 'Reach people who haven\'t visited your business yet',
    icon: '🆕'
  }
];

// Targeting distance options (in meters)
const DISTANCE_OPTIONS = [
  { value: 1000, label: '1 km (0.6 miles)', description: 'Immediate neighborhood' },
  { value: 3000, label: '3 km (1.9 miles)', description: 'Walking/biking distance' },
  { value: 5000, label: '5 km (3.1 miles)', description: 'Short drive' },
  { value: 10000, label: '10 km (6.2 miles)', description: 'City-wide' },
  { value: 20000, label: '20 km (12.4 miles)', description: 'Extended metro area' }
];

export function MarketingGoalsStep({ businessId }: MarketingGoalsStepProps) {
  const { stepData, updateCurrentStepData, currentStep } = useOnboarding({ businessId });

  // Initialize with safe defaults
  const currentStepData = stepData?.[currentStep] || {};
  const data = {
    primary_goal: currentStepData.primary_goal || '',
    secondary_goals: currentStepData.secondary_goals || [],
    target_radius_meters: currentStepData.target_radius_meters,
    notes: currentStepData.notes || ''
  };

  const handlePrimaryGoalChange = (goalId: string) => {
    // If clicking current primary goal, unselect it
    const newPrimaryGoal = data.primary_goal === goalId ? '' : goalId;
    
    // Remove from secondary if selecting as primary
    const newSecondaryGoals = data.secondary_goals.filter(g => g !== goalId);
    
    updateCurrentStepData({
      ...data,
      primary_goal: newPrimaryGoal,
      secondary_goals: newSecondaryGoals
    });
  };

  const handleSecondaryGoalToggle = (goalId: string) => {
    // Don't allow adding primary goal to secondary
    if (data.primary_goal === goalId) return;
    
    const isSelected = data.secondary_goals.includes(goalId);
    const newSecondaryGoals = isSelected
      ? data.secondary_goals.filter(g => g !== goalId)
      : [...data.secondary_goals, goalId];
    
    updateCurrentStepData({
      ...data,
      secondary_goals: newSecondaryGoals
    });
  };

  return (
    <div className="space-y-8">
      {/* Optional Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
        <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-blue-900 mb-1">This step is optional</p>
          <p className="text-sm text-blue-700">
            Setting marketing goals helps us create targeted campaigns, but you can add them later.
          </p>
        </div>
      </div>

      {/* Primary Goal Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          What's your main marketing goal?
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Choose your primary objective for marketing campaigns
        </p>
        <div className="space-y-3">
          {GOAL_OPTIONS.map((goal) => {
            const isPrimary = data.primary_goal === goal.id;
            const isSecondary = data.secondary_goals.includes(goal.id);
            
            return (
              <label
                key={goal.id}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  isPrimary
                    ? 'border-blue-500 bg-blue-50'
                    : isSecondary
                    ? 'border-gray-300 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  checked={isPrimary}
                  onChange={() => handlePrimaryGoalChange(goal.id)}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{goal.icon}</span>
                    <div>
                      <div className={`font-semibold ${isPrimary ? 'text-blue-900' : 'text-gray-900'}`}>
                        {goal.label}
                        {isPrimary && (
                          <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${isPrimary ? 'text-blue-700' : 'text-gray-600'}`}>
                        {goal.description}
                      </p>
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Secondary Goals */}
      {data.primary_goal && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Any additional goals? (Optional)
          </label>
          <p className="text-sm text-gray-600 mb-4">
            Select any secondary objectives you'd like to focus on
          </p>
          <div className="space-y-2">
            {GOAL_OPTIONS
              .filter(g => g.id !== data.primary_goal)
              .map((goal) => {
                const isSelected = data.secondary_goals.includes(goal.id);
                
                return (
                  <label
                    key={goal.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSecondaryGoalToggle(goal.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-xl mr-3">{goal.icon}</span>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {goal.label}
                      </div>
                    </div>
                  </label>
                );
              })}
          </div>
        </div>
      )}

      {/* Target Radius */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Target Audience Distance
        </label>
        <p className="text-sm text-gray-600 mb-4">
          How far from your business should we target potential customers?
        </p>
        <div className="space-y-2">
          {DISTANCE_OPTIONS.map((option) => {
            const isSelected = data.target_radius_meters === option.value;
            
            return (
              <label
                key={option.value}
                className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  checked={isSelected}
                  onChange={() => {
                    updateCurrentStepData({
                      ...data,
                      target_radius_meters: option.value
                    });
                  }}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {option.label}
                  </div>
                  <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                    {option.description}
                  </p>
                </div>
                {isSelected && (
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          💡 Tip: Most local businesses see best results targeting within 5 km
        </p>
      </div>

      {/* Additional Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Additional Notes (Optional)
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Any specific details about your marketing preferences or target audience?
        </p>
        <textarea
          value={data.notes}
          onChange={(e) => {
            updateCurrentStepData({
              ...data,
              notes: e.target.value
            });
          }}
          rows={4}
          placeholder="e.g., 'We're especially interested in reaching young families' or 'Focus on weekday lunch promotions'"
          className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Summary Card */}
      {(data.primary_goal || data.target_radius_meters) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-3">Your Marketing Strategy</h4>
          <div className="space-y-3">
            {data.primary_goal && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">PRIMARY GOAL</p>
                <div className="flex items-center">
                  <span className="text-xl mr-2">
                    {GOAL_OPTIONS.find(g => g.id === data.primary_goal)?.icon}
                  </span>
                  <p className="font-semibold text-gray-900">
                    {GOAL_OPTIONS.find(g => g.id === data.primary_goal)?.label}
                  </p>
                </div>
              </div>
            )}
            
            {data.secondary_goals.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">SECONDARY GOALS</p>
                <div className="flex flex-wrap gap-2">
                  {data.secondary_goals.map(goalId => {
                    const goal = GOAL_OPTIONS.find(g => g.id === goalId);
                    return (
                      <span key={goalId} className="inline-flex items-center px-3 py-1 bg-white border border-gray-300 rounded-full text-sm">
                        <span className="mr-1">{goal?.icon}</span>
                        {goal?.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            
            {data.target_radius_meters && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">TARGET RADIUS</p>
                <p className="font-semibold text-gray-900">
                  {DISTANCE_OPTIONS.find(d => d.value === data.target_radius_meters)?.label}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
