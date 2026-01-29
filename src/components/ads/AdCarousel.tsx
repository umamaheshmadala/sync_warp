// src/components/ads/AdCarousel.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import AdSlot from './AdSlot';
import { useAdSlots } from '../../hooks/useAdSlots';

const AdCarousel: React.FC = () => {
  const { slots, loading, trackImpression, trackClick } = useAdSlots();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (!autoplay || slots.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slots.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [autoplay, slots.length]);

  const goToPrevious = () => {
    setAutoplay(false);
    setCurrentIndex((prev) => (prev - 1 + slots.length) % slots.length);
  };

  const goToNext = () => {
    setAutoplay(false);
    setCurrentIndex((prev) => (prev + 1) % slots.length);
  };

  if (loading) {
    return (
      <div className="h-48 md:h-96 bg-gray-100 rounded-2xl animate-pulse" />
    );
  }

  if (slots.length === 0) {
    return (
      <div className="h-48 md:h-96 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border-2 border-dashed border-indigo-200">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Promote Your Business Here</h3>
          <p className="text-sm text-gray-600 max-w-sm mx-auto">
            Reach thousands of local customers by featuring your business in this premium spot.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div className="relative overflow-hidden rounded-2xl group">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <AdSlot
              slot={slots[currentIndex]}
              onAdClick={trackClick}
              onImpression={trackImpression}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        {slots.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 bg-white/20 md:bg-white/90 hover:bg-white/40 md:hover:bg-white p-1 md:p-2 rounded-full shadow-sm md:shadow-lg transition-all z-10 backdrop-blur-[2px] md:backdrop-blur-sm"
              aria-label="Previous ad"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-900" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 bg-white/20 md:bg-white/90 hover:bg-white/40 md:hover:bg-white p-1 md:p-2 rounded-full shadow-sm md:shadow-lg transition-all z-10 backdrop-blur-[2px] md:backdrop-blur-sm"
              aria-label="Next ad"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-gray-900" />
            </button>
          </>
        )}
      </div>

      {/* Indicators - Desktop Only, Overlay */}
      {slots.length > 1 && (
        <div className="absolute bottom-1 left-0 right-0 z-20 hidden md:flex justify-center space-x-2">
          {slots.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setAutoplay(false);
                setCurrentIndex(index);
              }}
              className="py-1 px-2 group focus:outline-none"
              aria-label={`Go to slide ${index + 1}`}
            >
              <div
                className={`h-[5px] rounded-sm transition-all duration-300 ${index === currentIndex
                  ? 'w-[25px] bg-white opacity-100'
                  : 'w-[25px] bg-white/50 group-hover:bg-white/80'
                  }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdCarousel;
