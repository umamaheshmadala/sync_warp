import React, { useState } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { rejectBusiness, AdminBusinessDetails, AdminBusinessView } from '@/services/adminBusinessService';

interface RejectBusinessDialogProps {
    business: AdminBusinessDetails | AdminBusinessView | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const REJECTION_REASONS = [
    "Incomplete or inaccurate information",
    "Duplicate business listing",
    "Fraudulent or spam entry",
    "Business does not comply with platform policies",
    "Insufficient verification documents",
    "Other (specify below)"
];

export function RejectBusinessDialog({
    business,
    isOpen,
    onClose,
    onSuccess,
}: RejectBusinessDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [reasonType, setReasonType] = useState<string>('');
    const [customReason, setCustomReason] = useState('');

    const handleReject = async () => {
        if (!business) return;

        const finalReason = reasonType === 'Other (specify below)' ? customReason : reasonType;

        if (!finalReason.trim()) {
            toast.error("Please provide a reason for rejection.");
            return;
        }

        setIsLoading(true);
        try {
            // Service layer handles notification sending
            await rejectBusiness(business.id, finalReason);
            toast.success(`${business.business_name} has been rejected.`);
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error('Failed to reject business. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-red-600">Reject Business</DialogTitle>
                    <DialogDescription>
                        This will reject <strong>{business?.business_name}</strong> and notify the owner.
                        This action cannot be undone immediately (requires re-approval).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason-type">Reason for rejection *</Label>
                        <Select value={reasonType} onValueChange={setReasonType}>
                            <SelectTrigger id="reason-type">
                                <SelectValue placeholder="Select a reason..." />
                            </SelectTrigger>
                            <SelectContent>
                                {REJECTION_REASONS.map((reason) => (
                                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="custom-reason">
                            Additional Details {reasonType === 'Other (specify below)' ? '*' : '(Optional)'}
                        </Label>
                        <Textarea
                            id="custom-reason"
                            placeholder="Provide specific details about why this business is being rejected..."
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            className="h-24 resize-none"
                            maxLength={500}
                        />
                        <div className="text-xs text-right text-gray-400">
                            {customReason.length}/500 chars
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={isLoading || !reasonType || (reasonType === 'Other (specify below)' && !customReason.trim())}
                    >
                        {isLoading ? 'Rejecting...' : 'Reject Business'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
