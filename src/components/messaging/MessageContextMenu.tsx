import React, { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { Reply, Copy, Forward, Star, Trash2, CheckSquare, Share2, Pencil, Pin, PinOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/messaging'
import { useShare } from '@/hooks/useShare'
import { QuickReactionBar } from './QuickReactionBar'
import { hapticService } from '../../services/hapticService'

interface MessageContextMenuProps {
  message: Message
  position: { x: number; y: number }
  isOwn: boolean
  onClose: () => void
  onReply: () => void
  onCopy: () => void
  onForward?: () => void
  onStar?: () => void
  onDeleteForMe?: () => void
  onDeleteForEveryone?: () => void
  canDeleteForEveryone?: boolean
  deleteRemainingTime?: string
  onSelect?: () => void
  onShare?: () => void
  onEdit?: () => void
  canEdit?: boolean
  editRemainingTime?: string
  onReact?: (emoji: string) => void
  onOpenPicker?: () => void
  userReactions?: string[]
  onPin?: () => void
  onUnpin?: () => void
  isPinned?: boolean
}

/**
 * MessageContextMenu Component
 * 
 * WhatsApp-style context menu with smart positioning:
 * - Opens down-right by default
 * - Flips up when near bottom edge
 * - Flips left when near right edge
 * - Compact design with reduced padding
 * - Integrated Emoji Reactions (Story 8.5.5)
 * 
 * Story: 8.10.5 - Reply/Quote Messages
 */
export function MessageContextMenu({
  message,
  position,
  isOwn,
  onClose,
  onReply,
  onCopy,
  onForward,
  onStar,
  onDeleteForMe,
  onDeleteForEveryone,
  canDeleteForEveryone = false,
  deleteRemainingTime = '',
  onSelect,
  onShare,
  onEdit,
  canEdit = false,
  editRemainingTime = '',
  onReact,
  onOpenPicker,
  userReactions = [],
  onPin,
  onUnpin,
  isPinned
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // Smart positioning: Calculate optimal position after menu renders
  useLayoutEffect(() => {
    if (!menuRef.current) return
    
    const menu = menuRef.current
    const menuRect = menu.getBoundingClientRect()
    const menuWidth = menuRect.width
    const menuHeight = menuRect.height
    
    // Viewport dimensions with padding for safety
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const padding = 10 // Minimum distance from edges
    const bottomReserved = 80 // Space for input field at bottom
    
    let x = position.x
    let y = position.y
    
    // Check right edge overflow - flip to left
    if (x + menuWidth + padding > viewportWidth) {
      x = Math.max(padding, position.x - menuWidth)
    }
    
    // Check bottom edge overflow - flip to top
    if (y + menuHeight + bottomReserved > viewportHeight) {
      y = Math.max(padding, position.y - menuHeight)
    }
    
    // Check left edge (in case we flipped)
    if (x < padding) {
      x = padding
    }
    
    // Check top edge (in case we flipped)
    if (y < padding) {
      y = padding
    }
    
    setAdjustedPosition({ x, y })
  }, [position])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleAction = (action: () => void) => {
    hapticService.trigger('selection')
    action()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Context Menu - Compact styling */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[280px] max-w-[320px] animate-in fade-in zoom-in-95 duration-100"
        style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
      >
        {/* Reactions Bar (Mobile/Touch) */}
        {onReact && (
          <div className="px-1 py-1 mb-1 border-b border-gray-100 flex justify-center">
            <QuickReactionBar 
              onReact={(emoji) => {
                onReact(emoji)
                onClose()
              }}
              userReactions={userReactions}
              className="shadow-none border-none bg-transparent"
              onOpenPicker={() => {
                onOpenPicker?.()
                onClose()
              }}
            />
          </div>
        )}

        {/* Reply */}
        <button
          onClick={() => handleAction(onReply)}
          className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
        >
          <Reply className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-800">Reply</span>
        </button>

        {/* Edit (only for own messages within edit window) */}
        {onEdit && canEdit && isOwn && (
          <button
            onClick={() => handleAction(onEdit)}
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
          >
            <Pencil className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-800">Edit</span>
            {editRemainingTime && (
              <span className="ml-auto text-[10px] text-gray-400">{editRemainingTime}</span>
            )}
          </button>
        )}

        {/* Copy */}
        <button
          onClick={() => handleAction(onCopy)}
          className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
        >
          <Copy className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-800">Copy</span>
        </button>

        {/* Pin/Unpin */}
        {onPin && !isPinned && (
          <button
            onClick={() => handleAction(onPin)}
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
          >
            <Pin className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-800">Pin</span>
          </button>
        )}

        {onUnpin && isPinned && (
          <button
            onClick={() => handleAction(onUnpin)}
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
          >
            <PinOff className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-800">Unpin</span>
          </button>
        )}

        {/* Share (for media and links) */}
        {onShare && (
          <button
            onClick={() => handleAction(onShare)}
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
          >
            <Share2 className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-800">Share</span>
          </button>
        )}

        {/* Forward (future feature) */}
        {onForward && (
          <button
            onClick={() => handleAction(onForward)}
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
          >
            <Forward className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-800">Forward</span>
          </button>
        )}

        {/* Star (future feature) */}
        {onStar && (
          <button
            onClick={() => handleAction(onStar)}
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
          >
            <Star className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-800">Star</span>
          </button>
        )}

        {/* Divider before delete options */}
        {(onDeleteForMe || onDeleteForEveryone || onSelect) && <div className="h-px bg-gray-100 my-0.5" />}

        {/* Delete for Me */}
        {onDeleteForMe && (
          <button
            onClick={() => {
              hapticService.trigger('warning')
              onDeleteForMe?.()
              onClose()
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
          >
            <Trash2 className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-800">Delete for me</span>
          </button>
        )}

        {/* Delete for Everyone (only for own messages within delete window) */}
        {onDeleteForEveryone && canDeleteForEveryone && isOwn && (
          <button
            onClick={() => {
              hapticService.trigger('warning')
              onDeleteForEveryone?.()
              onClose()
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-red-50 transition-colors text-left"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600">Delete for everyone</span>
            {deleteRemainingTime && (
              <span className="ml-auto text-[10px] text-red-400">{deleteRemainingTime}</span>
            )}
          </button>
        )}

        {/* Select (future feature - multi-select) */}
        {onSelect && (
          <button
            onClick={() => handleAction(onSelect)}
            className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
          >
            <CheckSquare className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-800">Select</span>
          </button>
        )}
      </div>
    </>
  )
}
