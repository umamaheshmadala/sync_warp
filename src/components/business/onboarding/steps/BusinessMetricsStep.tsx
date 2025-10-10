/**
 * Business Metrics Step
 * Story 4B.4 - Enhanced Business Onboarding
 * Step 3: Collect business performance metrics (OPTIONAL)
 */

import React from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { formatCurrency, currencyToCents } from '@/types/business-onboarding';

interface BusinessMetricsStepProps {
  businessId: string;
}

export function BusinessMetricsStep({ businessId }: BusinessMetricsStepProps) {
  const { stepData, updateCurrentStepData, currentStep } = useOnboarding({ businessId });

  // Initialize with safe defaults
  const currentStepData = stepData?.[currentStep] || {};
  const data = {
    avg_transaction_cents: currentStepData.avg_transaction_cents,
    current_customer_base_size: currentStepData.current_customer_base_size,
    avg_visits_per_customer_monthly: currentStepData.avg_visits_per_customer_monthly,
    new_customers_monthly: currentStepData.new_customers_monthly
  };

  const handleNumberChange = (field: string, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value);
    updateCurrentStepData({
      ...data,
      [field]: numValue
    });
  };

  const handleCurrencyChange = (field: string, value: string) => {
    const cents = value === '' ? undefined : currencyToCents(value);
    updateCurrentStepData({
      ...data,
      [field]: cents
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
            Providing business metrics helps us create better campaigns, but you can skip this and add it later if you prefer.
          </p>
        </div>
      </div>

      {/* Average Transaction Value */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Average Transaction Value
        </label>
        <p className="text-sm text-gray-600 mb-3">
          What's the typical amount a customer spends per visit?
        </p>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            value={data.avg_transaction_cents ? (data.avg_transaction_cents / 100).toFixed(2) : ''}
            onChange={(e) => handleCurrencyChange('avg_transaction_cents', e.target.value)}
            placeholder="0.00"
            className="block w-full pl-7 pr-12 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Example: If customers typically spend $25 per visit, enter 25.00
        </p>
      </div>

      {/* Current Customer Base */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Current Customer Base Size
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Approximately how many unique customers do you have?
        </p>
        <input
          type="number"
          min="0"
          value={data.current_customer_base_size || ''}
          onChange={(e) => handleNumberChange('current_customer_base_size', e.target.value)}
          placeholder="e.g., 500"
          className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-2 text-xs text-gray-500">
          This can be an estimate - include regular and occasional customers
        </p>
      </div>

      {/* Average Visits Per Customer */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Average Monthly Visits per Customer
        </label>
        <p className="text-sm text-gray-600 mb-3">
          How often does a typical customer visit your business per month?
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: 1, label: 'Once a month' },
            { value: 2, label: '2-3 times' },
            { value: 4, label: '4-5 times' },
            { value: 8, label: '8+ times (weekly)' }
          ].map((option) => (
            <label
              key={option.value}
              className={`relative flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                data.avg_visits_per_customer_monthly === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type="radio"
                checked={data.avg_visits_per_customer_monthly === option.value}
                onChange={() => {
                  updateCurrentStepData({
                    ...data,
                    avg_visits_per_customer_monthly: option.value
                  });
                }}
                className="sr-only"
              />
              <div className={`text-2xl font-bold mb-1 ${
                data.avg_visits_per_customer_monthly === option.value ? 'text-blue-900' : 'text-gray-700'
              }`}>
                {option.value}x
              </div>
              <div className={`text-sm text-center ${
                data.avg_visits_per_customer_monthly === option.value ? 'text-blue-700' : 'text-gray-600'
              }`}>
                {option.label}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* New Customers Monthly */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          New Customers per Month
        </label>
        <p className="text-sm text-gray-600 mb-3">
          About how many new customers do you typically get each month?
        </p>
        <input
          type="number"
          min="0"
          value={data.new_customers_monthly || ''}
          onChange={(e) => handleNumberChange('new_customers_monthly', e.target.value)}
          placeholder="e.g., 50"
          className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-2 text-xs text-gray-500">
          First-time customers who visited your business this month
        </p>
      </div>

      {/* Summary Card */}
      {(data.avg_transaction_cents || data.current_customer_base_size) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-3">Your Business Snapshot</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {data.avg_transaction_cents && (
              <div>
                <p className="text-gray-600">Avg. Transaction</p>
                <p className="font-semibold text-gray-900">{formatCurrency(data.avg_transaction_cents)}</p>
              </div>
            )}
            {data.current_customer_base_size && (
              <div>
                <p className="text-gray-600">Customer Base</p>
                <p className="font-semibold text-gray-900">{data.current_customer_base_size.toLocaleString()}</p>
              </div>
            )}
            {data.avg_visits_per_customer_monthly && (
              <div>
                <p className="text-gray-600">Avg. Monthly Visits</p>
                <p className="font-semibold text-gray-900">{data.avg_visits_per_customer_monthly}x per customer</p>
              </div>
            )}
            {data.new_customers_monthly && (
              <div>
                <p className="text-gray-600">New Monthly Customers</p>
                <p className="font-semibold text-gray-900">{data.new_customers_monthly}</p>
              </div>
            )}
          </div>
          
          {data.avg_transaction_cents && data.current_customer_base_size && data.avg_visits_per_customer_monthly && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <p className="text-xs text-gray-600 mb-1">Estimated Monthly Revenue:</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(
                  data.avg_transaction_cents * 
                  data.current_customer_base_size * 
                  data.avg_visits_per_customer_monthly
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
