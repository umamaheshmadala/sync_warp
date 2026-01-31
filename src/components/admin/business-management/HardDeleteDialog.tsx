import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { hardDeleteBusiness, AdminBusinessView } from '@/services/adminBusinessService';

interface HardDeleteDialogProps {
    business: AdminBusinessView | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function HardDeleteDialog({ business, isOpen, onClose, onSuccess }: HardDeleteDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmName, setConfirmName] = useState('');
    const [reason, setReason] = useState('');

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (isOpen) {
            setConfirmName('');
            setReason('');
            setIsDeleting(false);
        }
    }, [isOpen]);

    if (!business) return null;

    const isMatch = confirmName === business.business_name;
    const canSubmit = isMatch && reason.trim().length > 0;

    const handleDelete = async () => {
        if (!canSubmit) return;

        setIsDeleting(true);
        try {
            await hardDeleteBusiness(business.id, reason);
            toast.success('Business permanently deleted');
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete business');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isDeleting && onClose()}>
            <DialogContent className="sm:max-w-[425px] bg-white text-gray-900 border-red-100 shadow-xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                        <div className="p-2 bg-red-100 rounded-full">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-xl">Permanently Delete Business</DialogTitle>
                    </div>
                    <DialogDescription className="text-gray-600 text-base">
                        This action <strong>cannot be undone</strong>. This will permanently remove
                        <span className="font-bold text-gray-900"> {business.business_name} </span>
                        and all associated data (offers, products, followers, history).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Reason for Deletion <span className="text-red-500">*</span></Label>
                        <Input
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="e.g. Spam account, Policy violation"
                            className="bg-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-700 font-medium block">
                            Type <span className="font-bold select-all text-red-600">"{business.business_name}"</span> to confirm:
                        </Label>
                        <Input
                            value={confirmName}
                            onChange={e => setConfirmName(e.target.value)}
                            placeholder={business.business_name}
                            className="border-gray-300 focus:ring-red-500 focus:border-red-500 bg-white"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isDeleting} className="border-gray-300">
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={!canSubmit || isDeleting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
