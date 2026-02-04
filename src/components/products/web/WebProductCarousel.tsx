import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WebProductCarouselProps {
    images: { url: string; alt_text?: string }[] | string[];
    currentIndex: number;
    onChangeIndex: (index: number) => void;
    productName: string;
}

export const WebProductCarousel: React.FC<WebProductCarouselProps> = ({
    images,
    currentIndex,
    onChangeIndex,
    productName
}) => {
    // Normalize images to array of objects if strings (legacy/simple array)
    const imageList = images.map(img =>
        typeof img === 'string' ? { url: img, alt_text: productName } : img
    );

    const hasMultiple = imageList.length > 1;

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex > 0) {
            onChangeIndex(currentIndex - 1);
        }
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex < imageList.length - 1) {
            onChangeIndex(currentIndex + 1);
        }
    };

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden grouped-nav-hover">
            {/* Main Image */}
            <div className="w-full h-full flex items-center justify-center">
                {imageList[currentIndex] ? (
                    <img
                        src={imageList[currentIndex].url}
                        alt={imageList[currentIndex].alt_text || productName}
                        className="max-w-full max-h-full object-contain"
                    />
                ) : (
                    <div className="text-gray-500">No Image</div>
                )}
            </div>

            {/* Navigation Arrows (Only show on hover and if multiple) */}
            {hasMultiple && (
                <>
                    {/* Left Arrow */}
                    {currentIndex > 0 && (
                        <button
                            onClick={handlePrev}
                            className="absolute left-4 p-2 rounded-full bg-white/90 text-gray-900 shadow-md hover:bg-white transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}

                    {/* Right Arrow */}
                    {currentIndex < imageList.length - 1 && (
                        <button
                            onClick={handleNext}
                            className="absolute right-4 p-2 rounded-full bg-white/90 text-gray-900 shadow-md hover:bg-white transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
                            aria-label="Next image"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    )}

                    {/* Dots Indicator */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                        {imageList.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); onChangeIndex(idx); }}
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex
                                        ? 'bg-white scale-110'
                                        : 'bg-white/50 hover:bg-white/80'
                                    }`}
                                aria-label={`Go to image ${idx + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
