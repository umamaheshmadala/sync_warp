// src/components/ui/PullToRefresh.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface PullToRefreshProps {
    children: React.ReactNode;
    onRefresh: () => Promise<void>;
    disabled?: boolean;
    threshold?: number;
    maxPull?: number;
    className?: string;
}

export function PullToRefresh({
    children,
    onRefresh,
    disabled = false,
    threshold = 80,
    maxPull = 120,
    className = '',
}: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const startYRef = useRef(0);
    const currentYRef = useRef(0);
    const isAtTopRef = useRef(true);
    const rafIdRef = useRef<number | null>(null);

    // Only enable on mobile/native platforms
    const isMobile = Capacitor.isNativePlatform() ||
        (typeof window !== 'undefined' && window.innerWidth < 768);

    const checkIfAtTop = useCallback(() => {
        const container = containerRef.current;
        if (!container) return true;

        // Find the scrollable parent (main element)
        const scrollableParent = container.closest('main') || container;
        return scrollableParent.scrollTop <= 0;
    }, []);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (disabled || isRefreshing || !isMobile) return;

        isAtTopRef.current = checkIfAtTop();
        if (!isAtTopRef.current) return;

        startYRef.current = e.touches[0].clientY;
        currentYRef.current = startYRef.current;
        setIsPulling(true);
    }, [disabled, isRefreshing, isMobile, checkIfAtTop]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (disabled || isRefreshing || !isPulling || !isMobile) return;
        if (!isAtTopRef.current) return;

        currentYRef.current = e.touches[0].clientY;
        const distance = currentYRef.current - startYRef.current;

        // Only pull down, not up
        if (distance <= 0) {
            setPullDistance(0);
            return;
        }

        // Apply resistance curve for natural feel
        const resistedDistance = Math.min(distance * 0.5, maxPull);

        // Cancel any pending animation frame
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
        }

        // Use requestAnimationFrame for smooth updates
        rafIdRef.current = requestAnimationFrame(() => {
            setPullDistance(resistedDistance);
        });

        // Prevent default scrolling when pulling
        if (distance > 10) {
            e.preventDefault();
        }
    }, [disabled, isRefreshing, isPulling, isMobile, maxPull]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling || !isMobile) return;

        setIsPulling(false);

        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(60); // Hold at spinner position

            try {
                await onRefresh();
            } catch (error) {
                console.error('Pull to refresh error:', error);
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            // Animate back to 0
            setPullDistance(0);
        }
    }, [isPulling, isMobile, pullDistance, threshold, isRefreshing, onRefresh]);

    // Add touch event listeners
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !isMobile) return;

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);

            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd, isMobile]);

    // Calculate indicator opacity and rotation
    const indicatorOpacity = Math.min(pullDistance / threshold, 1);
    const indicatorRotation = (pullDistance / threshold) * 180;
    const shouldShowSpinner = isRefreshing || pullDistance > 20;

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Pull indicator */}
            {isMobile && (
                <div
                    className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-50"
                    style={{
                        top: 0,
                        height: pullDistance,
                        opacity: indicatorOpacity,
                        transition: isPulling ? 'none' : 'all 0.3s ease-out',
                    }}
                >
                    {shouldShowSpinner && (
                        <div
                            className={`p-2 bg-white rounded-full shadow-lg ${isRefreshing ? 'animate-spin' : ''}`}
                            style={{
                                transform: isRefreshing ? 'none' : `rotate(${indicatorRotation}deg)`,
                                transition: isPulling ? 'none' : 'transform 0.3s ease-out',
                            }}
                        >
                            <RefreshCw
                                className={`w-6 h-6 ${pullDistance >= threshold ? 'text-indigo-600' : 'text-gray-500'}`}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Content container */}
            <div
                style={{
                    transform: isMobile ? `translateY(${pullDistance}px)` : 'none',
                    transition: isPulling ? 'none' : 'transform 0.3s ease-out',
                }}
            >
                {children}
            </div>
        </div>
    );
}
