// =====================================================
// Story 4.10: Storefront Minor Enhancements
// Component: StorefrontErrorState - Error state for storefront
// =====================================================

import React from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';

export interface StorefrontErrorStateProps {
  /** The error object or message */
  error?: Error | string;
  
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  
  /** Custom error title */
  title?: string;
  
  /** Custom error message */
  message?: string;
}

/**
 * Error state component for storefront loading failures
 * 
 * Features:
 * - User-friendly error display
 * - Retry button
 * - Go back button
 * - Custom error messages
 */
export function StorefrontErrorState({
  error,
  onRetry,
  title = 'Failed to Load Business',
  message,
}: StorefrontErrorStateProps) {
  const navigate = useNavigate();

  // Extract error message
  const errorMessage = message || (
    error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
      ? error 
      : 'We couldn\'t load this business page. Please check your connection and try again.'
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg border p-8 text-center">
        {/* Error Icon */}
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Error Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {title}
        </h2>

        {/* Error Message */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          {errorMessage}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Additional Help */}
        <p className="mt-6 text-sm text-gray-500">
          If the problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}

export default StorefrontErrorState;
