import React, { useState } from 'react';

interface ProductCardImageProps {
    src: string;
    alt: string;
    isSoldOut?: boolean;
}

export const ProductCardImage: React.FC<ProductCardImageProps> = ({ src, alt, isSoldOut }) => {
    const [hasError, setHasError] = useState(false);

    return (
        <div className="relative aspect-[4/5] bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
            {hasError ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                    <span className="text-xs">No Image</span>
                </div>
            ) : (
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    onError={() => setHasError(true)}
                    loading="lazy"
                />
            )}

            {/* Sold Out Overlay */}
            {isSoldOut && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 transition-opacity">
                    <span className="bg-white/90 text-gray-800 px-3 py-1.5 rounded text-xs font-bold tracking-wider uppercase shadow-sm">
                        Sold Out
                    </span>
                </div>
            )}
        </div>
    );
};
