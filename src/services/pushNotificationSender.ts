// src/services/pushNotificationSender.ts
// Service to trigger push notifications when sending messages

import { supabase } from '../lib/supabase';

interface SendPushParams {
  conversationId: string;
  senderId: string;
  content: string;
  messageType: string;
}

/**
 * Trigger push notifications to other participants in a conversation
 * Called after successfully sending a message
 */
export async function triggerPushNotification(params: SendPushParams): Promise<void> {
  const { conversationId, senderId, content, messageType } = params;

  try {
    // Get other participants in the conversation
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', senderId)
      .is('left_at', null);

    if (participantsError) {
      console.error('[PushNotification] Error fetching participants:', participantsError);
      return;
    }

    if (!participants || participants.length === 0) {
      console.log('[PushNotification] No other participants to notify');
      return;
    }

    // Get sender's name
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', senderId)
      .single();

    const senderName = senderProfile?.full_name || senderProfile?.email || 'Someone';

    // Create message preview
    let messagePreview = content;
    if (messageType === 'image') {
      messagePreview = '📷 Sent a photo';
    } else if (messageType === 'video') {
      messagePreview = '🎥 Sent a video';
    } else if (messageType === 'link') {
      messagePreview = '🔗 Shared a link';
    } else if (content && content.length > 100) {
      messagePreview = content.substring(0, 100) + '...';
    }

    // Send push to each participant
    for (const participant of participants) {
      try {
        console.log(`[Push] Invoking 'send-push-notification' for user ${participant.user_id}`);
        
        const { data, error } = await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: participant.user_id,
            title: senderName,
            body: messagePreview,
            data: {
              conversation_id: conversationId,
              type: 'new_message',
              action_url: `/messages/${conversationId}`
            }
          }
        });

        if (error) {
          console.error('[Push] Error invoking function:', error);
          // console.log to toast for visibility
          console.warn('Push function failed:', error.message); 
        } else {
          console.log('[Push] Success:', data);
        }
      } catch (err) {
        console.error('[Push] Failed for', participant.user_id, err);
      }
    }
  } catch (error) {
    console.error('[PushNotification] Trigger error:', error);
  }
}

