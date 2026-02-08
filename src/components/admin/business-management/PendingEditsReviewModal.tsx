
import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { FieldDiffRow } from './FieldDiffRow';
import { PendingEditDetails, adminPendingEditsService } from '../../../services/adminPendingEditsService';
import toast from 'react-hot-toast';

interface PendingEditsReviewModalProps {
    businessId: string;
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void; // Called after an action is taken to refresh the list
}

type DecisionMap = Record<string, 'approved' | 'rejected' | 'pending'>;

export const PendingEditsReviewModal: React.FC<PendingEditsReviewModalProps> = ({
    businessId,
    isOpen,
    onClose,
    onComplete
}) => {
    const [details, setDetails] = useState<PendingEditDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [decisions, setDecisions] = useState<DecisionMap>({});
    const [processing, setProcessing] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (isOpen && businessId) {
            loadDetails();
        } else {
            setDetails(null);
            setDecisions({});
        }
    }, [isOpen, businessId]);

    const loadDetails = async () => {
        setLoading(true);
        try {
            const data = await adminPendingEditsService.getPendingEditDetails(businessId);
            setDetails(data);

            // Initialize decisions as pending
            const initDecisions: DecisionMap = {};
            Object.keys(data.pending_changes).forEach(key => {
                initDecisions[key] = 'pending';
            });
            setDecisions(initDecisions);
        } catch (error) {
            console.error('Failed to load pending edits:', error);
            toast.error('Failed to load pending changes');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleDecision = (field: string, status: 'approved' | 'rejected') => {
        setDecisions(prev => ({ ...prev, [field]: status }));
    };

    const isAllDecided = () => {
        return Object.values(decisions).every(d => d !== 'pending');
    };

    const handleApproveAll = async () => {
        if (!confirm('Are you sure you want to approve all changes?')) return;
        setProcessing(true);
        try {
            await adminPendingEditsService.approveAllPendingEdits(businessId);
            toast.success('All changes approved');
            queryClient.invalidateQueries({ queryKey: ['admin-businesses'] }); // Refresh admin list
            queryClient.invalidateQueries({ queryKey: ['business', businessId] }); // Refresh public view
            onComplete();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to approve changes');
        } finally {
            setProcessing(false);
        }
    };

    const handleRejectAll = async () => {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason === null) return; // Cancelled
        // Note: Reason logging is pending in service, but we'll pass it if we update service or just log locally
        // For now, simpler service implementation allows reject without reason arg, but plan asked for it.
        // I will assume service handles it or ignores it for now as per my implementation.
        // Checking my service implementation: `rejectAllPendingEdits` takes a reason! Good.

        setProcessing(true);
        try {
            await adminPendingEditsService.rejectAllPendingEdits(businessId, reason || 'No reason provided');
            toast.success('All changes rejected');
            queryClient.invalidateQueries({ queryKey: ['admin-businesses'] }); // Refresh admin list
            queryClient.invalidateQueries({ queryKey: ['business', businessId] }); // Refresh public view
            onComplete();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to reject changes');
        } finally {
            setProcessing(false);
        }
    };

    const handleSavePartial = async () => {
        if (!isAllDecided()) {
            toast.error('Please make a decision for all fields before saving.');
            return;
        }

        const fieldDecisions = Object.entries(decisions).map(([field, status]) => ({
            field: field as any,
            approved: status === 'approved'
        }));

        setProcessing(true);
        try {
            await adminPendingEditsService.partialApprovePendingEdits(businessId, fieldDecisions);
            toast.success('Decisions saved successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-businesses'] }); // Refresh admin list
            queryClient.invalidateQueries({ queryKey: ['business', businessId] }); // Refresh public view
            onComplete();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save decisions');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Review Pending Changes</h2>
                        {details && (
                            <div className="mt-1 text-sm text-gray-500 space-y-1">
                                <p>Business: <span className="font-medium text-gray-900">{details.current_values.business_name}</span></p>
                                <p>Submitted by: {details.submitted_by}</p>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : details ? (
                        <div className="space-y-6">
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex items-start gap-2">
                                <AlertCircle size={18} className="mt-0.5" />
                                <p>
                                    Review each change carefully. You can approve or reject individual fields,
                                    or use the bulk actions below.
                                </p>
                            </div>

                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                                        <th className="py-3 px-4 font-semibold">Field</th>
                                        <th className="py-3 px-4 font-semibold">Current Value (Live)</th>
                                        <th className="py-3 px-4 font-semibold">Requested Change</th>
                                        <th className="py-3 px-4 font-semibold text-right">Decision</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(details.pending_changes).map(([key, value]) => {
                                        // @ts-ignore
                                        const currentVal = details.current_values[key];
                                        return (
                                            <FieldDiffRow
                                                key={key}
                                                label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                currentValue={currentVal}
                                                newValue={value as string}
                                                status={decisions[key]}
                                                onApprove={() => handleDecision(key, 'approved')}
                                                onReject={() => handleDecision(key, 'rejected')}
                                            />
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-12">Failed to load details</div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div className="flex gap-3">
                        <button
                            onClick={handleRejectAll}
                            disabled={processing || loading}
                            className="px-4 py-2 text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 font-medium"
                        >
                            Reject All
                        </button>
                        <button
                            onClick={handleApproveAll}
                            disabled={processing || loading}
                            className="px-4 py-2 text-green-600 bg-white border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-200 transition-colors disabled:opacity-50 font-medium"
                        >
                            Approve All
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={processing}
                            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSavePartial}
                            disabled={processing || loading || !isAllDecided()}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {processing ? 'Saving...' : (
                                <>
                                    <Save size={18} />
                                    Save Decisions
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
