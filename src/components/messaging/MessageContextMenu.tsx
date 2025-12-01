import React, { useEffect, useRef } from 'react'
import { Reply, Copy, Forward, Star, Trash2, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/messaging'

interface MessageContextMenuProps {
  message: Message
  position: { x: number; y: number }
  isOwn: boolean
  onClose: () => void
  onReply: () => void
  onCopy: () => void
  onForward?: () => void
  onStar?: () => void
  onDelete?: () => void
  onSelect?: () => void
}

/**
 * MessageContextMenu Component
 * 
 * WhatsApp-style context menu for messages with:
 * - Reply, Copy, Forward, Star, Delete, Select options
 * - Right-click on web
 * - Long-press on mobile
 * - Auto-positioning to stay within viewport
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
  onDelete,
  onSelect
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

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
    action()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Context Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
        style={{ left: position.x, top: position.y }}
      >
        {/* Reply */}
        <button
          onClick={() => handleAction(onReply)}
          className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-100 transition-colors text-left"
        >
          <Reply className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-900">Reply</span>
        </button>

        {/* Copy */}
        <button
          onClick={() => handleAction(onCopy)}
          className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-100 transition-colors text-left"
        >
          <Copy className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-900">Copy</span>
        </button>

        {/* Forward (future feature) */}
        {onForward && (
          <button
            onClick={() => handleAction(onForward)}
            className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-100 transition-colors text-left"
          >
            <Forward className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-900">Forward</span>
          </button>
        )}

        {/* Star (future feature) */}
        {onStar && (
          <button
            onClick={() => handleAction(onStar)}
            className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-100 transition-colors text-left"
          >
            <Star className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-900">Star</span>
          </button>
        )}

        {/* Divider */}
        {(onDelete || onSelect) && <div className="h-px bg-gray-200 my-1" />}

        {/* Delete for me (only for own messages) */}
        {onDelete && isOwn && (
          <button
            onClick={() => handleAction(onDelete)}
            className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-red-50 transition-colors text-left"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-600">Delete for me</span>
          </button>
        )}

        {/* Select (future feature - multi-select) */}
        {onSelect && (
          <button
            onClick={() => handleAction(onSelect)}
            className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-100 transition-colors text-left"
          >
            <CheckSquare className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-900">Select</span>
          </button>
        )}
      </div>
    </>
  )
}
