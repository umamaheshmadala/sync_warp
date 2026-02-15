import React from 'react'
import { X, CornerDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReplyContextProps {
  parentMessage: {
    id: string
    content: string
    sender_name: string
    type: string
    media_urls?: string[]
    thumbnail_url?: string
  }
  onCancel: () => void
  className?: string
}

/**
 * ReplyContext Component
 * 
 * Displays a preview of the message being replied to above the message composer.
 * Shows the sender name and message content with a cancel button.
 * 
 * Story: 8.10.5 - Reply/Quote Messages
 */
export function ReplyContext({ parentMessage, onCancel, className }: ReplyContextProps) {
  return (
    <div className={cn(
      'flex items-start gap-3 p-3 bg-blue-50 border-l-4 border-blue-600 rounded',
      className
    )}>
      <CornerDownRight className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-blue-600 mb-1">
          Replying to {parentMessage.sender_name}
        </div>
        <div className="flex items-center gap-2">
          {parentMessage.thumbnail_url || (parentMessage.type === 'image' && parentMessage.media_urls?.[0]) ? (
            <img
              src={parentMessage.thumbnail_url || parentMessage.media_urls![0]}
              alt="Reply thumbnail"
              className="w-8 h-8 rounded object-cover flex-shrink-0 bg-gray-200"
            />
          ) : parentMessage.type === 'video' && parentMessage.media_urls?.[0] ? (
            <video
              src={parentMessage.media_urls[0]}
              className="w-8 h-8 rounded object-cover flex-shrink-0 bg-gray-200"
            />
          ) : null}

          <div className="text-sm text-gray-700 truncate">
            {parentMessage.type === 'text'
              ? parentMessage.content
              : parentMessage.content || (parentMessage.type === 'image' ? 'Photo' : 'Video')
            }
          </div>
        </div>
      </div>

      <button
        onClick={onCancel}
        className="p-1 hover:bg-blue-100 rounded flex-shrink-0 transition-colors"
        aria-label="Cancel reply"
      >
        <X className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  )
}
