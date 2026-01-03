import React from 'react'

interface TypingIndicatorProps {
  userIds: string[]
  names?: string[] // Optional names corresponding to userIds
}

/**
 * TypingIndicator Component
 * 
 * Displays an animated typing indicator when other users are typing.
 * Shows "Name is typing..." or "X people are typing..."
 * 
 * @example
 * ```tsx
 * {isTyping && <TypingIndicator userIds={typingUserIds} names={['John']} />}
 * ```
 */
export function TypingIndicator({ userIds, names = [] }: TypingIndicatorProps) {
  // Debug log
  console.log('TypingIndicator render:', { userIds, names })

  if (userIds.length === 0) return null

  const getText = () => {
    if (userIds.length === 1) {
      // Logic: Use name if available, otherwise 'Someone'.
      // Note: names[0] should exist if passed from ChatScreen, but we guard against it.
      const name = names[0] || 'Someone'
      return `${name} is typing`
    }
    if (userIds.length === 2 && names.length === 2) {
      return `${names[0]} and ${names[1]} are typing`
    }
    return `${userIds.length} people are typing`
  }

  return (
    <div className="px-4 py-2 text-sm text-gray-500 flex items-center gap-2">
      <span className="font-medium text-gray-600">
        {getText()}
      </span>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
