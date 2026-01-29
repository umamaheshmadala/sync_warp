import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    MoreVertical,
    Edit2,
    PauseCircle,
    PlayCircle,
    Archive,
    Trash2,
    Files,
    XOctagon,
    Star,
    History
} from 'lucide-react';
import { Offer } from '../../types/offers';

export type OfferActionType =
    | 'edit'
    | 'pause'
    | 'resume'
    | 'archive'
    | 'delete'
    | 'duplicate'
    | 'terminate'
    | 'toggle_featured'
    | 'view_history'
    | 'view_details'
    | 'view_analytics';

interface OfferActionsMenuProps {
    offer: Offer;
    // The ONLY way to trigger actions now.
    onAction?: (action: OfferActionType, offer: Offer) => void;
    className?: string;
}

export const OfferActionsMenu: React.FC<OfferActionsMenuProps> = ({
    offer,
    onAction,
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top?: number; bottom?: number; left: number; isBottomAligned?: boolean }>({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Estimate menu height (Edit, Terminate, Archive, Feature, History, Delete ~ 6 items * 40px + padding)
            // Increased to 280 to be safe and avoid nav bar overlap
            const MENU_HEIGHT = 280;
            const MENU_WIDTH = 192; // w-48

            // Check if menu goes below viewport (considering bottom nav bar ~80px safety)
            // rect.bottom is distance from top of viewport to bottom of button
            const VIEWPORT_HEIGHT = window.innerHeight;
            const spaceBelow = VIEWPORT_HEIGHT - rect.bottom;

            // If space below is less than menu height (plus safety), align to bottom
            const alignBottom = spaceBelow < MENU_HEIGHT;

            if (alignBottom) {
                // Align the BOTTOM of the menu to the TOP of the button (-5px spacing)
                setMenuPosition({
                    top: undefined,
                    bottom: VIEWPORT_HEIGHT - rect.top + 5,
                    left: rect.right - MENU_WIDTH,
                    isBottomAligned: true
                } as any);
            } else {
                // Align TOP of menu to BOTTOM of button (+5px spacing)
                setMenuPosition({
                    top: rect.bottom + 5,
                    bottom: undefined,
                    left: rect.right - MENU_WIDTH,
                    isBottomAligned: false
                } as any);
            }
        }
        setIsOpen(!isOpen);
    };

    // Close on scroll or resize to prevent detached menu
    useEffect(() => {
        if (!isOpen) return;
        const handleScroll = () => setIsOpen(false);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    const performAction = (actionType: OfferActionType) => {
        setIsOpen(false);
        if (onAction) {
            onAction(actionType, offer);
        } else {
            console.warn(`Action ${actionType} triggered but no onAction handler provided.`);
        }
    };

    const { status } = offer;

    // Use portal to render menu outside of overflow hidden containers
    const menuContent = (
        <>
            <div
                className="fixed inset-0 z-[9998]"
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            />
            <div
                className={`fixed bg-white rounded-md shadow-lg z-[9999] border border-gray-100 py-1 overflow-hidden w-48 ${menuPosition.isBottomAligned ? 'origin-bottom-right' : 'origin-top-right'}`}
                style={{
                    top: menuPosition.top,
                    bottom: menuPosition.bottom,
                    left: menuPosition.left
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* EDIT */}
                {(status === 'draft' || status === 'active' || status === 'paused') && (
                    <button
                        onClick={(e) => { e.stopPropagation(); performAction('edit'); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                    </button>
                )}

                {/* DUPLICATE */}
                <button
                    onClick={(e) => { e.stopPropagation(); performAction('duplicate'); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                    <Files className="w-4 h-4 mr-2" />
                    Duplicate
                </button>

                <div className="border-t border-gray-100 my-1"></div>

                {/* PAUSE */}
                {status === 'active' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); performAction('pause'); }}
                        className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center"
                    >
                        <PauseCircle className="w-4 h-4 mr-2" />
                        Pause
                    </button>
                )}

                {/* RESUME */}
                {status === 'paused' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); performAction('resume'); }}
                        className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center"
                    >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Resume
                    </button>
                )}

                {/* TERMINATE */}
                {(status === 'active' || status === 'paused') && (
                    <button
                        onClick={(e) => { e.stopPropagation(); performAction('terminate'); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                        <XOctagon className="w-4 h-4 mr-2" />
                        Terminate
                    </button>
                )}

                {/* ARCHIVE */}
                {(status === 'active' || status === 'paused') && (
                    <button
                        onClick={(e) => { e.stopPropagation(); performAction('archive'); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center"
                    >
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                    </button>
                )}

                <div className="border-t border-gray-100 my-1"></div>

                {/* FEATURE: Active only */}
                {status === 'active' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); performAction('toggle_featured'); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                        <Star className={`w-4 h-4 mr-2 ${offer.is_featured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        {offer.is_featured ? 'Unfeature' : 'Feature Offer'}
                    </button>
                )}

                {/* HISTORY: All users/status */}
                <button
                    onClick={(e) => { e.stopPropagation(); performAction('view_history'); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                    <History className="w-4 h-4 mr-2" />
                    View History
                </button>

                <div className="border-t border-gray-100 my-1"></div>

                {/* DELETE */}
                <button
                    onClick={(e) => { e.stopPropagation(); performAction('delete'); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                </button>
            </div>
        </>
    );

    return (
        <div className={`relative ${className}`}>
            <button
                ref={buttonRef}
                onClick={toggleMenu}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors bg-white/80 backdrop-blur-sm shadow-sm"
                aria-label="Offer actions"
            >
                <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>

            {isOpen && createPortal(menuContent, document.body)}
        </div>
    );
};
