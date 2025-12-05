// src/services/messageDeleteService.ts
// Service for deleting messages with 15-minute time window
// Story: 8.5.3 - Delete Messages Implementation

import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType } from '@capacitor/haptics';

/**
 * Delete result with success/failure info
 */
export interface DeleteResult {
  success: boolean;
  message?: string;
}

/**
 * Service for managing message deletion with 15-minute time window
 * 
 * Features:
 * - 15-minute delete window after sending
 * - Soft delete (marks as deleted, doesn't remove)
 * - "Delete for everyone" functionality
 * - Undo within grace period (5 seconds)
 * - Haptic feedback on mobile
 */
class MessageDeleteService {
  private readonly DELETE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly UNDO_GRACE_PERIOD_MS = 5000; // 5 seconds

  /**
   * Check if a message can be deleted
   * 
   * @param messageId - Message UUID
   * @returns Object with canDelete boolean and remaining time in ms
   */
  async canDelete(messageId: string): Promise<{ canDelete: boolean; remainingMs: number; reason?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { canDelete: false, remainingMs: 0, reason: 'Not authenticated' };
      }

      const { data: message, error } = await supabase
        .from('messages')
        .select('sender_id, created_at, is_deleted')
        .eq('id', messageId)
        .single();

      if (error || !message) {
        return { canDelete: false, remainingMs: 0, reason: 'Message not found' };
      }

      // Must be the sender
      if (message.sender_id !== user.id) {
        return { canDelete: false, remainingMs: 0, reason: 'Not the sender' };
      }

      // Must not already be deleted
      if (message.is_deleted) {
        return { canDelete: false, remainingMs: 0, reason: 'Already deleted' };
      }

      // Check time window
      const messageAge = Date.now() - new Date(message.created_at).getTime();
      const remainingMs = Math.max(0, this.DELETE_WINDOW_MS - messageAge);

      return {
        canDelete: remainingMs > 0,
        remainingMs,
        reason: remainingMs <= 0 ? 'Delete window expired (15 minutes)' : undefined
      };
    } catch (error) {
      console.error('❌ Error checking delete eligibility:', error);
      return { canDelete: false, remainingMs: 0, reason: 'Error checking eligibility' };
    }
  }

  /**
   * Soft delete a message
   * Sets is_deleted=true and deleted_at timestamp
   * 
   * @param messageId - Message UUID
   * @returns DeleteResult with success status
   */
  async deleteMessage(messageId: string): Promise<DeleteResult> {
    try {
      // Check if delete is allowed
      const { canDelete, reason } = await this.canDelete(messageId);
      if (!canDelete) {
        return { success: false, message: reason || 'Cannot delete this message' };
      }

      const deletedAt = new Date().toISOString();

      // Soft delete the message
      const { error } = await supabase
        .from('messages')
        .update({
          is_deleted: true,
          deleted_at: deletedAt
        })
        .eq('id', messageId);

      if (error) {
        return { success: false, message: error.message };
      }

      // Haptic feedback on mobile
      if (Capacitor.isNativePlatform()) {
        try {
          await Haptics.notification({ type: NotificationType.Warning });
        } catch (e) {
          // Ignore haptic errors
        }
      }

      console.log(`🗑️ Deleted message ${messageId}`);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error deleting message:', error);
      return { success: false, message: error.message || 'Failed to delete message' };
    }
  }

  /**
   * Undo a message deletion
   * Only works within the grace period (5 seconds by default)
   * 
   * @param messageId - Message UUID
   * @param gracePeriodMs - Custom grace period (default: 5000ms)
   * @returns DeleteResult with success status
   */
  async undoDelete(messageId: string, gracePeriodMs?: number): Promise<DeleteResult> {
    const graceMs = gracePeriodMs ?? this.UNDO_GRACE_PERIOD_MS;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, message: 'Not authenticated' };
      }

      // Get message to verify ownership and deletion time
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('sender_id, is_deleted, deleted_at')
        .eq('id', messageId)
        .single();

      if (fetchError || !message) {
        return { success: false, message: 'Message not found' };
      }

      // Verify ownership
      if (message.sender_id !== user.id) {
        return { success: false, message: 'Not the sender' };
      }

      // Check if message is deleted
      if (!message.is_deleted || !message.deleted_at) {
        return { success: false, message: 'Message not deleted' };
      }

      // Check grace period
      const deletedAge = Date.now() - new Date(message.deleted_at).getTime();
      if (deletedAge > graceMs) {
        return { success: false, message: 'Undo grace period expired' };
      }

      // Restore the message
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          is_deleted: false,
          deleted_at: null
        })
        .eq('id', messageId);

      if (updateError) {
        return { success: false, message: updateError.message };
      }

      // Haptic feedback on mobile
      if (Capacitor.isNativePlatform()) {
        try {
          await Haptics.notification({ type: NotificationType.Success });
        } catch (e) {
          // Ignore haptic errors
        }
      }

      console.log(`↩️ Restored message ${messageId}`);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error restoring message:', error);
      return { success: false, message: error.message || 'Failed to restore message' };
    }
  }

  /**
   * Format remaining time as human-readable string
   * 
   * @param ms - Time in milliseconds
   * @returns Formatted string like "14m 30s"
   */
  formatRemainingTime(ms: number): string {
    if (ms <= 0) return 'Expired';
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Get the delete window duration in milliseconds
   */
  get deleteWindowMs(): number {
    return this.DELETE_WINDOW_MS;
  }

  /**
   * Get the undo grace period in milliseconds
   */
  get undoGracePeriodMs(): number {
    return this.UNDO_GRACE_PERIOD_MS;
  }
}

// Export singleton instance
export const messageDeleteService = new MessageDeleteService();
