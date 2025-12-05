import React from 'react'
import { Clock, Check, CheckCheck, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

interface Props {
  status: MessageStatus
  className?: string
  showTooltip?: boolean
}

/**
 * WhatsApp-style message status indicator
 * 
 * Visual states:
 * - Sending: Clock icon (animated)
 * - Sent: Single white check ✓
 * - Delivered: Double white checks ✓✓
 * - Read: Double CYAN checks ✓✓ (bright, very distinct from delivered)
 * - Failed: Red alert icon
 */
export function MessageStatusIcon({ status, className, showTooltip = false }: Props) {
  // Increased size for better visibility
  const iconSize = "w-[18px] h-[18px]"
  
  const getIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className={cn(iconSize, "animate-pulse")} />
      case 'sent':
        // Single check - white
        return <Check className={iconSize} />
      case 'delivered':
        // Double check - white (same as sent but double)
        return <CheckCheck className={iconSize} />
      case 'read':
        // Double check - BRIGHT CYAN for maximum visibility
        // Using !important to override any parent color
        return <CheckCheck className={cn(iconSize, "!text-cyan-300 drop-shadow-[0_0_2px_rgba(103,232,249,0.8)]")} />
      case 'failed':
        return <AlertCircle className={cn(iconSize, "!text-red-400")} />
      default:
        return null
    }
  }

  const getLabel = () => {
    switch (status) {
      case 'sending':
        return 'Sending...'
      case 'sent':
        return 'Sent'
      case 'delivered':
        return 'Delivered'
      case 'read':
        return 'Read'
      case 'failed':
        return 'Failed to send'
      default:
        return ''
    }
  }

  // Default color for sent/delivered - full white for visibility on blue bubbles
  const defaultColor = (status === 'sending' || status === 'sent' || status === 'delivered') 
    ? 'text-white' 
    : ''

  return (
    <div
      className={cn('inline-flex items-center', defaultColor, className)}
      title={showTooltip ? getLabel() : undefined}
      aria-label={getLabel()}
    >
      {getIcon()}
    </div>
  )
}
