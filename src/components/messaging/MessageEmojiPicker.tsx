import React, { Suspense } from 'react';
import { Dialog, DialogContent } from "../ui/dialog";
import { Loader2 } from 'lucide-react';

// Lazy load the heavy emoji picker
const EmojiPicker = React.lazy(() => import('emoji-picker-react'));

interface MessageEmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiClick: (emoji: string) => void;
}

export function MessageEmojiPicker({ isOpen, onClose, onEmojiClick }: MessageEmojiPickerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Transparent background, minimal styling for the container */}
      <DialogContent className="p-0 border-none bg-transparent shadow-none w-auto max-w-min flex justify-center items-center">
        <Suspense 
          fallback={
            <div className="flex items-center justify-center w-[350px] h-[400px] bg-white rounded-xl shadow-xl">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          }
        >
          <EmojiPicker
            onEmojiClick={(data) => {
              onEmojiClick(data.emoji);
              onClose();
            }}
            lazyLoadEmojis={true}
            searchDisabled={false}
            skinTonesDisabled
            width={350}
            height={400}
            previewConfig={{ showPreview: false }}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
