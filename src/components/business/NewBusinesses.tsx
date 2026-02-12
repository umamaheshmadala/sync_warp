// src/components/business/NewBusinesses.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ChevronRight, RefreshCw, Store } from 'lucide-react';
import { StandardBusinessCard, type StandardBusinessCardData } from '../common';
import { useNewBusinesses } from '../../hooks/useNewBusinesses';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import type { NewBusinessesProps } from '../../types/business';
import { StorefrontShareButton } from '../Sharing/StorefrontShareButton';
import { FollowButton } from '../following/FollowButton';
import { cn } from '../../lib/utils'; // Make sure cn is imported if used, though strict style prop usage might avoid it. Based on prev file content it wasn't there, but it's good practice. Wait, I see I didn't see it in imports, but I'll add it if needed. Actually I'll stick to the plan.

export function NewBusinesses({
  limit = 12,
  daysThreshold = 30,
  showLoadMore = true,
}: NewBusinessesProps) {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();

  const {
    businesses,
    loading,
    error,
    hasMore,
    loadMore,
    fetchNewBusinesses,
  } = useNewBusinesses({ limit, daysThreshold });

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
          <div className="grid grid-cols-1 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg h-40 animate-pulse" />
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
        </div>

        {/* Business Grid - Single column on all devices for horizontal cards */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 mb-8">
          {businesses.map(business => {
            // Map to StandardBusinessCardData
            const businessData: StandardBusinessCardData = {
              id: business.id,
              business_name: business.business_name || business.name,
              business_type: business.business_type || business.category,
              address: business.address,
              city: business.city,
              state: business.state,
              rating: business.average_rating || business.rating,
              review_count: business.total_reviews || business.review_count,
              follower_count: business.follower_count,
              logo_url: business.logo_url,
              cover_image_url: business.cover_image_url,
              description: business.description,
              activeCouponsCount: business.activeCouponsCount || business.activeOffersCount,
              recommendation_badge: business.recommendation_badge,
              recommendation_percentage: business.recommendation_percentage,
              approved_review_count: business.approved_review_count,
            };

            return (
              <StandardBusinessCard
                key={business.id}
                business={businessData}
                onCardClick={(id) => navigate(getBusinessUrl(id, businessData.business_name || 'business'))}
                variant="search"
                showChevron={false}
                actionButton={
                  <div className="flex items-center gap-2">
                    <StorefrontShareButton
                      businessId={business.id}
                      businessName={businessData.business_name || ''}
                      businessImageUrl={businessData.logo_url}
                      showLabel={false}
                      showIcon={true}
                      showModal={true}
                      className="p-2.5 w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 border-none shadow-none"
                      variant="ghost"
                    />
                    <FollowButton
                      businessId={business.id}
                      businessName={businessData.business_name}
                      variant="ghost"
                      size="sm"
                      showLabel={false}
                      className="p-2.5 w-10 h-10 rounded-full bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 border-none shadow-none"
                    />
                  </div>
                }
              />
            );
          })}
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
