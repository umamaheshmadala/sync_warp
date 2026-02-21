import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/skeleton';

interface MediaPlaceholderProps {
    width?: number | null;
    height?: number | null;
    thumbnailUrl?: string | null;
    className?: string;
    children: React.ReactNode;
    isLoading?: boolean;
    aspectRatio?: number; // Optional override
    maxWidth?: number;    // Optional override
    alt?: string;
}

/**
 * MediaPlaceholder Component (Story 8.12.5)
 * 
 * Reserves space for media content based on known dimensions
 * to prevent layout shifts (CLS) during loading.
 * 
 * Logic:
 * 1. If width/height provided, calculate aspect ratio.
 * 2. If unknown dimensions, use a 280×200 (≈4:3) fallback (AC#4).
 * 3. Show a skeleton or blurred thumbnail while real media loads.
 * 4. Once loaded, blur → clear transition (~300ms) (AC#5).
 */
export const MediaPlaceholder: React.FC<MediaPlaceholderProps> = ({
    width,
    height,
    thumbnailUrl,
    className,
    children,
    isLoading = true,
    aspectRatio: overrideAspectRatio,
    maxWidth = 300,
    alt = "Media content"
}) => {
    const [imageLoaded, setImageLoaded] = useState(!isLoading);

    // Sync with parent's isLoading prop
    useEffect(() => {
        if (!isLoading) {
            setImageLoaded(true);
        }
    }, [isLoading]);

    // Calculate aspect ratio
    // If dimensions known → exact ratio. If unknown → 280/200 ≈ 1.4 (AC#4 default)
    const hasDimensions = !!(width && height) || !!overrideAspectRatio;
    const DEFAULT_FALLBACK_RATIO = 280 / 200; // ≈4:3 per AC#4
    const ratio = overrideAspectRatio || (width && height ? width / height : DEFAULT_FALLBACK_RATIO);

    // Inline styles to enforce aspect ratio and constrain size
    const style: React.CSSProperties = {
        aspectRatio: `${ratio}`,
        maxWidth: `${maxWidth}px`,
        width: '100%',
        position: 'relative',
        overflow: 'hidden'
    };

    return (
        <div
            className={cn(
                "relative rounded-lg overflow-hidden bg-gray-100",
                className
            )}
            style={style}
        >
            {/* 1. Placeholder / Thumbnail Layer (AC#5 blur-to-clear) */}
            <div
                className={cn(
                    "absolute inset-0 z-10 w-full h-full flex items-center justify-center bg-gray-200",
                    "transition-all duration-300 ease-out",
                    imageLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
                )}
            >
                {thumbnailUrl ? (
                    <img loading="lazy" decoding="async" 
                        src={thumbnailUrl}
                        alt={alt}
                        className={cn(
                            "w-full h-full object-cover scale-105",
                            "transition-[filter] duration-300 ease-out",
                            imageLoaded ? "blur-0" : "blur-[12px]"
                        )}
                    />
                ) : (
                    <Skeleton className="w-full h-full" />
                )}
            </div>

            {/* 2. Real Content Layer — fades in as loaded */}
            <div
                className={cn(
                    "w-full h-full transition-opacity duration-300",
                    isLoading ? "opacity-0" : "opacity-100"
                )}
            >
                {children}
            </div>
        </div>
    );
};
