import React from 'react'
import { CornerDownRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Message } from '../../types/messaging'

interface QuotedMessageProps {
    message: Message
    isOwn: boolean
    onQuoteClick?: (messageId: string) => void
}

export const QuotedMessage = React.memo(function QuotedMessage({
    message,
    isOwn,
    onQuoteClick
}: QuotedMessageProps) {
    if (!message.parent_message) return null

    return (
        <button
            onClick={() => onQuoteClick?.(message.parent_message!.id)}
            className={cn(
                'flex items-start gap-2 p-2 rounded text-xs max-w-full',
                'border-l-2 hover:bg-gray-100 transition-colors text-left',
                isOwn
                    ? 'bg-blue-100 border-blue-400 self-end'
                    : 'bg-gray-100 border-gray-400 self-start'
            )}
        >
            <CornerDownRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-500" />
            <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-700 truncate">
                    {message.parent_message.sender_name}
                </div>
                <div className="text-gray-600 truncate">
                    {message.parent_message.type === 'text'
                        ? message.parent_message.content
                        : `[${message.parent_message.type}]`
                    }
                </div>
            </div>
        </button>
    )
})
