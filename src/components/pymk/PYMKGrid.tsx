import React from 'react';
import { RefreshCw } from 'lucide-react';
import { usePYMK, useRefreshPYMK } from '@/hooks/usePYMK';
import { PYMKCard } from './PYMKCard';
import { PYMKCardSkeleton } from '../ui/skeletons/PYMKCardSkeleton';
import { NoPYMKEmptyState } from '../friends/EmptyStates';

export function PYMKGrid() {
  const { data: recommendations, isLoading } = usePYMK(20);
  const refreshPYMK = useRefreshPYMK();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <PYMKCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return <NoPYMKEmptyState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">People You May Know</h2>
        <button
          onClick={() => refreshPYMK.mutate()}
          disabled={refreshPYMK.isPending}
          className="flex items-center text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshPYMK.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {recommendations.map((recommendation) => (
          <PYMKCard key={recommendation.id} recommendation={recommendation} />
        ))}
      </div>
    </div>
  );
}
