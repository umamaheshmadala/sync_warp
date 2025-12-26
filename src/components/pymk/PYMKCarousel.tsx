import React from 'react';
import { usePYMK } from '@/hooks/usePYMK';
import { PYMKCard } from './PYMKCard';
import { PYMKCardSkeleton } from '../ui/skeletons/PYMKCardSkeleton';
import { NoPYMKEmptyState } from '../friends/EmptyStates';

export function PYMKCarousel() {
  const { data: recommendations, isLoading } = usePYMK(10);

  if (isLoading) {
    return (
      <div className="flex overflow-x-auto pb-4 space-x-4 px-4 -mx-4 scrollbar-hide">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-[160px] shrink-0">
            <PYMKCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-lg font-semibold text-gray-900">People You May Know</h2>
      </div>

      <div className="flex overflow-x-auto pb-4 space-x-4 px-4 -mx-4 scrollbar-hide snap-x snap-mandatory">
        {recommendations.map((recommendation) => (
          <div key={recommendation.id} className="w-[160px] shrink-0 snap-center">
            <PYMKCard recommendation={recommendation} />
          </div>
        ))}
      </div>
    </div>
  );
}
