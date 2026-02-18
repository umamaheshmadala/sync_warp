
import React, { useState, useEffect } from 'react'
import { parseDatabaseDate } from '../../utils/dateUtils'
import { format, isToday, isYesterday, isSameYear, differenceInCalendarDays } from 'date-fns'
import { Message } from '../../types/messaging'

interface FloatingDateBubbleProps {
    messages: Message[]
    scrollContainerRef: React.RefObject<HTMLDivElement>
}

export const FloatingDateBubble: React.FC<FloatingDateBubbleProps> = ({ messages, scrollContainerRef }) => {
    const [visibleDate, setVisibleDate] = useState<string | null>(null)
    const [opacity, setOpacity] = useState(0)

    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container || messages.length === 0) return

        let timeoutId: NodeJS.Timeout

        const handleScroll = () => {
            // Find the top-most visible message
            // We can approximate this by finding the first message element with top offset > container.scrollTop
            // Better yet, use elementFromPoint or loop through messages positions

            // Optimization: Only check messages that are likely to be in view?
            // Simple approach: Use elementFromPoint at the top of the container

            const containerRect = container.getBoundingClientRect()
            // Check point slightly below the top edge of container (e.g. 50px down) to get the message "entering" or currently at top
            const topMsgElement = document.elementFromPoint(
                containerRect.left + containerRect.width / 2,
                containerRect.top + 100 // Look a bit down to catch the message under the header area
            )

            const msgDiv = topMsgElement?.closest('[id^="message-"]')
            if (msgDiv && msgDiv.id) {
                const msgId = msgDiv.id.replace('message-', '')
                const msg = messages.find(m => m.id === msgId)

                if (msg) {
                    const date = parseDatabaseDate(msg.created_at)
                    if (date) {
                        const label = formatDateLabel(date)
                        setVisibleDate(label)
                        setOpacity(1)

                        // Fade out after scrolling stops? 
                        // WhatsApp keeps it visible while scrolling, then fades out?
                        // For now let's keep it visible, or fade out after 2s of no scroll?
                        clearTimeout(timeoutId)
                        timeoutId = setTimeout(() => {
                            setOpacity(0)
                        }, 2000)
                    }
                }
            }
        }

        container.addEventListener('scroll', handleScroll, { passive: true })

        // Initial check
        handleScroll()

        return () => {
            container.removeEventListener('scroll', handleScroll)
            clearTimeout(timeoutId)
        }
    }, [messages, scrollContainerRef])

    if (!visibleDate) return null

    return (
        <div
            className="absolute top-4 left-0 right-0 flex justify-center z-50 pointer-events-none transition-opacity duration-300"
            style={{ opacity }}
        >
            <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-white/90 backdrop-blur-md shadow-sm rounded-full border border-gray-100">
                {visibleDate}
            </span>
        </div>
    )
}

// Helper (duplicated from MessageList, should be utility)
const formatDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    const now = new Date()
    const diffInDays = differenceInCalendarDays(now, date)
    if (diffInDays < 7 && diffInDays > 0) return format(date, 'EEEE')
    if (isSameYear(date, now)) return format(date, 'MMMM d')
    return format(date, 'MMMM d, yyyy')
}
