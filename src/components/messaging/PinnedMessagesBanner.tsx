import React, { useState } from 'react';
import { Pin, ChevronDown, ChevronUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PinnedMessage } from '../../services/pinnedMessageService';

interface Props {
  pinnedMessages: PinnedMessage[];
  onMessageClick: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
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

  return (
    <div className="relative z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
      <div 
        className="flex items-center px-4 py-2 cursor-pointer"
        onClick={() => onMessageClick(currentPin.messageId)}
      >
        <div className="mr-3 p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-full">
            <Pin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        
        <div className="flex-1 min-w-0 pr-2">
           <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
             Pinned Message
           </h4>
           <p className="text-sm text-gray-700 dark:text-gray-300 truncate leading-tight">
             {currentPin.message?.content || 'Media message'}
           </p>
        </div>

        {/* Multi-pin indicator bars */}
        {pinnedMessages.length > 1 && (
             <div className="flex items-center gap-1 mr-3 h-8" onClick={handleNext}>
                <div className="flex flex-col gap-1 justify-center h-full">
                    {pinnedMessages.map((_, idx) => (
                        <div 
                            key={idx}
                            className={`w-1 h-1 rounded-full transition-colors ${idx === validIndex ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'}`}
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
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
            className="overflow-hidden border-t border-gray-100 dark:border-gray-700"
          >
            {pinnedMessages.map((pin, idx) => (
                <div 
                    key={pin.id}
                    className={`flex items-center px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 cursor-pointer border-l-2 ${idx === validIndex ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-500' : 'border-transparent'}`}
                    onClick={() => {
                        onMessageClick(pin.messageId);
                        setIsExpanded(false);
                        setCurrentIndex(idx);
                    }}
                >
                    <div className="flex-1 min-w-0 ml-2">
                         <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                {pin.message?.senderName || 'Unknown User'}
                            </span>
                            <span className="text-xs text-xs text-muted-foreground">
                                • {new Date(pin.pinnedAt).toLocaleDateString('en-GB')}
                            </span>
                         </div>
                         <p className="text-sm text-foreground/80 truncate">
                            {pin.message?.content || 'Media message'}
                         </p>
                    </div>
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onUnpin(pin.messageId);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Unpin message"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
