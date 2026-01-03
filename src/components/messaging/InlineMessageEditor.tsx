// src/components/messaging/InlineMessageEditor.tsx
// Inline editor for editing messages
// Story: 8.5.2 - Edit Messages Implementation

import React, { useRef, useEffect } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  remainingTime: string;
  isSaving: boolean;
  className?: string;
}

/**
 * Inline editor component for editing messages
 * 
 * Features:
 * - Auto-expanding textarea
 * - Countdown timer display
 * - Save/Cancel buttons
 * - Keyboard shortcuts (Enter to save, Escape to cancel)
 */
export function InlineMessageEditor({
  content,
  onChange,
  onSave,
  onCancel,
  remainingTime,
  isSaving,
  className
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(content.length, content.length);
    }
  }, []);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className={cn(
          'w-full px-3 py-2 text-sm rounded-lg',
          'border-2 border-blue-400 bg-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          'resize-none overflow-hidden',
          'min-h-[38px] max-h-[200px]',
          isSaving && 'opacity-50 cursor-not-allowed'
        )}
        placeholder="Edit your message..."
      />

      {/* Action bar */}
      <div className="flex items-center justify-between gap-2">
        {/* Countdown timer */}
        <div className="flex items-center gap-1 text-xs text-amber-600">
          <Clock className="w-3 h-3" />
          <span>{remainingTime}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs',
              'text-gray-600 hover:bg-gray-100',
              'transition-colors',
              isSaving && 'opacity-50 cursor-not-allowed'
            )}
            title="Cancel (Esc)"
          >
            <X className="w-3 h-3" />
            <span className="hidden sm:inline">Cancel</span>
          </button>

          <button
            onClick={onSave}
            disabled={isSaving || !content.trim()}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded text-xs',
              'bg-blue-500 text-white hover:bg-blue-600',
              'transition-colors',
              (isSaving || !content.trim()) && 'opacity-50 cursor-not-allowed'
            )}
            title="Save (Enter)"
          >
            {isSaving ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-gray-400">
        Press Enter to save, Escape to cancel
      </p>
    </div>
  );
}
