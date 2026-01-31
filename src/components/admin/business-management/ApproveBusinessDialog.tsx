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
import { toast } from 'react-hot-toast';
import { approveBusiness, AdminBusinessDetails, AdminBusinessView } from '@/services/adminBusinessService';
import { sendBusinessApprovalNotification as sendNotification } from '@/services/adminNotificationService';

interface ApproveBusinessDialogProps {
    business: AdminBusinessDetails | AdminBusinessView | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ApproveBusinessDialog({
    business,
    isOpen,
    onClose,
    onSuccess,
}: ApproveBusinessDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleApprove = async () => {
        if (!business) return;

        setIsLoading(true);
        try {
            await approveBusiness(business.id);

            // Send notification
            try {
                await sendNotification(business.id);
            } catch (notifyError) {
                console.error("Failed to send notification", notifyError);
                // Don't block success UI on notification failure, but maybe log it
            }

            toast.success(`${business.business_name} is now active and visible to users.`);
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error('Failed to approve business. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Approve Business</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to approve <strong>{business?.business_name}</strong>?
                        This will make it visible to all users on the platform.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleApprove}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Approving...' : 'Approve Business'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
