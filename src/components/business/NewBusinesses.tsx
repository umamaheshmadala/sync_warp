// src/components/business/NewBusinesses.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, ChevronRight, RefreshCw, Store } from 'lucide-react';
import { BusinessCard } from './BusinessCard';
import { useNewBusinesses } from '../../hooks/useNewBusinesses';
import type { NewBusinessesProps } from '../../types/business';

export function NewBusinesses({
  limit = 12,
  daysThreshold = 30,
  showLoadMore = true,
}: NewBusinessesProps) {
  const navigate = useNavigate();

  const {
    businesses,
    loading,
    error,
    hasMore,
    loadMore,
    fetchNewBusinesses,
    totalCount,
  } = useNewBusinesses({ limit, daysThreshold });

  const handleViewAll = () => {
    navigate('/businesses?filter=new');
  };

  if (loading && businesses.length === 0) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg h-80 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-4">Failed to load new businesses</p>
            <button
              onClick={fetchNewBusinesses}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (businesses.length === 0) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-4">
              <Store className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No new businesses yet
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Check back later to discover newly joined businesses in your area.
            </p>
            <button
              onClick={() => navigate('/businesses')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Browse All Businesses
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-4">
      <div>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                New Businesses
                <TrendingUp className="w-5 h-5 text-green-600" />
              </h2>
            </div>
          </div>

          <button
            onClick={handleViewAll}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors"
          >
            View All
          </button>
        </div>

        {/* Business Grid - 2 cols mobile, responsive desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
          {businesses.map(business => (
            <BusinessCard
              key={business.id}
              business={business}
              showOwner={true}
              showAge={true}
            />
          ))}
        </div>

        {/* Load More Button */}
        {showLoadMore && hasMore && (
          <div className="text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="
                inline-flex items-center gap-2 px-6 py-3
                bg-blue-600 text-white rounded-lg
                hover:bg-blue-700 disabled:bg-gray-400
                font-medium transition-colors
                shadow-md hover:shadow-lg
              "
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Load More
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* No More Items Message */}
        {!hasMore && businesses.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              You've seen all new businesses from the last {daysThreshold} days
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
