import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

interface DeleteReviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

export function DeleteReviewDialog({
    isOpen,
    onClose,
    onConfirm,
    isDeleting
}: DeleteReviewDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-destructive" />
                        Delete Review?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete your review? This action will:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Remove the review from public view</li>
                            <li>Update business review statistics</li>
                            <li>Allow you to write a new review if you wish</li>
                        </ul>
                        <p className="mt-3 text-sm">
                            <strong>Note:</strong> For legal compliance, review data is retained
                            in our system but will not be visible to anyone.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Review'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
