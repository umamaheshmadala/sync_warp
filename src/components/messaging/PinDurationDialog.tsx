import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Check, Clock } from 'lucide-react';
import { PinDuration } from '../../services/pinnedMessageService';
import { cn } from '../../lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (duration: PinDuration) => void;
}

const durationOptions: { value: PinDuration; label: string; description: string }[] = [
  { value: '24h', label: '24 Hours', description: 'Pin expires tomorrow' },
  { value: '7d', label: '7 Days', description: 'Pin expires next week' },
  { value: '30d', label: '30 Days', description: 'Pin expires next month' },
];

export function PinDurationDialog({ open, onOpenChange, onConfirm }: Props) {
  const [duration, setDuration] = useState<PinDuration>('7d');

  const handleConfirm = () => {
    onConfirm(duration);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white text-slate-900 border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Pin Message</DialogTitle>
          <DialogDescription className="text-slate-600">
            Choose how long this message should stay pinned.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-2">
          {durationOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDuration(option.value)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all",
                duration === option.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  duration === option.value ? "bg-blue-100" : "bg-gray-100"
                )}>
                  <Clock className={cn(
                    "w-4 h-4",
                    duration === option.value ? "text-blue-600" : "text-gray-500"
                  )} />
                </div>
                <div className="text-left">
                  <p className={cn(
                    "font-medium",
                    duration === option.value ? "text-blue-900" : "text-slate-900"
                  )}>
                    {option.label}
                    {option.value === '7d' && (
                      <span className="ml-2 text-xs text-blue-600 font-normal">(Recommended)</span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">{option.description}</p>
                </div>
              </div>
              {duration === option.value && (
                <div className="p-1 rounded-full bg-blue-500">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-gray-300 text-slate-700 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Pin Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
