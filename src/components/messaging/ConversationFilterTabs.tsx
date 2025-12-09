import React from 'react'
import { cn } from '../../lib/utils'
import type { ConversationFilter } from '../../services/conversationManagementService'

interface Props {
  activeFilter: ConversationFilter
  onFilterChange: (filter: ConversationFilter) => void
  counts: {
    all: number
    unread: number
    archived: number
    pinned: number
  }
}

export function ConversationFilterTabs({ activeFilter, onFilterChange, counts }: Props) {
  const tabs: Array<{ key: ConversationFilter; label: string; count: number; showBadge: boolean }> = [
    { key: 'all', label: 'Inbox', count: counts.all, showBadge: false },
    { key: 'unread', label: 'Unread', count: counts.unread, showBadge: true },
    { key: 'pinned', label: 'Pinned', count: counts.pinned, showBadge: false },
    { key: 'archived', label: 'Archived', count: counts.archived, showBadge: false },
  ]

  return (
    <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onFilterChange(tab.key)}
          className={cn(
            'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
            activeFilter === tab.key
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
          aria-label={`${tab.label} conversations`}
          aria-current={activeFilter === tab.key ? 'page' : undefined}
        >
          <span>{tab.label}</span>
          {tab.showBadge && tab.count > 0 && (
            <span
              className={cn(
                'ml-2 px-2 py-0.5 rounded-full text-xs font-semibold',
                activeFilter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              )}
              aria-label={`${tab.count} ${tab.label.toLowerCase()} conversations`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
