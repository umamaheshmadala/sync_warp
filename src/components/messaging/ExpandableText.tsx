import React, { useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'

interface ExpandableTextProps {
    content: string
    limit?: number
    className?: string
    isOwn?: boolean
}

export function ExpandableText({
    content,
    limit = 40,
    className,
    isOwn = false
}: ExpandableTextProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    if (content.length <= limit) {
        return <p className={cn("whitespace-pre-wrap break-words", className)}>{content}</p>
    }

    const displayedContent = isExpanded ? content : content.slice(0, limit) + '...'

    return (
        <div className={cn("flex flex-col items-start gap-1", className)}>
            <p className="whitespace-pre-wrap break-words w-full">
                {displayedContent}
            </p>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(!isExpanded)
                }}
                className={cn(
                    "text-xs font-medium hover:underline focus:outline-none mt-1",
                    isOwn ? "text-blue-100 hover:text-white" : "text-blue-600 hover:text-blue-700"
                )}
            >
                {isExpanded ? 'Read less' : 'Read more'}
            </button>
        </div>
    )
}
