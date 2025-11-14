import React from 'react'

interface TypingIndicatorProps {
  userIds: string[]
}

/**
 * TypingIndicator Component
 * 
 * Displays an animated typing indicator when other users are typing.
 * Shows "typing..." text with animated dots.
 * 
 * @example
 * ```tsx
 * {isTyping && <TypingIndicator userIds={typingUserIds} />}
 * ```
 */
export function TypingIndicator({ userIds }: TypingIndicatorProps) {
  if (userIds.length === 0) return null

  return (
    <div className="px-4 py-2 text-sm text-gray-500 flex items-center gap-2">
      <span>
        {userIds.length === 1 
          ? 'Someone is typing' 
          : `${userIds.length} people are typing`}
      </span>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
