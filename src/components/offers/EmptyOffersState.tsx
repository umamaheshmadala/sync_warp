// =====================================================
// Story 4.10: Storefront Minor Enhancements
// Component: EmptyOffersState - Empty state for offers
// =====================================================

import React from 'react';
import { Gift } from 'lucide-react';

/**
 * Empty state component when a business has no offers
 * 
 * Features:
 * - Friendly icon and message
 * - Encourages users to check back later
 */
interface EmptyOffersStateProps {
  onCreate?: () => void;
  message?: string;
}

export function EmptyOffersState({ onCreate, message }: EmptyOffersStateProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12">
      <div className="text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
            <Gift className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {message || 'No Offers Available'}
        </h3>

        {/* Description */}
        <p className="text-gray-600 leading-relaxed mb-6">
          This business hasn't posted any offers yet. Check back later for exciting deals and promotions!
        </p>

        {onCreate && (
          <button
            onClick={onCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <Gift className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Create First Offer
          </button>
        )}
      </div>
    </div>
  );
}

export default EmptyOffersState;
