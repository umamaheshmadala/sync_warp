import { useState } from 'react';
import { Flag, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { submitReport, REPORT_REASONS, ReportReason } from '@/services/reportService';
import { toast } from 'react-hot-toast';

interface ReportReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    reviewId: string;
    onReported: () => void;
}

export function ReportReviewModal({
    isOpen,
    onClose,
    reviewId,
    onReported
}: ReportReviewModalProps) {
    const [reason, setReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reason) {
            toast.error('Please select a reason');
            return;
        }

        setIsSubmitting(true);

        try {
            await submitReport({
                reviewId,
                reason,
                details: details.trim() || undefined
            });

            toast.success('Thank you for your report. We will review it shortly.');
            onReported();
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not submit report');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setReason(null);
        setDetails('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Flag className="w-5 h-5 text-red-500" />
                        Report Review
                    </DialogTitle>
                    <DialogDescription>
                        Help us maintain quality by reporting reviews that violate our guidelines.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-3">
                        <Label className="text-base">Why are you reporting this review?</Label>

                        <RadioGroup value={reason || ''} onValueChange={(v) => setReason(v as ReportReason)}>
                            {Object.entries(REPORT_REASONS).map(([key, { label, description }]) => (
                                <div key={key} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer" onClick={() => setReason(key as ReportReason)}>
                                    <RadioGroupItem value={key} id={key} className="mt-0.5" />
                                    <div className="flex-1">
                                        <Label htmlFor={key} className="font-medium cursor-pointer">
                                            {label}
                                        </Label>
                                        <p className="text-sm text-gray-500">
                                            {description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="details">Additional details (optional)</Label>
                        <Textarea
                            id="details"
                            value={details}
                            onChange={(e) => setDetails(e.target.value.slice(0, 200))}
                            placeholder="Provide any additional context..."
                            rows={3}
                            className="resize-none"
                        />
                        <p className="text-xs text-gray-400 text-right">
                            {details.length}/200 characters
                        </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <p className="text-sm text-amber-800">
                            False reports may result in account restrictions. Please only
                            report genuine violations.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!reason || isSubmitting}
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
