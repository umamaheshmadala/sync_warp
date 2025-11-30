import React from 'react'
import { Check } from 'lucide-react'
import { ConversationCard } from './ConversationCard'
import { cn } from '../../lib/utils'

interface Props {
  conversation: any
  isSelected: boolean
  isSelectionMode: boolean
  isActive?: boolean
  onToggleSelect: (id: string) => void
  onClick: () => void
}

export function SelectableConversationCard({
  conversation,
  isSelected,
  isSelectionMode,
  isActive,
  onToggleSelect,
  onClick
}: Props) {
  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault()
      e.stopPropagation()
      onToggleSelect(conversation.conversation_id)
    } else {
      onClick()
    }
  }

  return (
    <div
      className={cn(
        'relative transition-colors',
        isSelected && 'bg-blue-50'
      )}
      onClick={handleClick}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleSelect(conversation.conversation_id)
            }}
            className={cn(
              'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
              isSelected
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-gray-300 hover:border-blue-400'
            )}
            aria-label={isSelected ? 'Deselect conversation' : 'Select conversation'}
          >
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </button>
        </div>
      )}

      {/* Conversation Card */}
      <div className={cn(isSelectionMode && 'pl-10')}>
        <ConversationCard
          conversation={conversation}
          isActive={isActive}
          onClick={(e) => {
            if (!isSelectionMode) {
              onClick()
            } else {
              e?.preventDefault()
              e?.stopPropagation()
            }
          }}
          showActions={!isSelectionMode}
        />
      </div>
    </div>
  )
}
