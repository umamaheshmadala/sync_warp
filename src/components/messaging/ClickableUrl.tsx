/**
 * ClickableUrl Component
 * 
 * Renders a truncated, clickable URL with:
 * - Truncated display for mobile-friendly viewing (AC-14)
 * - Copy link via context menu/long-press (AC-15)
 * - Smart navigation: in-app for internal, new tab for external (AC-16)
 * - Tooltip on hover showing full URL (AC-17)
 * - Deep link navigation to modals (AC-18)
 */

import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Copy, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';
import { truncateUrl, isInternalLink, getInternalPath } from '../../utils/urlUtils';
import { useLongPress } from '../../hooks/useLongPress';
import { hapticService } from '../../services/hapticService';
import { useDeepLinkStore, parseDeepLink } from '../../store/deepLinkStore';

interface ClickableUrlProps {
    url: string;
    displayText?: string; // Optional custom display text (otherwise uses truncated URL)
    className?: string;
    isOwnMessage?: boolean;
    maxLength?: number;
}

export function ClickableUrl({
    url,
    displayText,
    className,
    isOwnMessage = false,
    maxLength = 45,
}: ClickableUrlProps) {
    const navigate = useNavigate();
    const linkRef = useRef<HTMLAnchorElement>(null);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

    // Deep link store for opening modals
    const { openOffer, openProfile, openProduct } = useDeepLinkStore();

    // Truncated display text
    const truncatedDisplay = displayText || truncateUrl(url, maxLength);
    const isInternal = isInternalLink(url);

    // Handle click - smart navigation with deep link support (AC-18)
    const handleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent message bubble click

        if (isInternal) {
            // Try to parse as deep link for modal navigation
            const deepLink = parseDeepLink(url);

            if (deepLink) {
                switch (deepLink.type) {
                    case 'offer':
                        // Open offer modal
                        openOffer(deepLink.entityId);
                        return;
                    case 'profile':
                        // Open friend profile modal
                        openProfile(deepLink.entityId);
                        return;
                    case 'product':
                        // Open product modal
                        if (deepLink.businessId) {
                            openProduct(deepLink.entityId, deepLink.businessId);
                            return;
                        }
                        break;
                    case 'business':
                        // Navigate to business page (storefront)
                        navigate(`/business/${deepLink.entityId}`);
                        return;
                }
            }

            // Fallback: Navigate within app using React Router
            const path = getInternalPath(url);
            navigate(path);
        } else {
            // Open external link in new tab
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }, [url, isInternal, navigate, openOffer, openProfile, openProduct]);

    // Handle context menu (right-click on desktop)
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const x = Math.min(e.clientX, window.innerWidth - 180);
        const y = Math.min(e.clientY, window.innerHeight - 100);

        setMenuPosition({ x, y });
        setShowContextMenu(true);
        hapticService.trigger('medium');
    }, []);

    // Long press handler for mobile
    const onLongPress = useCallback(() => {
        if (!linkRef.current) return;

        const rect = linkRef.current.getBoundingClientRect();
        const x = Math.min(rect.left, window.innerWidth - 180);
        const y = Math.min(rect.bottom + 5, window.innerHeight - 100);

        setMenuPosition({ x, y });
        setShowContextMenu(true);
        hapticService.trigger('medium');
    }, []);

    // Long press hook bindings
    const {
        onMouseDown,
        onMouseUp,
        onMouseLeave,
        onTouchStart,
        onTouchEnd,
        onTouchMove,
    } = useLongPress({ onLongPress, threshold: 500 });

    // Copy link to clipboard
    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Link copied to clipboard', { icon: '📋' });
        } catch (error) {
            console.error('Failed to copy link:', error);
            toast.error('Failed to copy link');
        }
        setShowContextMenu(false);
    }, [url]);

    // Open in new tab (from context menu)
    const handleOpenInNewTab = useCallback(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
        setShowContextMenu(false);
    }, [url]);

    // Close context menu when clicking outside
    React.useEffect(() => {
        if (!showContextMenu) return;

        const handleClickOutside = () => setShowContextMenu(false);
        const handleScroll = () => setShowContextMenu(false);

        document.addEventListener('click', handleClickOutside);
        document.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('scroll', handleScroll, true);
        };
    }, [showContextMenu]);

    return (
        <>
            <a
                ref={linkRef}
                href={url}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseLeave}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onTouchMove={onTouchMove}
                title={url} // Native tooltip shows full URL on hover (AC-17)
                className={cn(
                    "inline underline underline-offset-2 cursor-pointer break-all",
                    "hover:opacity-80 transition-opacity",
                    isOwnMessage
                        ? "text-blue-100 decoration-blue-200/60"
                        : "text-blue-600 decoration-blue-400/60",
                    className
                )}
                // Prevent default link behavior, we handle navigation ourselves
                target="_blank"
                rel="noopener noreferrer"
            >
                {truncatedDisplay}
                {!isInternal && (
                    <ExternalLink className="inline-block w-3 h-3 ml-0.5 opacity-60" />
                )}
            </a>

            {/* Context Menu Portal */}
            {showContextMenu && createPortal(
                <div
                    className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] animate-in fade-in-0 zoom-in-95 duration-150"
                    style={{ left: menuPosition.x, top: menuPosition.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <Copy className="w-4 h-4" />
                        Copy Link
                    </button>
                    <button
                        onClick={handleOpenInNewTab}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Open in New Tab
                    </button>
                </div>,
                document.body
            )}
        </>
    );
}

export default ClickableUrl;
