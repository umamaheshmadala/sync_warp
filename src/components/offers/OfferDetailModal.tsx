// OfferDetailModal.tsx
// Modal to display full offer details

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  Share2,
  Eye,
  MousePointerClick,
  Tag,
  Info,
  Edit3
} from 'lucide-react';
import { format } from 'date-fns';
import type { Offer } from '../../types/offers';
import { Button } from '@/components/ui/button';
import { OfferShareButton } from '../Sharing/OfferShareButton';
import { getOfferColor } from '../../utils/offerColors';

interface OfferDetailModalProps {
  offer: Offer;
  onClose: () => void;
  onShare?: (offer: Offer) => void;
  onEdit?: (offer: Offer) => void;
  showStats?: boolean;
}

export const OfferDetailModal: React.FC<OfferDetailModalProps> = ({
  offer,
  onClose,
  onShare,
  onEdit,
  showStats = false,
}) => {
  const categoryName = offer.offer_type?.category?.name || (offer as any).category_name;
  const ticketColor = React.useMemo(() => {
    return getOfferColor(categoryName);
  }, [categoryName]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          // Ticket Shape Container - Auto Height within limits
          className="relative flex w-full md:w-[60%] h-auto max-h-[90vh] bg-transparent shadow-2xl rounded-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Stub */}
          <div className={`relative w-12 md:w-16 flex-shrink-0 flex items-center justify-center overflow-hidden text-white ${ticketColor}`}>
            {/* Vertical Text */}
            <div
              className="font-black text-2xl md:text-4xl tracking-widest opacity-20 transform -rotate-90 whitespace-nowrap absolute select-none"
              style={{ fontFamily: 'Impact, sans-serif' }}
            >
              OFFER
            </div>

            {/* Decorative Dashed Line */}
            <div className="absolute right-0 top-4 bottom-4 w-0 border-r-2 border-dashed border-white/40 z-10"></div>
          </div>

          {/* Right Content */}
          <div className="flex-1 bg-white flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-start justify-between gap-4 flex-shrink-0 bg-white z-10">
              <div className="flex-1">
                {/* Business Name */}
                <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
                  {offer.business?.business_name || 'Sync Business'}
                </h3>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 line-clamp-2">{offer.title}</h2>
                {offer.offer_code && (
                  <p className="text-xs md:text-sm text-gray-500 mt-1">
                    Code: <span className={`font-mono font-semibold ${ticketColor.replace('bg-', 'text-')}`}>{offer.offer_code}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
              {/* Icon/Image */}
              {offer.icon_image_url ? (
                <div className="flex justify-center">
                  <img
                    src={offer.icon_image_url}
                    alt={offer.title}
                    className="w-full h-32 md:h-48 rounded-xl object-cover shadow-sm"
                  />
                </div>
              ) : (
                <div className="flex justify-center my-0">
                  {/* Reduced height and padding for placeholder as requested */}
                  <div className={`w-full py-4 ${ticketColor.replace('bg-', 'bg-opacity-10 ')} rounded-lg flex items-center justify-center text-center`}>
                    <span className={`font-black text-lg md:text-xl uppercase ${ticketColor.replace('bg-', 'text-')}`}>
                      {offer.offer_type?.offer_name || 'OFFER'}
                    </span>
                  </div>
                </div>
              )}

              {/* Description */}
              {offer.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-gray-400" />
                    Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-sm">{offer.description}</p>
                </div>
              )}

              {/* Validity Period */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Validity Period
                </h3>
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {format(new Date(offer.valid_from), 'MMMM d, yyyy')} - {format(new Date(offer.valid_until), 'MMMM d, yyyy')}
                </div>
              </div>

              {/* Terms & Conditions */}
              {offer.terms_conditions && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Terms & Conditions
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {offer.terms_conditions}
                    </p>
                  </div>
                </div>
              )}

              {/* Stats (if enabled) */}
              {showStats && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Statistics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Eye className="w-5 h-5 text-blue-600" />
                        <span className="text-2xl font-bold text-blue-900">{offer.view_count}</span>
                      </div>
                      <span className="text-xs text-blue-700 font-medium">Views</span>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Share2 className="w-5 h-5 text-purple-600" />
                        <span className="text-2xl font-bold text-purple-900">{offer.share_count}</span>
                      </div>
                      <span className="text-xs text-purple-700 font-medium">Shares</span>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <MousePointerClick className="w-5 h-5 text-green-600" />
                        <span className="text-2xl font-bold text-green-900">{offer.click_count}</span>
                      </div>
                      <span className="text-xs text-green-700 font-medium">Clicks</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 flex-shrink-0">
              <Button
                variant="outline"
                onClick={onClose}
                className="min-w-[80px]"
              >
                Close
              </Button>

              {onEdit && (
                <Button
                  variant="outline"
                  onClick={() => onEdit(offer)}
                  className="min-w-[80px] text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}

              <OfferShareButton
                offerId={offer.id}
                offerTitle={offer.title}
                offerDescription={offer.description}
                validUntil={offer.valid_until}
                offerImage={offer.icon_image_url}
                businessId={offer.business_id}
                businessName={offer.business?.business_name || 'Sync Business'}
                variant="default"
                size="default"
                showLabel={true}
                label="Share"
                className={`min-w-[100px] text-white ${ticketColor} hover:brightness-90`}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfferDetailModal;
