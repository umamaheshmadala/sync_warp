// src/components/messaging/DeleteConfirmationDialog.tsx
// Confirmation dialog for message deletion
// Story: 8.5.3 - Delete Messages Implementation

import React from 'react';
import { AlertTriangle, Clock, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDeleteForMe?: () => void;
  remainingTime: string;
  isDeleting: boolean;
  showDeleteForMe?: boolean;
}

/**
 * Confirmation dialog for deleting messages
 * 
 * Features:
 * - "Delete for Everyone" option (within time window)
 * - "Delete for Me" option (hides only for current user)
 * - Countdown timer display
 * - Loading state
 */
export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  onDeleteForMe,
  remainingTime,
  isDeleting,
  showDeleteForMe = true
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className={cn(
        'relative bg-white rounded-xl shadow-2xl',
        'w-full max-w-sm mx-4 p-6',
        'animate-in fade-in zoom-in-95 duration-200'
      )}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Message?
            </h3>
            <p className="text-sm text-gray-500">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Time remaining */}
        <div className="flex items-center gap-2 mb-6 px-3 py-2 bg-amber-50 rounded-lg">
          <Clock className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700">
            Delete window: <strong>{remainingTime}</strong>
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {/* Delete for Everyone */}
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'px-4 py-3 rounded-lg font-medium',
              'bg-red-500 text-white hover:bg-red-600',
              'transition-colors',
              isDeleting && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isDeleting ? (
              <>
                <span className="animate-spin">⏳</span>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete for Everyone
              </>
            )}
          </button>

          {/* Delete for Me */}
          {showDeleteForMe && onDeleteForMe && (
            <button
              onClick={onDeleteForMe}
              disabled={isDeleting}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'px-4 py-3 rounded-lg font-medium',
                'bg-gray-100 text-gray-700 hover:bg-gray-200',
                'transition-colors',
                isDeleting && 'opacity-50 cursor-not-allowed'
              )}
            >
              Delete for Me
            </button>
          )}

          {/* Cancel */}
          <button
            onClick={onClose}
            disabled={isDeleting}
            className={cn(
              'w-full px-4 py-2 rounded-lg font-medium',
              'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
              'transition-colors'
            )}
          >
            Cancel
          </button>
        </div>

        {/* Info text */}
        <p className="mt-4 text-xs text-gray-400 text-center">
          "Delete for Everyone" removes the message for both you and the recipient.
          "Delete for Me" only hides it from your view.
        </p>
      </div>
    </div>
  );
}
