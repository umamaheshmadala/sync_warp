// src/components/ads/AdSlot.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, TrendingUp, Check } from 'lucide-react';
import type { AdSlotData } from '../../types/ads';

interface AdSlotProps {
  slot: AdSlotData;
  onAdClick: (adId: string) => void;
  onImpression: (adId: string) => void;
}

const AdSlot: React.FC<AdSlotProps> = ({ slot, onAdClick, onImpression }) => {
  const content = slot.ad || slot.organic;
  const isOrganic = slot.content_type === 'organic';

  // Track impression on mount
  React.useEffect(() => {
    if (slot.ad) {
      onImpression(slot.ad.id);
    }
  }, [slot.ad, onImpression]);

  const handleClick = () => {
    if (slot.ad) {
      onAdClick(slot.ad.id);
      // Navigate to CTA URL
      if (slot.ad.cta_url) {
        window.location.href = slot.ad.cta_url;
      }
    } else if (slot.organic) {
      window.location.href = slot.organic.cta_url;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      {/* Labels - positioned top right to avoid text overlap */}
      {(isOrganic || !isOrganic) && (
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          {isOrganic ? (
            <>
              {/* Mobile: Green Tick */}
              <div className="md:hidden bg-green-500/90 backdrop-blur-sm rounded-full p-1 shadow-sm">
                <Check className="w-3 h-3 text-white" />
              </div>
              {/* Desktop: Recommended Text */}
              <span className="hidden md:block bg-green-500/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                Recommended
              </span>
            </>
          ) : (
            <span className="bg-yellow-400/90 backdrop-blur-sm text-gray-900 text-[10px] md:text-xs px-2 py-0.5 md:py-1 rounded-full font-medium shadow-sm">
              ✨ Sponsored
            </span>
          )}
        </div>
      )}

      <button
        onClick={handleClick}
        className="w-full h-48 relative rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
      >
        {/* Image Section - Full Cover */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
          {content?.image_url ? (
            <img
              src={content.image_url}
              alt={content.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <TrendingUp className="w-16 h-16 text-indigo-400" />
            </div>
          )}
          {/* Gradient Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Text Overlay - Top Left */}
        <div className="absolute top-0 left-0 p-3 md:p-4 pl-12 text-left z-20 w-3/4">
          <h3 className="font-semibold text-white text-xs md:text-lg mb-0.5 md:mb-1 truncate drop-shadow-md">
            {content?.title}
          </h3>
          {content?.description && (
            <p className="text-[10px] md:text-sm text-white/90 line-clamp-2 drop-shadow-sm font-medium leading-tight md:leading-normal">
              {content.description}
            </p>
          )}
        </div>
      </button>
    </motion.div>
  );
};

export default AdSlot;
