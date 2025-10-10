/**
 * Profile Completion Widget
 * Story 4B.4 - Enhanced Business Onboarding
 * 
 * Displays profile completion status with recommendations
 */

import React from 'react';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { getProgressColor } from '@/types/business-onboarding';
import { Link } from 'react-router-dom';

interface ProfileCompletionWidgetProps {
  businessId: string;
  className?: string;
}

export function ProfileCompletionWidget({
  businessId,
  className = ''
}: ProfileCompletionWidgetProps) {
  
  const {
    percentage,
    missingFields,
    recommendations,
    sectionsCompletion,
    loading,
    error
  } = useProfileCompletion({ 
    businessId, 
    autoRefresh: true,
    refreshInterval: 60000 // Refresh every minute
  });

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-red-600">
          <p className="font-semibold">Error loading profile data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const progressColor = getProgressColor(percentage);
  const colorClasses = {
    green: 'text-green-600 border-green-500',
    yellow: 'text-yellow-600 border-yellow-500',
    orange: 'text-orange-600 border-orange-500',
    red: 'text-red-600 border-red-500'
  };

  const isComplete = percentage === 100;

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Profile Completion
        </h3>
        {isComplete && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Complete
          </span>
        )}
      </div>

      {/* Circular Progress Indicator */}
      <div className="flex flex-col items-center mb-6">
        <div 
          className={`relative w-32 h-32 mb-3`}
          style={{
            background: `conic-gradient(
              ${progressColor === 'green' ? '#10b981' : 
                progressColor === 'yellow' ? '#f59e0b' : 
                progressColor === 'orange' ? '#f97316' : '#ef4444'} ${percentage * 3.6}deg,
              #e5e7eb ${percentage * 3.6}deg
            )`,
            borderRadius: '50%'
          }}
        >
          <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
            <span className={`text-3xl font-bold ${colorClasses[progressColor]}`}>
              {percentage}%
            </span>
          </div>
        </div>
        
        {!isComplete && (
          <p className="text-sm text-gray-600 text-center">
            {percentage >= 75 ? 'Almost there!' : 
             percentage >= 50 ? 'Good progress!' : 
             percentage >= 25 ? 'Getting started...' : 
             'Let\'s complete your profile'}
          </p>
        )}
      </div>

      {/* Section Breakdowns */}
      <div className="space-y-3 mb-6">
        <h4 className="text-sm font-medium text-gray-700">Section Completion:</h4>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Basics</span>
            <div className="flex items-center">
              <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                <div 
                  className="h-2 bg-blue-500 rounded-full transition-all"
                  style={{ width: `${sectionsCompletion.basics}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-gray-700 w-10 text-right">
                {sectionsCompletion.basics}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Customer Profile</span>
            <div className="flex items-center">
              <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                <div 
                  className="h-2 bg-purple-500 rounded-full transition-all"
                  style={{ width: `${sectionsCompletion.customer_profile}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-gray-700 w-10 text-right">
                {sectionsCompletion.customer_profile}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Business Metrics</span>
            <div className="flex items-center">
              <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                <div 
                  className="h-2 bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${sectionsCompletion.metrics}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-gray-700 w-10 text-right">
                {sectionsCompletion.metrics}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Marketing Goals</span>
            <div className="flex items-center">
              <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                <div 
                  className="h-2 bg-pink-500 rounded-full transition-all"
                  style={{ width: `${sectionsCompletion.marketing_goals}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-gray-700 w-10 text-right">
                {sectionsCompletion.marketing_goals}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits or Missing Fields */}
      {!isComplete && (
        <>
          {missingFields.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Missing Information:
              </h4>
              <ul className="space-y-1">
                {missingFields.slice(0, 3).map((field, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <svg 
                      className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                      />
                    </svg>
                    {field}
                  </li>
                ))}
                {missingFields.length > 3 && (
                  <li className="text-sm text-gray-500 ml-6">
                    +{missingFields.length - 3} more...
                  </li>
                )}
              </ul>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Why complete your profile?
              </h4>
              <ul className="space-y-2">
                {recommendations.slice(0, 3).map((recommendation, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <svg 
                      className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Success Message */}
      {isComplete && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start">
            <svg 
              className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-800">
                Profile Complete!
              </p>
              <p className="text-sm text-green-700 mt-1">
                Your profile is fully optimized for better targeting and recommendations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <Link
        to={`/business/${businessId}/profile/edit`}
        className={`block w-full text-center px-4 py-2 rounded-md font-medium transition-colors ${
          isComplete
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isComplete ? 'Edit Profile' : 'Complete Profile'}
      </Link>
    </div>
  );
}

export default ProfileCompletionWidget;
