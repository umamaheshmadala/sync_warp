import React from 'react'
import { MessageSquare, Inbox, Search } from 'lucide-react'
import { Button } from '../ui/button'

interface EmptyStateProps {
  type: 'no-conversations' | 'no-messages' | 'no-search-results'
  onAction?: () => void
}

/**
 * EmptyState Component (Story 8.2.8)
 * 
 * Displays user-friendly empty states for various scenarios:
 * - No conversations: When user has no conversations yet
 * - No messages: When a conversation has no messages
 * - No search results: When search returns empty
 * 
 * Features:
 * - Accessibility: role="status" for screen readers
 * - Clear visual hierarchy with icon, title, description
 * - Optional action button
 * 
 * @example
 * ```tsx
 * <EmptyState 
 *   type="no-conversations" 
 *   onAction={() => navigate('/friends')} 
 * />
 * ```
 */
export function EmptyState({ type, onAction }: EmptyStateProps) {
  const states = {
    'no-conversations': {
      icon: MessageSquare,
      title: 'No conversations yet',
      description: 'Start chatting with your friends!',
      actionLabel: 'Browse Friends',
    },
    'no-messages': {
      icon: Inbox,
      title: 'No messages',
      description: 'Send your first message to start the conversation',
      actionLabel: null,
    },
    'no-search-results': {
      icon: Search,
      title: 'No conversations found',
      description: 'Try adjusting your search',
      actionLabel: null,
    },
  }

  const state = states[type]
  const Icon = state.icon

  return (
    <div 
      className="flex flex-col items-center justify-center h-full text-center px-4 py-8"
      role="status"
      aria-label={state.title}
    >
      <Icon 
        className="h-16 w-16 text-gray-300 mb-4" 
        aria-hidden="true" 
      />
      <h3 className="text-lg font-medium text-gray-700 mb-2">
        {state.title}
      </h3>
      <p className="text-sm text-gray-500 mb-4 max-w-sm">
        {state.description}
      </p>
      {state.actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label={state.actionLabel}
        >
          {state.actionLabel}
        </Button>
      )}
    </div>
  )
}
