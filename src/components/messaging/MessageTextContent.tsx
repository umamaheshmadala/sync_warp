import React, { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { ClickableUrl } from './ClickableUrl'
import { parseMessageContent } from '../../utils/urlUtils'
import type { Message } from '../../types/messaging'

interface MessageTextContentProps {
    message: Message
    isOwn: boolean
}

export const MessageTextContent = React.memo(function MessageTextContent({
    message,
    isOwn
}: MessageTextContentProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [needsReadMore, setNeedsReadMore] = useState(false)
    const textRef = useRef<HTMLParagraphElement>(null)

    const content = message.content || ''

    // Check text height on mount/content change
    useEffect(() => {
        if (message.type === 'text' && textRef.current) {
            // 140px is approx 7 lines of text (20px line-height)
            const MAX_COLLAPSED_HEIGHT = 140
            if (textRef.current.scrollHeight > MAX_COLLAPSED_HEIGHT) {
                setNeedsReadMore(true)
            } else {
                setNeedsReadMore(false)
            }
        }
    }, [content, message.type])

    return (
        <div className="relative">
            <p
                ref={textRef}
                className={cn(
                    "whitespace-pre-wrap break-words break-all transition-all duration-200",
                    !isExpanded && needsReadMore ? "line-clamp-7 max-h-[140px] overflow-hidden" : ""
                )}
            >
                {/* Parse content and render URLs as clickable links (AC-14 through AC-17) */}
                {parseMessageContent(content).map((segment, index) =>
                    segment.type === 'url' ? (
                        <ClickableUrl
                            key={`url-${index}`}
                            url={segment.fullUrl || segment.content}
                            isOwnMessage={isOwn}
                        />
                    ) : (
                        <React.Fragment key={`text-${index}`}>
                            {segment.content}
                        </React.Fragment>
                    )
                )}
            </p>

            {!isExpanded && needsReadMore && (
                <button
                    onClick={(e) => {
                        e.stopPropagation() // Prevent bubbling to message click
                        setIsExpanded(true)
                    }}
                    className={cn(
                        "mt-1 text-sm font-medium hover:underline focus:outline-none",
                        isOwn ? "text-blue-100 opacity-90" : "text-blue-600"
                    )}
                >
                    Read more
                </button>
            )}
        </div>
    )
})
