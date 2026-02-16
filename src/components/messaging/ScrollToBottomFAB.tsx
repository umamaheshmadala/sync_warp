import React from 'react'
import { ArrowDown } from 'lucide-react'

interface ScrollToBottomFABProps {
    isVisible: boolean
    unreadCount: number
    onPress: () => void
}

export const ScrollToBottomFAB: React.FC<ScrollToBottomFABProps> = ({
    isVisible,
    unreadCount,
    onPress
}) => {
    if (!isVisible) return null

    return (
        <button
            onClick={onPress}
            className="fixed bottom-20 right-4 z-50 flex items-center justify-center w-10 h-10 bg-surface-500 text-white rounded-full shadow-lg active:scale-95 transition-all duration-200 animate-in fade-in zoom-in slide-in-from-bottom-4"
            style={{
                paddingBottom: 'env(safe-area-inset-bottom, 0px)' // Just in case, though bottom-20 usually clears it
            }}
            aria-label="Scroll to bottom"
        >
            <ArrowDown size={20} />

            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-primary-500 rounded-full shadow-sm animate-in zoom-in">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    )
}
