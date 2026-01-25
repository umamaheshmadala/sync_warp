import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { PendingReview, rejectReview } from '@/services/moderationService';
import { toast } from 'react-hot-toast';

interface RejectReviewDialogProps {
    review: PendingReview | null;
    onClose: () => void;
    onSuccess: () => void;
}

const REJECTION_REASONS = [
    { id: 'spam', label: 'Spam or promotional content' },
    { id: 'inappropriate', label: 'Inappropriate language or content' },
    { id: 'fake', label: 'Fake or misleading review' },
    { id: 'irrelevant', label: 'Not about actual experience' },
    { id: 'other', label: 'Other (please specify)' },
];

export function RejectReviewDialog({ review, onClose, onSuccess }: RejectReviewDialogProps) {
    const [reasonType, setReasonType] = useState('spam');
    const [customReason, setCustomReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (review) {
            setReasonType('spam');
            setCustomReason('');
        }
    }, [review]);

    const handleSubmit = async () => {
        if (!review) return;

        const finalReason = reasonType === 'other'
            ? customReason
            : REJECTION_REASONS.find(r => r.id === reasonType)?.label || customReason;

        if (!finalReason.trim()) return;

        setIsSubmitting(true);
        try {
            await rejectReview(review.id, finalReason);
            toast.success('Review rejected');
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Failed to reject review');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={!!review} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Reject Review</DialogTitle>
                    <DialogDescription>
                        Why are you rejecting this review? This explanation will be logged.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <RadioGroup value={reasonType} onValueChange={setReasonType}>
                        {REJECTION_REASONS.map((reason) => (
                            <div key={reason.id} className="flex items-center space-x-2">
                                <RadioGroupItem value={reason.id} id={reason.id} />
                                <Label htmlFor={reason.id} className="font-normal cursor-pointer">
                                    {reason.label}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>

                    {reasonType === 'other' && (
                        <Textarea
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="Enter specific reason..."
                            className="min-h-[80px] mt-2"
                            autoFocus
                        />
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleSubmit}
                        disabled={(reasonType === 'other' && !customReason.trim()) || isSubmitting}
                    >
                        {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
