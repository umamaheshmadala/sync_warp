import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Loader2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';
import type { ReactionUser } from '../../services/reactionService';

interface Props {
  emoji: string | null;
  users: ReactionUser[];
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  currentUserId?: string;
  onRemoveReaction?: () => void;
  position?: { x: number; y: number };
}

export function ReactionUserList({ 
  emoji, 
  users, 
  isOpen, 
  onClose, 
  isLoading, 
  currentUserId, 
  onRemoveReaction,
  position 
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position || { x: 0, y: 0 })

  // Smart positioning logic from MessageContextMenu
  useLayoutEffect(() => {
    if (!menuRef.current || !position) return
    
    const menu = menuRef.current
    const menuRect = menu.getBoundingClientRect()
    const menuWidth = menuRect.width
    const menuHeight = menuRect.height
    
    // Viewport dimensions with padding for safety
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const padding = 10
    
    let x = position.x
    let y = position.y
    
    // Check right edge overflow - flip to left if needed, or just push left
    // Simple clamp: if reaction is on right edge, menu should shift left
    if (x + menuWidth + padding > viewportWidth) {
      x = Math.max(padding, viewportWidth - menuWidth - padding)
    }
    
    // Check bottom edge overflow - flip to top
    if (y + menuHeight + padding > viewportHeight) {
      // Flip to above the anchor point (assuming anchor passed was bottom)
      // We don't know exact top of anchor from here, but we can guess or just push up
      y = Math.max(padding, viewportHeight - menuHeight - padding)
    }
    
    setAdjustedPosition({ x, y })
  }, [position, users.length]) // Re-calculate when users change (height changes)

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[60] pointer-events-none">
       {/* Transparent backdrop for click handling handled by document listener above */}
      <div 
        ref={menuRef}
        className="pointer-events-auto absolute bg-white rounded-xl shadow-xl border border-gray-100 min-w-[200px] max-w-[250px] animate-in fade-in zoom-in-95 duration-100 flex flex-col overflow-hidden"
        style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">{emoji}</span>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Reactions
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* List */}
        <div className="max-h-[200px] overflow-y-auto p-1">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-4 text-gray-400 text-xs">
              No reactions yet
            </div>
          ) : (
            <div className="space-y-0.5">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                return (
                  <div
                    key={user.id}
                    onClick={() => isCurrentUser && onRemoveReaction?.()}
                    className={cn(
                      "flex items-center gap-2.5 p-2 rounded-lg transition-colors",
                      isCurrentUser 
                        ? "cursor-pointer hover:bg-red-50 group select-none" 
                        : "hover:bg-gray-50"
                    )}
                    title={isCurrentUser ? "Click to remove" : undefined}
                  >
                    <Avatar className="h-8 w-8 border border-gray-100 flex-shrink-0">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback className={cn(
                        "text-[10px]",
                        isCurrentUser ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                      )}>
                        {user.username?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <span className={cn(
                          "font-medium text-sm truncate",
                          isCurrentUser ? "text-blue-600" : "text-gray-900"
                        )}>
                          {isCurrentUser ? "You" : (user.fullName || user.username)}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold text-gray-300 group-hover:text-red-500 uppercase tracking-wider transition-colors">
                            Remove
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
