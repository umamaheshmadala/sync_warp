import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { restoreBusiness, AdminBusinessView } from '@/services/adminBusinessService';

interface RestoreBusinessDialogProps {
    business: AdminBusinessView | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function RestoreBusinessDialog({ business, isOpen, onClose, onSuccess }: RestoreBusinessDialogProps) {
    const [isRestoring, setIsRestoring] = useState(false);

    if (!business) return null;

    const handleRestore = async () => {
        setIsRestoring(true);
        try {
            await restoreBusiness(business.id);
            toast.success('Business restored successfully');
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error('Failed to restore business');
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCcw className="w-5 h-5 text-blue-600" />
                        Restore Business
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to restore <strong>{business.business_name}</strong>?
                        This will move it back to the Pending/Active state and restore its content visibility.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isRestoring}>Cancel</Button>
                    <Button onClick={handleRestore} disabled={isRestoring} className="bg-blue-600 hover:bg-blue-700">
                        {isRestoring ? 'Restoring...' : 'Restore Business'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
