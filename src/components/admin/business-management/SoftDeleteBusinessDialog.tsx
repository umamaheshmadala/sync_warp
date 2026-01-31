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
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { deleteBusiness, AdminBusinessDetails, AdminBusinessView } from '@/services/adminBusinessService';

interface SoftDeleteBusinessDialogProps {
    business: AdminBusinessDetails | AdminBusinessView | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function SoftDeleteBusinessDialog({
    business,
    isOpen,
    onClose,
    onSuccess,
}: SoftDeleteBusinessDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [reason, setReason] = useState('Deleted by admin'); // Default reason

    const handleDelete = async () => {
        if (!business) return;

        if (!reason.trim()) {
            toast.error("Please provide a reason for deletion.");
            return;
        }

        setIsLoading(true);
        try {
            await deleteBusiness(business.id, reason);
            toast.success(`${business.business_name} has been soft deleted.`);
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete business. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-red-600">Soft Delete Business</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{business?.business_name}</strong>?
                        <br />
                        This will move the business to the "Deleted" tab. It can be restored later or permanently deleted.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="delete-reason">
                            Reason for deletion (Optional)
                        </Label>
                        <Textarea
                            id="delete-reason"
                            placeholder="Reason for deletion..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="h-24 resize-none"
                            maxLength={500}
                        />
                        <div className="text-xs text-right text-gray-400">
                            {reason.length}/500 chars
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Deleting...' : 'Delete Business'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
