import React from 'react'
import { Clock, Check, CheckCheck, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

interface Props {
  status: MessageStatus
  className?: string
  showTooltip?: boolean
}

export function MessageStatusIcon({ status, className, showTooltip = false }: Props) {
  const getIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3.5 h-3.5 text-gray-400 animate-pulse" />
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-gray-400" />
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
      case 'failed':
        return <AlertCircle className="w-3.5 h-3.5 text-red-600" />
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

  return (
    <div
      className={cn('inline-flex items-center', className)}
      title={showTooltip ? getLabel() : undefined}
      aria-label={getLabel()}
    >
      {getIcon()}
    </div>
  )
}
