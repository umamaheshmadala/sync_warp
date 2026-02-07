import React, { useEffect, useState } from 'react';
import { useProductDraft } from '../../../hooks/products/useProductDraft';
import { useProductWizardStore } from '../../../stores/useProductWizardStore';
import { DraftCard } from './DraftCard';
import { Loader2 } from 'lucide-react';
import { ProductDraft } from '../../../types/productWizard';
import { ConfirmDialog } from '../ConfirmDialog';

interface DraftsTabProps {
    businessId: string;
}

export const DraftsTab: React.FC<DraftsTabProps> = ({ businessId }) => {
    const { getDrafts, deleteDraft } = useProductDraft();
    const { openWizard } = useProductWizardStore();
    const [drafts, setDrafts] = useState<ProductDraft[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadDrafts = async () => {
        setIsLoading(true);
        const data = await getDrafts(businessId);
        setDrafts(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadDrafts();
    }, [businessId]);

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        draftId: string | null;
    }>({ isOpen: false, draftId: null });

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmDialog({ isOpen: true, draftId: id });
    };

    const confirmDelete = async () => {
        if (confirmDialog.draftId) {
            await deleteDraft(confirmDialog.draftId, businessId);
            loadDrafts();
        }
        setConfirmDialog({ isOpen: false, draftId: null });
    };

    if (isLoading) {
        return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
    }

    if (drafts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-gray-500 mb-2">No drafts found</p>
                <p className="text-sm text-gray-400">Start creating a product and save it to see it here.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
            <ConfirmDialog
                open={confirmDialog.isOpen}
                onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}
                onConfirm={confirmDelete}
                title="Delete Draft?"
                description="Are you sure you want to delete this draft? This action cannot be undone."
                confirmLabel="Delete"
                variant="destructive"
            />
            {drafts.map(draft => (
                <DraftCard
                    key={draft.id}
                    draft={draft}
                    onResume={() => openWizard(businessId, draft)}
                    onDelete={(e) => handleDelete(draft.id!, e)}
                />
            ))}
        </div>
    );
};
