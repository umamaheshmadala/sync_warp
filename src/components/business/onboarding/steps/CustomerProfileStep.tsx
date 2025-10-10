/**
 * Customer Profile Step
 * Story 4B.4 - Enhanced Business Onboarding
 * Step 2: Collect target customer demographics
 */

import React from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import {
  AGE_RANGES,
  INCOME_LEVELS,
  INTEREST_CATEGORIES,
  getAgeRangeLabel,
  getIncomeLevelLabel,
  getInterestCategoryLabel,
  validateAgeRanges,
  validateIncomeLevels,
  validateGenderDistribution,
  AgeRange,
  IncomeLevel,
  InterestCategory
} from '@/types/business-onboarding';

interface CustomerProfileStepProps {
  businessId: string;
}

export function CustomerProfileStep({ businessId }: CustomerProfileStepProps) {
  const { stepData, updateCurrentStepData, currentStep } = useOnboarding({ businessId });

  // Initialize with safe defaults
  const currentStepData = stepData?.[currentStep] || {};
  const data = {
    primary_age_ranges: (currentStepData.primary_age_ranges || []) as AgeRange[],
    gender_distribution: currentStepData.gender_distribution || { male: 33, female: 33, other: 34 },
    income_levels: (currentStepData.income_levels || []) as IncomeLevel[],
    interest_categories: (currentStepData.interest_categories || []) as InterestCategory[],
    customer_behavior_notes: currentStepData.customer_behavior_notes || '',
    typical_visit_duration: currentStepData.typical_visit_duration,
    repeat_customer_rate: currentStepData.repeat_customer_rate
  };

  // Handle age range toggle
  const handleAgeRangeToggle = (range: AgeRange) => {
    const updated = data.primary_age_ranges.includes(range)
      ? data.primary_age_ranges.filter((r: AgeRange) => r !== range)
      : [...data.primary_age_ranges, range];
    
    updateCurrentStepData({
      ...data,
      primary_age_ranges: updated
    });
  };

  // Handle gender distribution change
  const handleGenderChange = (gender: 'male' | 'female' | 'other', value: number) => {
    updateCurrentStepData({
      ...data,
      gender_distribution: {
        ...data.gender_distribution,
        [gender]: Math.max(0, Math.min(100, value))
      }
    });
  };

  // Handle income level toggle
  const handleIncomeLevelToggle = (level: IncomeLevel) => {
    const updated = data.income_levels.includes(level)
      ? data.income_levels.filter((l: IncomeLevel) => l !== level)
      : [...data.income_levels, level];
    
    updateCurrentStepData({
      ...data,
      income_levels: updated
    });
  };

  // Handle interest category toggle
  const handleInterestToggle = (category: InterestCategory) => {
    const updated = data.interest_categories.includes(category)
      ? data.interest_categories.filter((c: InterestCategory) => c !== category)
      : [...data.interest_categories, category];
    
    updateCurrentStepData({
      ...data,
      interest_categories: updated
    });
  };

  // Validation states
  const ageValidation = validateAgeRanges(data.primary_age_ranges);
  const incomeValidation = validateIncomeLevels(data.income_levels);
  const genderValidation = validateGenderDistribution(data.gender_distribution);
  const genderTotal = data.gender_distribution.male + data.gender_distribution.female + data.gender_distribution.other;

  return (
    <div className="space-y-8">
      {/* Age Ranges */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Primary Age Ranges <span className="text-red-600">*</span>
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Select all age ranges that represent your typical customers
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {AGE_RANGES.map((range) => (
            <label
              key={range}
              className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                data.primary_age_ranges.includes(range)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={data.primary_age_ranges.includes(range)}
                onChange={() => handleAgeRangeToggle(range)}
                className="sr-only"
              />
              <div className="flex items-center">
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                    data.primary_age_ranges.includes(range)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  {data.primary_age_ranges.includes(range) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  data.primary_age_ranges.includes(range) ? 'text-blue-900' : 'text-gray-700'
                }`}>
                  {getAgeRangeLabel(range)}
                </span>
              </div>
            </label>
          ))}
        </div>
        {!ageValidation.valid && (
          <p className="mt-2 text-sm text-red-600">{ageValidation.error}</p>
        )}
      </div>

      {/* Gender Distribution */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Gender Distribution
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Approximate percentage of your customer base by gender (should total ~100%)
        </p>
        <div className="space-y-4">
          {/* Male */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Male</label>
              <span className="text-sm font-semibold text-gray-900">
                {data.gender_distribution.male}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={data.gender_distribution.male}
              onChange={(e) => handleGenderChange('male', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Female */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Female</label>
              <span className="text-sm font-semibold text-gray-900">
                {data.gender_distribution.female}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={data.gender_distribution.female}
              onChange={(e) => handleGenderChange('female', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>

          {/* Other */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Other/Non-binary</label>
              <span className="text-sm font-semibold text-gray-900">
                {data.gender_distribution.other}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={data.gender_distribution.other}
              onChange={(e) => handleGenderChange('other', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
          </div>

          {/* Total */}
          <div className={`p-3 rounded-md ${
            genderTotal >= 95 && genderTotal <= 105
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total:</span>
              <span className={`text-sm font-bold ${
                genderTotal >= 95 && genderTotal <= 105 ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {genderTotal}%
              </span>
            </div>
            {!genderValidation.valid && (
              <p className="mt-1 text-xs text-yellow-700">{genderValidation.error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Income Levels */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Income Levels <span className="text-red-600">*</span>
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Select all income levels that represent your typical customers
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INCOME_LEVELS.map((level) => (
            <label
              key={level}
              className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                data.income_levels.includes(level)
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={data.income_levels.includes(level)}
                onChange={() => handleIncomeLevelToggle(level)}
                className="sr-only"
              />
              <div className="flex items-center">
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                    data.income_levels.includes(level)
                      ? 'bg-green-600 border-green-600'
                      : 'border-gray-300'
                  }`}
                >
                  {data.income_levels.includes(level) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  data.income_levels.includes(level) ? 'text-green-900' : 'text-gray-700'
                }`}>
                  {getIncomeLevelLabel(level)}
                </span>
              </div>
            </label>
          ))}
        </div>
        {!incomeValidation.valid && (
          <p className="mt-2 text-sm text-red-600">{incomeValidation.error}</p>
        )}
      </div>

      {/* Interest Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Customer Interests
        </label>
        <p className="text-sm text-gray-600 mb-4">
          What are your customers typically interested in?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {INTEREST_CATEGORIES.map((category) => (
            <label
              key={category}
              className={`relative flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                data.interest_categories.includes(category)
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={data.interest_categories.includes(category)}
                onChange={() => handleInterestToggle(category)}
                className="sr-only"
              />
              <div className="flex items-center">
                <div
                  className={`flex-shrink-0 w-4 h-4 rounded border-2 mr-2 flex items-center justify-center ${
                    data.interest_categories.includes(category)
                      ? 'bg-purple-600 border-purple-600'
                      : 'border-gray-300'
                  }`}
                >
                  {data.interest_categories.includes(category) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  data.interest_categories.includes(category) ? 'text-purple-900' : 'text-gray-700'
                }`}>
                  {getInterestCategoryLabel(category)}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Customer Behavior Notes */}
      <div>
        <label htmlFor="behavior-notes" className="block text-sm font-medium text-gray-900 mb-2">
          Customer Behavior Notes
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Tell us more about your typical customers (optional)
        </p>
        <textarea
          id="behavior-notes"
          rows={4}
          value={data.customer_behavior_notes}
          onChange={(e) => updateCurrentStepData({ ...data, customer_behavior_notes: e.target.value })}
          placeholder="e.g., Young professionals who value sustainability, health-conscious shoppers looking for organic options..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          maxLength={500}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">
            {data.customer_behavior_notes?.length || 0}/500 characters
          </span>
        </div>
      </div>

      {/* Optional: Additional Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="visit-duration" className="block text-sm font-medium text-gray-900 mb-2">
            Typical Visit Duration (minutes)
          </label>
          <input
            id="visit-duration"
            type="number"
            min="1"
            max="300"
            value={data.typical_visit_duration || ''}
            onChange={(e) => updateCurrentStepData({ 
              ...data, 
              typical_visit_duration: e.target.value ? parseInt(e.target.value) : undefined 
            })}
            placeholder="30"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="repeat-rate" className="block text-sm font-medium text-gray-900 mb-2">
            Repeat Customer Rate (%)
          </label>
          <input
            id="repeat-rate"
            type="number"
            min="0"
            max="100"
            value={data.repeat_customer_rate || ''}
            onChange={(e) => updateCurrentStepData({ 
              ...data, 
              repeat_customer_rate: e.target.value ? parseInt(e.target.value) : undefined 
            })}
            placeholder="60"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">Why we need this information</h4>
            <p className="text-sm text-blue-700 mt-1">
              Understanding your target customers helps us provide better campaign targeting, 
              personalized recommendations, and insights to grow your business.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerProfileStep;
