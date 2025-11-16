/**
 * PYMK Grid Component (Web)
 * Story 9.2.2: PYMK Engine
 */

import React from 'react';
import { RefreshCw, Users } from 'lucide-react';
import { usePYMK, useRefreshPYMK } from '@/hooks/usePYMK';
import { PYMKCard } from './PYMKCard';

export function PYMKGrid() {
  const { data: recommendations, isLoading } = usePYMK(20);
  const refreshPYMK = useRefreshPYMK();

  if (isLoading) {
    return <PYMKGridSkeleton />;
  }

  if (!recommendations || recommendations.length === 0) {
    return <EmptyPYMKState />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">People You May Know</h2>
        <button
          onClick={() => refreshPYMK.mutate()}
          disabled={refreshPYMK.isPending}
          className="flex items-center text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshPYMK.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recommendations.map((recommendation) => (
          <PYMKCard key={recommendation.user_id} recommendation={recommendation} />
        ))}
      </div>
    </div>
  );
}

function PYMKGridSkeleton() {
  return (
    <div>
      <div className="h-8 w-64 bg-gray-200 rounded mb-6 animate-pulse"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="w-20 h-20 bg-gray-300 rounded-full mx-auto mb-3"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-8 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyPYMKState() {
  return (
    <div className="text-center py-12 bg-white rounded-lg shadow">
      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No Suggestions Available
      </h3>
      <p className="text-gray-600 mb-4">
        We'll show you friend suggestions here as you build your network
      </p>
      <div className="text-sm text-gray-500">
        Try:
        <ul className="mt-2 space-y-1">
          <li>• Adding your location to your profile</li>
          <li>• Syncing your contacts</li>
          <li>• Adding more friends</li>
        </ul>
      </div>
    </div>
  );
}
