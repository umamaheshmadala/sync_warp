// =====================================================
// Story 4.12: Business Offers Management
// Component: OffersList - Grid display of offers
// =====================================================

import React, { useState } from 'react';
import { Filter, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOffers } from '../../hooks/useOffers';
import type { OfferFilters, OfferSortOptions, OfferStatus } from '../../types/offers';
import { OfferCard } from './OfferCard';
import { EmptyOffersState } from './EmptyOffersState';

interface OffersListProps {
  businessId: string;
  onCreateOffer?: () => void;
  onEditOffer?: (offerId: string) => void;
  onShareOffer?: (offerId: string) => void;
  showActions?: boolean;
}

export function OffersList({
  businessId,
  onCreateOffer,
  onEditOffer,
  onShareOffer,
  showActions = true,
}: OffersListProps) {
  // Filters and sorting state
  const [filters, setFilters] = useState<OfferFilters>({ business_id: businessId });
  const [sort, setSort] = useState<OfferSortOptions>({ field: 'created_at', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);

  // Use offers hook
  const {
    offers,
    isLoading,
    error,
    fetchOffers,
    activateOffer,
    pauseOffer,
    archiveOffer,
    deleteOffer,
    currentPage,
    totalPages,
    hasMore,
  } = useOffers({
    businessId,
    filters,
    sort,
    limit: 12,
    autoFetch: true,
  });

  // Status filter options
  const statusOptions: { value: OfferStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Offers' },
    { value: 'active', label: 'Active' },
    { value: 'draft', label: 'Draft' },
    { value: 'paused', label: 'Paused' },
    { value: 'expired', label: 'Expired' },
    { value: 'archived', label: 'Archived' },
  ];

  // Sort options
  const sortOptions: { value: OfferSortOptions; label: string }[] = [
    { value: { field: 'created_at', direction: 'desc' }, label: 'Newest First' },
    { value: { field: 'created_at', direction: 'asc' }, label: 'Oldest First' },
    { value: { field: 'valid_until', direction: 'asc' }, label: 'Expiring Soon' },
    { value: { field: 'view_count', direction: 'desc' }, label: 'Most Viewed' },
    { value: { field: 'share_count', direction: 'desc' }, label: 'Most Shared' },
    { value: { field: 'title', direction: 'asc' }, label: 'Title (A-Z)' },
  ];

  const handleStatusFilter = (status: OfferStatus | 'all') => {
    if (status === 'all') {
      setFilters({ business_id: businessId });
    } else {
      setFilters({ ...filters, status });
    }
  };

  const handleSortChange = (newSort: OfferSortOptions) => {
    setSort(newSort);
  };

  const handlePageChange = (page: number) => {
    fetchOffers(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error loading offers: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Offers</h2>
          <p className="text-gray-600 mt-1">
            {offers.length} {offers.length === 1 ? 'offer' : 'offers'} found
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          {onCreateOffer && (
            <button
              onClick={onCreateOffer}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Offer
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusFilter(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    (option.value === 'all' && !filters.status) || filters.status === option.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={JSON.stringify(sort)}
              onChange={(e) => handleSortChange(JSON.parse(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {sortOptions.map((option) => (
                <option key={option.label} value={JSON.stringify(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 mt-4">Loading offers...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && offers.length === 0 && <EmptyOffersState />}

      {/* Offers Grid */}
      {!isLoading && offers.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onShare={onShareOffer ? () => onShareOffer(offer.id) : undefined}
                onEdit={onEditOffer ? () => onEditOffer(offer.id) : undefined}
                onActivate={showActions ? () => activateOffer(offer.id) : undefined}
                onPause={showActions ? () => pauseOffer(offer.id) : undefined}
                onArchive={showActions ? () => archiveOffer(offer.id) : undefined}
                onDelete={showActions ? () => deleteOffer(offer.id) : undefined}
                showActions={showActions}
                showStats={true}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasMore}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default OffersList;
