// src/hooks/useDeleteMessage.ts
// Hook for managing message deletion with undo functionality
// Story: 8.5.3 - Delete Messages Implementation

import { useState, useEffect, useCallback, useRef } from 'react';
import { messageDeleteService, DeleteResult } from '../services/messageDeleteService';
import { toast } from 'react-hot-toast';

interface UseDeleteMessageReturn {
  /** Whether the message can be deleted */
  canDelete: boolean;
  /** Remaining time in human-readable format */
  remainingTime: string;
  /** Remaining time in milliseconds */
  remainingMs: number;
  /** Whether delete confirmation dialog is shown */
  showConfirmDialog: boolean;
  /** Set confirm dialog visibility */
  setShowConfirmDialog: (show: boolean) => void;
  /** Whether delete is in progress */
  isDeleting: boolean;
  /** Confirm and execute the deletion */
  confirmDelete: () => Promise<boolean>;
  /** Undo the last deletion */
  undoDelete: () => Promise<boolean>;
}

/**
 * Hook for managing message deletion with real-time countdown and undo
 * 
 * @param messageId - Message to manage deletion for
 * @returns Methods and state for delete management
 * 
 * @example
 * ```tsx
 * const { canDelete, remainingTime, confirmDelete, undoDelete } = useDeleteMessage(messageId);
 * 
 * if (canDelete && isOwn) {
 *   return <button onClick={() => setShowConfirmDialog(true)}>Delete ({remainingTime})</button>
 * }
 * ```
 */
export function useDeleteMessage(messageId: string): UseDeleteMessageReturn {
  const [canDelete, setCanDelete] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const undoToastIdRef = useRef<string>();

  // Check delete eligibility and update countdown
  useEffect(() => {
    const checkDeletability = async () => {
      const result = await messageDeleteService.canDelete(messageId);
      setCanDelete(result.canDelete);
      setRemainingMs(result.remainingMs);
    };

    // Initial check
    checkDeletability();

    // Update every second if within window
    timerRef.current = setInterval(checkDeletability, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [messageId]);

  // Format remaining time
  const remainingTime = messageDeleteService.formatRemainingTime(remainingMs);

  // Confirm and execute deletion
  const confirmDelete = useCallback(async (): Promise<boolean> => {
    setIsDeleting(true);
    try {
      const result = await messageDeleteService.deleteMessage(messageId);
      
      if (result.success) {
        setShowConfirmDialog(false);
        
        // Show undo toast
        undoToastIdRef.current = toast(
          (t) => (
            <div className="flex items-center gap-3">
              <span>Message deleted</span>
              <button
                onClick={async () => {
                  toast.dismiss(t.id);
                  const undoResult = await messageDeleteService.undoDelete(messageId);
                  if (undoResult.success) {
                    toast.success('Message restored');
                  } else {
                    toast.error(undoResult.message || 'Could not restore');
                  }
                }}
                className="text-blue-500 underline text-sm font-medium"
              >
                Undo
              </button>
            </div>
          ),
          { 
            duration: 5000,
            icon: '🗑️'
          }
        );
        
        return true;
      } else {
        toast.error(result.message || 'Failed to delete');
        return false;
      }
    } catch (error) {
      toast.error('Failed to delete message');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [messageId]);

  // Undo deletion
  const undoDelete = useCallback(async (): Promise<boolean> => {
    // Dismiss the undo toast if it exists
    if (undoToastIdRef.current) {
      toast.dismiss(undoToastIdRef.current);
    }

    const result = await messageDeleteService.undoDelete(messageId);
    
    if (result.success) {
      toast.success('Message restored');
      return true;
    } else {
      toast.error(result.message || 'Could not restore');
      return false;
    }
  }, [messageId]);

  return {
    canDelete,
    remainingTime,
    remainingMs,
    showConfirmDialog,
    setShowConfirmDialog,
    isDeleting,
    confirmDelete,
    undoDelete
  };
}
