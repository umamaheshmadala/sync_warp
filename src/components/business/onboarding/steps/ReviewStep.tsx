/**
 * Review & Submit Step
 * Story 4B.4 - Enhanced Business Onboarding
 * Step 5: Review all collected data and complete onboarding
 */

import React from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { formatCurrency } from '@/types/business-onboarding';

interface ReviewStepProps {
  businessId: string;
  businessName?: string;
}

// Import the same goal options for display
const GOAL_OPTIONS = [
  { id: 'increase_foot_traffic', label: 'Increase Foot Traffic', icon: '🚶' },
  { id: 'boost_sales', label: 'Boost Sales', icon: '💰' },
  { id: 'build_awareness', label: 'Build Brand Awareness', icon: '📢' },
  { id: 'promote_event', label: 'Promote Event or Special', icon: '🎉' },
  { id: 'customer_retention', label: 'Customer Retention', icon: '🔄' },
  { id: 'new_customer_acquisition', label: 'New Customer Acquisition', icon: '🆕' }
];

const DISTANCE_OPTIONS = [
  { value: 1000, label: '1 km (0.6 miles)' },
  { value: 3000, label: '3 km (1.9 miles)' },
  { value: 5000, label: '5 km (3.1 miles)' },
  { value: 10000, label: '10 km (6.2 miles)' },
  { value: 20000, label: '20 km (12.4 miles)' }
];

export function ReviewStep({ businessId, businessName = 'Your Business' }: ReviewStepProps) {
  const { stepData } = useOnboarding({ businessId });

  // Extract data from each step
  const customerProfile = stepData?.[2] || {};
  const businessMetrics = stepData?.[3] || {};
  const marketingGoals = stepData?.[4] || {};

  // Helper to check if a section has data
  const hasCustomerProfile = 
    (customerProfile.target_age_ranges?.length > 0) ||
    (customerProfile.target_income_levels?.length > 0) ||
    (customerProfile.target_gender_male !== undefined);
  
  const hasBusinessMetrics = 
    businessMetrics.avg_transaction_cents ||
    businessMetrics.current_customer_base_size ||
    businessMetrics.avg_visits_per_customer_monthly ||
    businessMetrics.new_customers_monthly;
  
  const hasMarketingGoals = 
    marketingGoals.primary_goal ||
    marketingGoals.target_radius_meters;

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Almost Done!
        </h2>
        <p className="text-gray-600">
          Review your information below and submit to complete your onboarding
        </p>
      </div>

      {/* Customer Profile Summary */}
      {hasCustomerProfile && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              👥 Customer Profile
            </h3>
            <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium">
              Completed
            </span>
          </div>

          <div className="space-y-4">
            {customerProfile.target_age_ranges?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Target Age Ranges</p>
                <div className="flex flex-wrap gap-2">
                  {customerProfile.target_age_ranges.map((range: string) => (
                    <span key={range} className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                      {range}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {customerProfile.target_income_levels?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Target Income Levels</p>
                <div className="flex flex-wrap gap-2">
                  {customerProfile.target_income_levels.map((level: string) => (
                    <span key={level} className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                      {level}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(customerProfile.target_gender_male !== undefined || 
              customerProfile.target_gender_female !== undefined || 
              customerProfile.target_gender_other !== undefined) && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Gender Distribution</p>
                <div className="grid grid-cols-3 gap-3">
                  {customerProfile.target_gender_male !== undefined && (
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-900">{customerProfile.target_gender_male}%</p>
                      <p className="text-xs text-blue-700">Male</p>
                    </div>
                  )}
                  {customerProfile.target_gender_female !== undefined && (
                    <div className="text-center p-3 bg-pink-50 rounded-lg">
                      <p className="text-2xl font-bold text-pink-900">{customerProfile.target_gender_female}%</p>
                      <p className="text-xs text-pink-700">Female</p>
                    </div>
                  )}
                  {customerProfile.target_gender_other !== undefined && (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{customerProfile.target_gender_other}%</p>
                      <p className="text-xs text-gray-700">Other</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Business Metrics Summary */}
      {hasBusinessMetrics && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              📊 Business Metrics
            </h3>
            <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium">
              Completed
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {businessMetrics.avg_transaction_cents && (
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 mb-1">Avg. Transaction</p>
                <p className="text-xl font-bold text-green-900">
                  {formatCurrency(businessMetrics.avg_transaction_cents)}
                </p>
              </div>
            )}
            
            {businessMetrics.current_customer_base_size && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 mb-1">Customer Base</p>
                <p className="text-xl font-bold text-blue-900">
                  {businessMetrics.current_customer_base_size.toLocaleString()}
                </p>
              </div>
            )}
            
            {businessMetrics.avg_visits_per_customer_monthly && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700 mb-1">Monthly Visits/Customer</p>
                <p className="text-xl font-bold text-purple-900">
                  {businessMetrics.avg_visits_per_customer_monthly}x
                </p>
              </div>
            )}
            
            {businessMetrics.new_customers_monthly && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-700 mb-1">New Customers/Month</p>
                <p className="text-xl font-bold text-orange-900">
                  {businessMetrics.new_customers_monthly}
                </p>
              </div>
            )}
          </div>

          {/* Estimated Monthly Revenue */}
          {businessMetrics.avg_transaction_cents && 
           businessMetrics.current_customer_base_size && 
           businessMetrics.avg_visits_per_customer_monthly && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-700 mb-1">Estimated Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      businessMetrics.avg_transaction_cents * 
                      businessMetrics.current_customer_base_size * 
                      businessMetrics.avg_visits_per_customer_monthly
                    )}
                  </p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Marketing Goals Summary */}
      {hasMarketingGoals && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🎯 Marketing Goals
            </h3>
            <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium">
              Completed
            </span>
          </div>

          <div className="space-y-4">
            {marketingGoals.primary_goal && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Primary Goal</p>
                <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                  <span className="text-3xl mr-3">
                    {GOAL_OPTIONS.find(g => g.id === marketingGoals.primary_goal)?.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-blue-900">
                      {GOAL_OPTIONS.find(g => g.id === marketingGoals.primary_goal)?.label}
                    </p>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded mt-1 inline-block">
                      Primary Focus
                    </span>
                  </div>
                </div>
              </div>
            )}

            {marketingGoals.secondary_goals?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Secondary Goals</p>
                <div className="flex flex-wrap gap-2">
                  {marketingGoals.secondary_goals.map((goalId: string) => {
                    const goal = GOAL_OPTIONS.find(g => g.id === goalId);
                    return (
                      <span key={goalId} className="inline-flex items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                        <span className="mr-2">{goal?.icon}</span>
                        {goal?.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {marketingGoals.target_radius_meters && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Target Radius</p>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-lg font-semibold text-green-900">
                    📍 {DISTANCE_OPTIONS.find(d => d.value === marketingGoals.target_radius_meters)?.label}
                  </p>
                </div>
              </div>
            )}

            {marketingGoals.notes && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Additional Notes</p>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 italic">"{marketingGoals.notes}"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Data Warning */}
      {!hasCustomerProfile && !hasBusinessMetrics && !hasMarketingGoals && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">No data collected yet</h4>
              <p className="text-sm text-yellow-700">
                You haven't filled out any optional information. You can still complete onboarding and add this information later from your dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Final CTA */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="text-center">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            Ready to get started?
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Click "Complete Onboarding" below to finish setup and start creating campaigns for {businessName}
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Your data is secure and can be updated anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
