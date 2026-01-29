import React, { useState } from 'react';
import { AlertTriangle, Trash2, PauseCircle, Archive, XOctagon } from 'lucide-react';
import { Offer } from '../../types/offers';

export type OfferActionMode = 'pause' | 'terminate' | 'archive' | 'delete';

interface OfferActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason?: string) => Promise<void>;
    mode: OfferActionMode;
    offer: Offer;
    isProcessing?: boolean;
}

export const OfferActionModal: React.FC<OfferActionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    mode,
    offer,
    isProcessing = false,
}) => {
    const [reason, setReason] = useState('');
    const [selectedReason, setSelectedReason] = useState('');

    if (!isOpen) return null;

    const isHardDelete = offer.status === 'draft';

    // Terminate reasons from requirements
    const TERMINATE_REASONS = [
        'Stock exhausted',
        'Campaign ended early',
        'Error in offer details',
        'Business decision',
        'Other'
    ];

    const handleConfirm = () => {
        if (mode === 'terminate') {
            if (selectedReason === 'Other') {
                onConfirm(reason);
            } else {
                onConfirm(selectedReason);
            }
        } else {
            onConfirm(reason);
        }
    };

    const getModalContent = () => {
        switch (mode) {
            case 'pause':
                return {
                    title: 'Pause Offer',
                    icon: <PauseCircle className="w-6 h-6 text-orange-600" />,
                    bgColor: 'bg-orange-50',
                    textColor: 'text-orange-800',
                    confirmBtnColor: 'bg-orange-600 hover:bg-orange-700',
                    description: `Are you sure you want to pause "${offer.title}"? It will be hidden from the storefront immediately but can be resumed later.`,
                    showReason: true,
                    reasonPlaceholder: 'Internal note (optional)...'
                };
            case 'terminate':
                return {
                    title: 'Terminate Offer',
                    icon: <XOctagon className="w-6 h-6 text-red-600" />,
                    bgColor: 'bg-red-50',
                    textColor: 'text-red-800',
                    confirmBtnColor: 'bg-red-600 hover:bg-red-700',
                    description: `This will PERMANENTLY end "${offer.title}". It cannot be resumed. Customers will see "This offer is no longer available".`,
                    showTerminateSelect: true
                };
            case 'archive':
                return {
                    title: 'Archive Offer',
                    icon: <Archive className="w-6 h-6 text-gray-600" />,
                    bgColor: 'bg-gray-50',
                    textColor: 'text-gray-800',
                    confirmBtnColor: 'bg-gray-600 hover:bg-gray-700',
                    description: `Archive "${offer.title}"? It will be hidden from view. You cannot resume an archived offer (must duplicate to re-run).`,
                    showReason: false
                };
            case 'delete':
                return {
                    title: isHardDelete ? 'Delete Draft' : 'Delete Offer',
                    icon: <Trash2 className="w-6 h-6 text-red-600" />,
                    bgColor: 'bg-red-50',
                    textColor: 'text-red-800',
                    confirmBtnColor: 'bg-red-600 hover:bg-red-700',
                    description: isHardDelete
                        ? `Permanently delete "${offer.title}"? This cannot be undone.`
                        : `Delete "${offer.title}"? It will be removed from your list (Soft Delete).`,
                    showReason: false
                };
            default:
                return {
                    title: 'Confirm',
                    icon: <AlertTriangle className="w-6 h-6 text-gray-600" />,
                    bgColor: 'bg-gray-50',
                    textColor: 'text-gray-800',
                    confirmBtnColor: 'bg-blue-600',
                    description: 'Are you sure?',
                    showReason: false
                };
        }
    };

    const content = getModalContent();

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${content.bgColor} sm:mx-0 sm:h-10 sm:w-10`}>
                                {content.icon}
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    {content.title}
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        {content.description}
                                    </p>
                                </div>

                                {content.showReason && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                                            rows={3}
                                            placeholder={content.reasonPlaceholder}
                                        />
                                    </div>
                                )}

                                {content.showTerminateSelect && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Termination <span className='text-red-500'>*</span></label>
                                        <select
                                            value={selectedReason}
                                            onChange={(e) => {
                                                setSelectedReason(e.target.value);
                                                if (e.target.value !== 'Other') setReason('');
                                            }}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border mb-2"
                                        >
                                            <option value="">Select a reason</option>
                                            {TERMINATE_REASONS.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>

                                        {selectedReason === 'Other' && (
                                            <textarea
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                                                rows={2}
                                                placeholder="Please specify..."
                                            />
                                        )}
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            disabled={isProcessing || (mode === 'terminate' && !selectedReason) || (mode === 'terminate' && selectedReason === 'Other' && !reason)}
                            onClick={handleConfirm}
                            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${content.confirmBtnColor} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isProcessing ? 'Processing' : (mode === 'delete' ? 'Delete' : 'Confirm')}
                        </button>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
