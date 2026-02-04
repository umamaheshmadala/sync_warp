import React, { useEffect, useState } from 'react';
import { useProductDraft } from '../../../hooks/useProductDraft';
import { useProductWizardStore } from '../../../stores/useProductWizardStore';
import { DraftCard } from './DraftCard';
import { Loader2 } from 'lucide-react';
import { ProductDraft } from '../../../types/productWizard';

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

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Delete this draft?")) {
            await deleteDraft(id);
            loadDrafts(); // Refresh
        }
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
            {drafts.map(draft => (
                <DraftCard
                    key={draft.id}
                    draft={draft}
                    onResume={() => openWizard(draft)}
                    onDelete={(e) => handleDelete(draft.id!, e)}
                />
            ))}
        </div>
    );
};
