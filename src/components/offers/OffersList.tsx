import React, { useState } from 'react';
import { Filter, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Correct placement
import { useOffers } from '../../hooks/useOffers';
import { Offer, OfferFilters, OfferSortOptions, OfferStatus } from '../../types/offers';
import { OfferCard } from './OfferCard';
import { EmptyOffersState } from './EmptyOffersState';
import { OfferActionModal, OfferActionMode } from './modals/OfferActionModal';
import { OfferAuditLogPanel } from './OfferAuditLogPanel';
import { OfferActionType } from './OfferActionsMenu';

interface OffersListProps {
  businessId: string;
  onCreateOffer?: () => void;
  onEditOffer?: (offerId: string) => void;
  onShareOffer?: (offerId: string) => void;
  onViewDetails?: (offer: any) => void;
  onViewAnalytics?: (offer: any) => void;
  onExtendExpiry?: (offer: any) => void;
  onDuplicate?: (offer: any) => void; // Optional override, otherwise internal logic
  showActions?: boolean;
}

export function OffersList({
  businessId,
  onCreateOffer,
  onEditOffer,
  onShareOffer,
  onViewDetails,
  onViewAnalytics,
  onExtendExpiry,
  onDuplicate,
  showActions = true,
}: OffersListProps) {
  // Filters and sorting state
  const [filters, setFilters] = useState<OfferFilters>({ business_id: businessId });
  const [sort, setSort] = useState<OfferSortOptions>({ field: 'created_at', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<OfferActionMode>('delete');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use offers hook
  const {
    offers,
    isLoading,
    error,
    fetchOffers,
    activateOffer,
    pauseOffer,
    resumeOffer,
    terminateOffer,
    archiveOffer,
    deleteOffer,
    duplicateOffer: hookDuplicateOffer,
    toggleFeatured,
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
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'draft', label: 'Drafts' },
    { value: 'paused', label: 'Paused' },
    { value: 'archived', label: 'Archived' },
    { value: 'terminated', label: 'Terminated' },
    { value: 'expired', label: 'Expired' },
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
      const { status: _, ...rest } = filters;
      setFilters({ ...rest });
    } else {
      setFilters({ ...filters, status });
    }
  };

  const handlePageChange = (page: number) => {
    fetchOffers(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Action Handlers
  const openActionModal = (offer: Offer, mode: OfferActionMode) => {
    setSelectedOffer(offer);
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleModalConfirm = async (reason?: string) => {
    if (!selectedOffer) return;
    setIsProcessing(true);
    try {
      let success = false;
      switch (modalMode) {
        case 'pause':
          success = await pauseOffer(selectedOffer.id, reason);
          if (success) {
            await supabase.rpc('log_offer_action', {
              p_offer_id: selectedOffer.id,
              p_action: 'paused',
              p_reason: reason
            });
          }
          break;
        case 'terminate':
          success = await terminateOffer(selectedOffer.id, reason);
          if (success) {
            await supabase.rpc('log_offer_action', {
              p_offer_id: selectedOffer.id,
              p_action: 'terminated',
              p_reason: reason
            });
          }
          break;
        case 'archive':
          success = await archiveOffer(selectedOffer.id);
          if (success) {
            await supabase.rpc('log_offer_action', {
              p_offer_id: selectedOffer.id,
              p_action: 'archived'
            });
          }
          break;
        case 'delete':
          success = await deleteOffer(selectedOffer.id);
          if (success) {
            await supabase.rpc('log_offer_action', {
              p_offer_id: selectedOffer.id,
              p_action: 'deleted'
            });
          }
          break;
      }
      if (success) {
        setModalOpen(false);
        setSelectedOffer(null);
      }
    } catch (e) {
      console.error('Action failed', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicate = async (offer: Offer) => {
    if (onDuplicate) {
      onDuplicate(offer);
    } else {
      const success = await hookDuplicateOffer(offer.id);
      if (success) {
        await supabase.rpc('log_offer_action', {
          p_offer_id: offer.id,
          p_action: 'duplicated'
        });
      }
    }
  };

  // Featured & History Handlers (Story 4.18 & 4.19)
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyOffer, setHistoryOffer] = useState<Offer | null>(null);

  const handleToggleFeatured = async (offer: Offer) => {
    const newFeaturedState = !offer.is_featured;
    const success = await toggleFeatured(offer.id, newFeaturedState);
    if (success) {
      await supabase.rpc('log_offer_action', {
        p_offer_id: offer.id,
        p_action: newFeaturedState ? 'featured' : 'unfeatured'
      });
    }
  };

  const handleViewHistory = (offer: Offer) => {
    setHistoryOffer(offer);
    setHistoryOpen(true);
  };

  // Unified Action Handler
  const handleAction = (action: OfferActionType, offer: Offer) => {
    switch (action) {
      case 'edit':
        if (onEditOffer) onEditOffer(offer.id);
        break;
      case 'pause':
        openActionModal(offer, 'pause');
        break;
      case 'resume':
        resumeOffer(offer.id);
        break;
      case 'terminate':
        openActionModal(offer, 'terminate');
        break;
      case 'archive':
        openActionModal(offer, 'archive');
        break;
      case 'delete':
        openActionModal(offer, 'delete');
        break;
      case 'duplicate':
        handleDuplicate(offer);
        break;
      case 'toggle_featured':
        handleToggleFeatured(offer);
        break;
      case 'view_history':
        handleViewHistory(offer);
        break;
      case 'view_details':
        if (onViewDetails) onViewDetails(offer);
        break;
    }
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
      {/* Header & filters controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Offers</h2>
          <p className="text-gray-600 mt-1">
            Manage your offers lifecycle
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters ? 'bg-purple-50 border-purple-200 text-purple-700' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          {onCreateOffer && (
            <button
              onClick={onCreateOffer}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Offer
            </button>
          )}
        </div>
      </div>

      {/* Tabs / Filters Panel */}
      {showFilters || true ? ( // Always show tabs for better UX for now
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            {statusOptions.map((option) => {
              const isActive = (option.value === 'all' && !filters.status) || filters.status === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusFilter(option.value)}
                  className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${isActive
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                >
                  {option.label}
                </button>
              )
            })}
          </nav>
        </div>
      ) : null}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 mt-4">Loading offers...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && offers.length === 0 && (
        <div className="py-8">
          <EmptyOffersState
            onCreate={onCreateOffer}
            message={filters.status ? `No ${filters.status} offers found` : undefined}
          />
        </div>
      )}

      {/* Offers Grid */}
      {!isLoading && offers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onAction={showActions ? handleAction : undefined}
              onViewDetails={onViewDetails ? () => onViewDetails(offer) : undefined}
              showActions={showActions}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
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

      {/* Confirmation Modal */}
      {selectedOffer && (
        <OfferActionModal
          isOpen={modalOpen}
          mode={modalMode}
          offer={selectedOffer}
          onClose={() => { setModalOpen(false); setSelectedOffer(null); }}
          onConfirm={handleModalConfirm}
          isProcessing={isProcessing}
        />
      )}

      {/* History Panel */}
      {historyOffer && (
        <OfferAuditLogPanel
          isOpen={historyOpen}
          onClose={() => { setHistoryOpen(false); setHistoryOffer(null); }}
          offerId={historyOffer.id}
        />
      )}
    </div>
  );
}

export default OffersList;
