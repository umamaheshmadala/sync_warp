// src/components/messaging/MessageReadStatus.tsx
// Enhanced read status display with "Seen by" tooltip
// Story: 8.5.1 - Read Receipts Implementation

import React, { useState, useEffect } from 'react';
import { Clock, Check, CheckCheck, AlertCircle, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';
import { readReceiptService, ReadReceipt } from '../../services/readReceiptService';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface Props {
  status: MessageStatus;
  messageId: string;
  isGroupChat?: boolean;
  className?: string;
  showSeenBy?: boolean;
}

/**
 * Enhanced WhatsApp-style message status with "Seen by" tooltip for groups
 * 
 * Visual states:
 * - Sending: Clock icon (animated)
 * - Sent: Single white check ✓
 * - Delivered: Double white checks ✓✓
 * - Read: Double CYAN checks ✓✓ (with optional "Seen by X" tooltip)
 * - Failed: Red alert icon
 */
export function MessageReadStatus({ 
  status, 
  messageId,
  isGroupChat = false,
  className,
  showSeenBy = true 
}: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);

  // Fetch read receipts when tooltip is opened
  useEffect(() => {
    if (showTooltip && status === 'read' && showSeenBy) {
      const fetchReceipts = async () => {
        setIsLoadingReceipts(true);
        try {
          const receipts = await readReceiptService.getReadReceipts(messageId);
          setReadReceipts(receipts);
        } catch (error) {
          console.error('Failed to fetch read receipts:', error);
        } finally {
          setIsLoadingReceipts(false);
        }
      };
      fetchReceipts();
    }
  }, [showTooltip, status, messageId, showSeenBy]);

  const iconSize = 'w-[16px] h-[16px]';
  
  const getIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className={cn(iconSize, 'animate-pulse')} />;
      case 'sent':
        return <Check className={iconSize} />;
      case 'delivered':
        return <CheckCheck className={iconSize} />;
      case 'read':
        return (
          <CheckCheck 
            className={cn(
              iconSize, 
              '!text-cyan-300 drop-shadow-[0_0_2px_rgba(103,232,249,0.8)]'
            )} 
          />
        );
      case 'failed':
        return <AlertCircle className={cn(iconSize, '!text-red-400')} />;
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        if (isGroupChat && readReceipts.length > 0) {
          return `Seen by ${readReceipts.length}`;
        }
        return 'Read';
      case 'failed':
        return 'Failed to send';
      default:
        return '';
    }
  };

  const formatTime = (isoDate: string) => {
    return new Date(isoDate).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const defaultColor = status === 'sending' || status === 'sent' || status === 'delivered'
    ? 'text-white/80'
    : '';

  // Simple display for non-read status or non-group chats
  if (status !== 'read' || !isGroupChat || !showSeenBy) {
    return (
      <div
        className={cn('inline-flex items-center', defaultColor, className)}
        title={getLabel()}
        aria-label={getLabel()}
      >
        {getIcon()}
      </div>
    );
  }

  // Enhanced display for read status in group chats
  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          'inline-flex items-center gap-1 cursor-pointer hover:opacity-80',
          defaultColor,
          className
        )}
        aria-label={getLabel()}
        aria-haspopup="true"
        aria-expanded={showTooltip}
      >
        {getIcon()}
        {readReceipts.length > 0 && (
          <span className="text-[10px] text-cyan-300 font-medium">
            {readReceipts.length}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={cn(
            'absolute bottom-full mb-2 right-0 z-50',
            'bg-gray-900 text-white rounded-lg shadow-xl',
            'min-w-[180px] max-w-[250px] p-3'
          )}
          role="tooltip"
        >
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span className="font-medium text-sm">
              Seen by {readReceipts.length}
            </span>
          </div>

          {isLoadingReceipts ? (
            <div className="flex items-center justify-center py-2">
              <Clock className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : readReceipts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-1">
              No one yet
            </p>
          ) : (
            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {readReceipts.map((receipt) => (
                <div
                  key={receipt.userId}
                  className="flex items-center gap-2 text-xs"
                >
                  {receipt.avatarUrl ? (
                    <img
                      src={receipt.avatarUrl}
                      alt={receipt.username || 'User'}
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center">
                      <span className="text-[10px]">
                        {(receipt.username || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="flex-1 truncate text-gray-200">
                    {receipt.username || 'Unknown'}
                  </span>
                  <span className="text-gray-400 text-[10px]">
                    {formatTime(receipt.readAt)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Arrow */}
          <div
            className={cn(
              'absolute -bottom-1 right-3',
              'w-2 h-2 bg-gray-900 rotate-45'
            )}
          />
        </div>
      )}
    </div>
  );
}
