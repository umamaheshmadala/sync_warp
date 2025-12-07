import React, { useState } from 'react';
import { Pin, ChevronDown, ChevronUp, X, Image, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PinnedMessage } from '../../services/pinnedMessageService';

interface Props {
  pinnedMessages: PinnedMessage[];
  onMessageClick: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

/**
 * Get display text for pinned message based on type and content
 */
function getMessageDisplayText(message?: PinnedMessage['message']): { icon?: React.ReactNode; text: string } {
  if (!message) return { text: 'Pinned Message' };
  
  const { type, content } = message;
  
  if (type === 'image') {
    return { 
      icon: <Image className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />,
      text: content || 'Photo'
    };
  }
  
  if (type === 'video') {
    return {
      icon: <Video className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />,
      text: content || 'Video'
    };
  }
  
  return { text: content || 'Pinned Message' };
}

export function PinnedMessagesBanner({
  pinnedMessages,
  onMessageClick,
  onUnpin
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (pinnedMessages.length === 0) return null;

  // Ensure index is valid
  const validIndex = Math.min(currentIndex, pinnedMessages.length - 1);
  const currentPin = pinnedMessages[validIndex];
  
  // Guard against deleted messages or syncing issues
  if (!currentPin) return null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
  };

  const currentDisplay = getMessageDisplayText(currentPin.message);

  return (
    <div className="relative z-10 bg-white border-b border-gray-200 shadow-sm">
      <div 
        className="flex items-center px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onMessageClick(currentPin.messageId)}
      >
        <div className="mr-3 p-1.5 bg-blue-50 rounded-full">
          <Pin className="w-3.5 h-3.5 text-blue-600" />
        </div>
        
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="text-xs font-semibold text-blue-600">
              Pinned Message
            </h4>
            <span className="text-xs text-slate-400">
              • {new Date(currentPin.pinnedAt).toLocaleDateString('en-GB')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {currentDisplay.icon}
            <p className="text-sm text-slate-700 truncate leading-tight">
              {currentDisplay.text}
            </p>
          </div>
        </div>

        {/* Multi-pin indicator bars */}
        {pinnedMessages.length > 1 && (
          <div className="flex items-center gap-1 mr-3 h-8" onClick={handleNext}>
            <div className="flex flex-col gap-1 justify-center h-full">
              {pinnedMessages.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-1 h-1 rounded-full transition-colors ${idx === validIndex ? 'bg-blue-500' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (pinnedMessages.length > 1) {
              setIsExpanded(!isExpanded);
            } else {
              onUnpin(currentPin.messageId); 
            }
          }}
          className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
        >
          {pinnedMessages.length > 1 ? (
            isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && pinnedMessages.length > 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-100 bg-gray-50"
          >
            {pinnedMessages.map((pin, idx) => {
              const display = getMessageDisplayText(pin.message);
              return (
                <div 
                  key={pin.id}
                  className={`flex items-center px-4 py-3 hover:bg-white cursor-pointer border-l-2 transition-colors ${
                    idx === validIndex 
                      ? 'bg-blue-50 border-blue-500' 
                      : 'border-transparent'
                  }`}
                  onClick={() => {
                    onMessageClick(pin.messageId);
                    setIsExpanded(false);
                    setCurrentIndex(idx);
                  }}
                >
                  <div className="flex-1 min-w-0 ml-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-slate-900">
                        {pin.message?.senderName || 'Unknown User'}
                      </span>
                      <span className="text-xs text-slate-400">
                        • {new Date(pin.pinnedAt).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {display.icon}
                      <p className="text-sm text-slate-600 truncate">
                        {display.text}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpin(pin.messageId);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Unpin message"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
