import React from 'react'
import { cn } from '../../lib/utils'
import { Pin } from 'lucide-react'
import { formatMessageTime } from '../../utils/dateUtils'
import { EditedBadge } from './EditedBadge'
import { MessageStatusIcon } from './MessageStatusIcon'
import type { Message } from '../../types/messaging'

interface MessageStatusProps {
    message: Message
    isOwn: boolean
    isPinned?: boolean
    showReadAsDelivered: boolean
}

export const MessageStatus = React.memo(function MessageStatus({
    message,
    isOwn,
    isPinned,
    showReadAsDelivered
}: MessageStatusProps) {
    const { created_at, is_edited, _failed, _optimistic, type, status, viewer_has_reported } = message

    return (
        <div className={cn(
            "flex items-center justify-end gap-1 mt-0.5",
            isOwn ? "text-blue-100/80" : "text-gray-400"
        )}>
            {is_edited && (
                <EditedBadge
                    editedAt={message.edited_at || message.updated_at || ''}
                    isOwnMessage={isOwn}
                />
            )}

            {/* Pin Icon (if message is pinned) */}
            {isPinned && (
                <Pin className={cn(
                    "w-3 h-3 rotate-45",
                    isOwn ? "text-blue-200" : "text-gray-400"
                )} />
            )}

            <span className="text-[10px]">
                {formatMessageTime(created_at)}
            </span>

            {/* Reported Indicator */}
            {viewer_has_reported && (
                <span className="text-[10px] text-orange-600 font-medium ml-1">
                    Reported
                </span>
            )}

            {/* Message Status Icons (for own messages) */}
            {isOwn && (
                <span className="ml-0.5">
                    <MessageStatusIcon
                        status={_failed ? 'failed' : _optimistic ? 'sending' : (
                            status === 'read' && showReadAsDelivered
                                ? 'delivered'
                                : status || 'sent'
                        )}
                        className={cn(
                            "h-3 w-3",
                            isOwn ? "text-blue-100/80" : "text-gray-400"
                        )}
                    />
                </span>
            )}
        </div>
    )
})
