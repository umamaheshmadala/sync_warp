// =====================================================
// Story 4.10: Storefront Minor Enhancements
// Component: ReviewsErrorState - Error state for reviews
// =====================================================

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

export interface ReviewsErrorStateProps {
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  
  /** Custom error message */
  message?: string;
}

/**
 * Error state component for review loading failures
 * 
 * Features:
 * - Compact error display
 * - Retry button
 * - User-friendly message
 */
export function ReviewsErrorState({
  onRetry,
  message = 'Failed to load reviews. Please try again.',
}: ReviewsErrorStateProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="text-center">
        {/* Error Icon */}
        <div className="mb-4">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
        </div>

        {/* Error Message */}
        <p className="text-gray-600 mb-4">{message}</p>

        {/* Retry Button */}
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="flex items-center justify-center mx-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

export default ReviewsErrorState;
