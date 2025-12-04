/**
 * Message Status Badge Component
 * 
 * Displays message delivery status with icons:
 * - Sending/Pending: Clock icon
 * - Sent: Single check
 * - Delivered/Read: Double check (blue)
 * - Failed: Alert icon (red)
 * 
 * Industry Best Practices:
 * - WhatsApp: Double check for delivered/read
 * - Telegram: Clock for sending
 * - Signal: Simple status indicators
 */

import React from 'react'
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react'

interface MessageStatusBadgeProps {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'pending'
  isOptimistic?: boolean
}

export function MessageStatusBadge({ status, isOptimistic }: MessageStatusBadgeProps) {
  // Optimistic or pending messages show "Sending..."
  if (isOptimistic || status === 'sending' || status === 'pending') {
    return (
      <div 
        className="flex items-center gap-1 text-xs text-gray-400"
        role="status"
        aria-label="Message is being sent"
      >
        <Clock className="w-3 h-3" aria-hidden="true" />
        <span>Sending...</span>
      </div>
    )
  }

  // Failed messages show error
  if (status === 'failed') {
    return (
      <div 
        className="flex items-center gap-1 text-xs text-red-500"
        role="status"
        aria-label="Message failed to send"
      >
        <AlertCircle className="w-3 h-3" aria-hidden="true" />
        <span>Failed</span>
      </div>
    )
  }

  // Sent (single check)
  if (status === 'sent') {
    return (
      <Check 
        className="w-4 h-4 text-gray-400" 
        aria-label="Message sent"
      />
    )
  }

  // Delivered or Read (double check, blue)
  if (status === 'delivered' || status === 'read') {
    return (
      <CheckCheck 
        className="w-4 h-4 text-blue-500" 
        aria-label={status === 'read' ? 'Message read' : 'Message delivered'}
      />
    )
  }

  return null
}
