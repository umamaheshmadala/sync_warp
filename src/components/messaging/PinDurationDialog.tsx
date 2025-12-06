import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { PinDuration } from '../../services/pinnedMessageService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (duration: PinDuration) => void;
}

export function PinDurationDialog({ open, onOpenChange, onConfirm }: Props) {
  const [duration, setDuration] = useState<PinDuration>('7d');

  const handleConfirm = () => {
    onConfirm(duration);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pin Message</DialogTitle>
          <DialogDescription>
            Choose how long this message should stay pinned.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup value={duration} onValueChange={(v) => setDuration(v as PinDuration)} className="gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="24h" id="24h" />
              <Label htmlFor="24h">24 hours</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="7d" id="7d" />
              <Label htmlFor="7d">7 days (Default)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="30d" id="30d" />
              <Label htmlFor="30d">30 days</Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm}>Pin</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
