// src/hooks/useEditMessage.ts
// Hook for managing message editing with countdown timer
// Story: 8.5.2 - Edit Messages Implementation

import { useState, useEffect, useCallback, useRef } from 'react';
import { messageEditService, EditResult, EditHistoryEntry } from '../services/messageEditService';
import { toast } from 'react-hot-toast';

interface UseEditMessageReturn {
  /** Whether the message can be edited */
  canEdit: boolean;
  /** Remaining time in human-readable format */
  remainingTime: string;
  /** Remaining time in milliseconds */
  remainingMs: number;
  /** Whether currently in edit mode */
  isEditing: boolean;
  /** Set edit mode */
  setIsEditing: (editing: boolean) => void;
  /** Current edited content */
  editedContent: string;
  /** Set edited content */
  setEditedContent: (content: string) => void;
  /** Save the edit */
  saveEdit: () => Promise<boolean>;
  /** Cancel editing */
  cancelEdit: () => void;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Get edit history (sender only) */
  getEditHistory: () => Promise<EditHistoryEntry[]>;
}

/**
 * Hook for managing message editing with real-time countdown
 * 
 * @param messageId - Message to manage editing for
 * @param originalContent - Original message content
 * @returns Methods and state for edit management
 * 
 * @example
 * ```tsx
 * const { canEdit, remainingTime, isEditing, setIsEditing, saveEdit } = useEditMessage(messageId, content);
 * 
 * if (canEdit && isOwn) {
 *   return <button onClick={() => setIsEditing(true)}>Edit ({remainingTime})</button>
 * }
 * ```
 */
export function useEditMessage(
  messageId: string,
  originalContent: string
): UseEditMessageReturn {
  const [canEdit, setCanEdit] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(originalContent);
  const [isSaving, setIsSaving] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout>();

  // Check edit eligibility and update countdown
  useEffect(() => {
    const checkEditability = async () => {
      const result = await messageEditService.canEdit(messageId);
      setCanEdit(result.canEdit);
      setRemainingMs(result.remainingMs);
    };

    // Initial check
    checkEditability();

    // Update every second if within window
    timerRef.current = setInterval(checkEditability, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [messageId]);

  // Reset edited content when original changes or edit mode changes
  useEffect(() => {
    if (!isEditing) {
      setEditedContent(originalContent);
    }
  }, [originalContent, isEditing]);

  // Format remaining time
  const remainingTime = messageEditService.formatRemainingTime(remainingMs);

  // Save the edit
  const saveEdit = useCallback(async (): Promise<boolean> => {
    if (!editedContent.trim()) {
      toast.error('Message cannot be empty');
      return false;
    }

    if (editedContent.trim() === originalContent) {
      setIsEditing(false);
      return true;
    }

    setIsSaving(true);
    try {
      const result = await messageEditService.editMessage(messageId, editedContent);
      
      if (result.success) {
        toast.success('Message edited');
        setIsEditing(false);
        return true;
      } else {
        toast.error(result.message || 'Failed to edit');
        return false;
      }
    } catch (error) {
      toast.error('Failed to edit message');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [messageId, editedContent, originalContent]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditedContent(originalContent);
    setIsEditing(false);
  }, [originalContent]);

  // Get edit history
  const getEditHistory = useCallback(async (): Promise<EditHistoryEntry[]> => {
    return messageEditService.getEditHistory(messageId);
  }, [messageId]);

  return {
    canEdit,
    remainingTime,
    remainingMs,
    isEditing,
    setIsEditing,
    editedContent,
    setEditedContent,
    saveEdit,
    cancelEdit,
    isSaving,
    getEditHistory
  };
}
