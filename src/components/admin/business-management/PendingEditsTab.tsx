
import React, { useEffect, useState } from 'react';
import { PendingEditsTable } from './PendingEditsTable';
import { PendingEditsReviewModal } from './PendingEditsReviewModal';
import { adminPendingEditsService, PendingEditSummary } from '../../../services/adminPendingEditsService';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

export const PendingEditsTab: React.FC = () => {
    const [edits, setEdits] = useState<PendingEditSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    const loadEdits = async () => {
        setIsLoading(true);
        try {
            const data = await adminPendingEditsService.getPendingEditsList();
            setEdits(data);
        } catch (error) {
            console.error('Failed to load pending edits:', error);
            toast.error('Failed to load pending edits');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadEdits();
    }, []);

    const handleReviewClick = (businessId: string) => {
        setSelectedBusinessId(businessId);
        setIsReviewOpen(true);
    };

    const handleReviewComplete = () => {
        loadEdits(); // Refresh list after action
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Pending Edits Queue</h2>
                <button
                    onClick={loadEdits}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    title="Refresh list"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            <PendingEditsTable
                date={edits} // Passing data prop
                isLoading={isLoading}
                onReviewClick={handleReviewClick}
            />

            {selectedBusinessId && (
                <PendingEditsReviewModal
                    businessId={selectedBusinessId}
                    isOpen={isReviewOpen}
                    onClose={() => setIsReviewOpen(false)}
                    onComplete={handleReviewComplete}
                />
            )}
        </div>
    );
};
