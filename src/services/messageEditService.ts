// src/services/messageEditService.ts
// Service for editing messages with 15-minute time window
// Story: 8.5.2 - Edit Messages Implementation

import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Edit result with success/failure info
 */
export interface EditResult {
  success: boolean;
  message?: string;
}

/**
 * Edit history entry
 */
export interface EditHistoryEntry {
  id: string;
  messageId: string;
  oldContent: string;
  newContent: string;
  editedAt: string;
}

/**
 * Service for managing message edits with 15-minute time window
 * 
 * Features:
 * - 15-minute edit window after sending
 * - Edit history tracking
 * - "Edited" badge display
 * - Real-time edit sync
 * - Haptic feedback on mobile
 */
class MessageEditService {
  private readonly EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Check if a message can be edited
   * 
   * @param messageId - Message UUID
   * @returns Object with canEdit boolean and remaining time in ms
   */
  async canEdit(messageId: string): Promise<{ canEdit: boolean; remainingMs: number; reason?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { canEdit: false, remainingMs: 0, reason: 'Not authenticated' };
      }

      const { data: message, error } = await supabase
        .from('messages')
        .select('sender_id, created_at, is_deleted, is_edited')
        .eq('id', messageId)
        .single();

      if (error || !message) {
        return { canEdit: false, remainingMs: 0, reason: 'Message not found' };
      }

      // Must be the sender
      if (message.sender_id !== user.id) {
        return { canEdit: false, remainingMs: 0, reason: 'Not the sender' };
      }

      // Must not be deleted
      if (message.is_deleted) {
        return { canEdit: false, remainingMs: 0, reason: 'Message is deleted' };
      }

      // Check time window
      const messageAge = Date.now() - new Date(message.created_at).getTime();
      const remainingMs = Math.max(0, this.EDIT_WINDOW_MS - messageAge);

      return {
        canEdit: remainingMs > 0,
        remainingMs,
        reason: remainingMs <= 0 ? 'Edit window expired (15 minutes)' : undefined
      };
    } catch (error) {
      console.error('❌ Error checking edit eligibility:', error);
      return { canEdit: false, remainingMs: 0, reason: 'Error checking eligibility' };
    }
  }

  /**
   * Edit a message content
   * 
   * @param messageId - Message UUID
   * @param newContent - New message content
   * @returns EditResult with success status
   */
  async editMessage(messageId: string, newContent: string): Promise<EditResult> {
    try {
      // Validate new content
      if (!newContent.trim()) {
        return { success: false, message: 'Content cannot be empty' };
      }

      // Check if edit is allowed
      const { canEdit, reason } = await this.canEdit(messageId);
      if (!canEdit) {
        return { success: false, message: reason || 'Cannot edit this message' };
      }

      // Get current content for history
      const { data: currentMessage, error: fetchError } = await supabase
        .from('messages')
        .select('content')
        .eq('id', messageId)
        .single();

      if (fetchError) {
        return { success: false, message: 'Failed to fetch message' };
      }

      // Skip if content is the same
      if (currentMessage.content === newContent.trim()) {
        return { success: true, message: 'No changes made' };
      }

      // Store edit in history (if table exists)
      try {
        await supabase
          .from('message_edits')
          .insert({
            message_id: messageId,
            old_content: currentMessage.content,
            new_content: newContent.trim()
          });
      } catch (historyError) {
        // History table might not exist yet, continue without it
        console.warn('⚠️ Could not save edit history:', historyError);
      }

      // Update the message
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          content: newContent.trim(),
          is_edited: true,
          edited_at: new Date().toISOString()
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

      console.log(`✏️ Edited message ${messageId}`);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error editing message:', error);
      return { success: false, message: error.message || 'Failed to edit message' };
    }
  }

  /**
   * Get edit history for a message
   * Only the sender can view edit history
   * 
   * @param messageId - Message UUID
   * @returns Array of edit history entries
   */
  async getEditHistory(messageId: string): Promise<EditHistoryEntry[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Verify user is the sender
      const { data: message } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (message?.sender_id !== user.id) {
        return []; // Only sender can view history
      }

      const { data, error } = await supabase
        .from('message_edits')
        .select('*')
        .eq('message_id', messageId)
        .order('edited_at', { ascending: false });

      if (error) {
        console.warn('⚠️ Could not fetch edit history:', error);
        return [];
      }

      return (data || []).map((entry: any) => ({
        id: entry.id,
        messageId: entry.message_id,
        oldContent: entry.old_content,
        newContent: entry.new_content,
        editedAt: entry.edited_at || entry.created_at
      }));
    } catch (error) {
      console.error('❌ Error fetching edit history:', error);
      return [];
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
   * Get the edit window duration in milliseconds
   */
  get editWindowMs(): number {
    return this.EDIT_WINDOW_MS;
  }
}

// Export singleton instance
export const messageEditService = new MessageEditService();
