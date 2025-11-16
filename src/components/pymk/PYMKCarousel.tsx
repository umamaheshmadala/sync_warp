/**
 * PYMK Carousel Component (Mobile)
 * Story 9.2.2: PYMK Engine
 */

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePYMK } from '@/hooks/usePYMK';
import { PYMKCard } from './PYMKCard';

export function PYMKCarousel() {
  const { data: recommendations, isLoading } = usePYMK(10);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280; // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (isLoading) {
    return <PYMKCarouselSkeleton />;
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">People You May Know</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => scroll('left')}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex overflow-x-auto space-x-4 pb-4 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {recommendations.map((recommendation) => (
          <div key={recommendation.user_id} className="flex-shrink-0 w-64 snap-start">
            <PYMKCard recommendation={recommendation} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PYMKCarouselSkeleton() {
  return (
    <div>
      <div className="h-6 w-48 bg-gray-200 rounded mb-4 animate-pulse"></div>
      <div className="flex overflow-x-auto space-x-4 pb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-64 bg-white rounded-lg shadow p-4 animate-pulse">
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
