import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, AlertTriangle, ShieldAlert, Flag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { reportingService, type ReportReason } from '../../services/reportingService';
import * as blockService from '../../services/blockService';

interface ReportDialogProps {
    messageId: string;
    conversationId: string;
    senderId: string;
    senderName?: string;
    isOpen: boolean;
    onClose: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string; emoji: string }[] = [
    { value: 'spam', label: 'Spam', emoji: '🚫', description: 'Unwanted promotional content or repetitive messages' },
    { value: 'harassment', label: 'Harassment', emoji: '😠', description: 'Bullying, threats, or intimidation' },
    { value: 'hate_speech', label: 'Hate Speech', emoji: '⚠️', description: 'Discriminatory content based on race, gender, etc.' },
    { value: 'self_harm', label: 'Self-Harm', emoji: '🆘', description: 'Encouraging suicide or self-injury' },
    { value: 'sexual_content', label: 'Sexual Content', emoji: '🔞', description: 'Nudity or sexually explicit material' },
    { value: 'violence', label: 'Violence', emoji: '⚔️', description: 'Graphic violence or threats of physical harm' },
    { value: 'scam', label: 'Scam/Fraud', emoji: '💰', description: 'Financial scams or phishing attempts' },
    { value: 'impersonation', label: 'Impersonation', emoji: '🎭', description: 'Pretending to be another person or entity' },
    { value: 'copyright', label: 'Copyright', emoji: '©️', description: 'Intellectual property violation' },
    { value: 'other', label: 'Other', emoji: '📝', description: 'Issue not listed above' }
];

export function ReportDialog({ messageId, conversationId, senderId, senderName, isOpen, onClose }: ReportDialogProps) {
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);

    const handleSubmit = async () => {
        if (!selectedReason) return;

        setIsSubmitting(true);
        try {
            await reportingService.reportMessage(messageId, conversationId, selectedReason, description);
            toast.success('Report submitted. Thank you for making SynC safer.');

            // Show block confirmation instead of closing immediately
            setShowBlockConfirm(true);
        } catch (error: any) {
            console.error('Report submission failed:', error);
            toast.error(error.message || 'Failed to submit report');
            setIsSubmitting(false);
        }
    };

    const handleBlockUser = async () => {
        try {
            await blockService.blockUser(senderId);
            toast.success(`Blocked ${senderName || 'user'}`);

            // Trigger updates
            window.dispatchEvent(new Event('conversation-updated'));
            window.dispatchEvent(new Event('friend-updated'));

            onClose();
        } catch (error: any) {
            console.error('Failed to block user:', error);
            toast.error('Failed to block user. Please try again later.');
            onClose();
        }
    };

    const handleClose = () => {
        // Reset state on close
        setShowBlockConfirm(false);
        setSelectedReason(null);
        setDescription('');
        setIsSubmitting(false);
        onClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-4">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2">
                                        {showBlockConfirm ? (
                                            <>
                                                <ShieldAlert className="w-5 h-5 text-red-500" />
                                                Report Submitted
                                            </>
                                        ) : (
                                            <>
                                                <ShieldAlert className="w-5 h-5 text-red-500" />
                                                Report Message
                                            </>
                                        )}
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {showBlockConfirm ? (
                                    <div className="mt-4">
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                                            <ShieldAlert className="h-6 w-6 text-red-600" aria-hidden="true" />
                                        </div>
                                        <div className="mt-3 text-center sm:mt-5">
                                            <h3 className="text-lg font-medium leading-6 text-gray-900">
                                                Block {senderName || 'User'}?
                                            </h3>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">
                                                    You successfully reported this message. Would you also like to block this user to stop receiving messages from them?
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                            <button
                                                type="button"
                                                className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                                                onClick={handleBlockUser}
                                            >
                                                Yes, Block
                                            </button>
                                            <button
                                                type="button"
                                                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                                                onClick={handleClose}
                                            >
                                                No, Thanks
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mt-2 space-y-4">
                                            <p className="text-sm text-gray-500">
                                                Does this message go against our community guidelines? Select a reason below.
                                            </p>

                                            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                                                {REPORT_REASONS.map((reason) => (
                                                    <div
                                                        key={reason.value}
                                                        onClick={() => setSelectedReason(reason.value)}
                                                        className={`flex items-start p-3 rounded-lg cursor-pointer border transition-colors ${selectedReason === reason.value
                                                            ? 'bg-red-50 border-red-200'
                                                            : 'bg-white border-gray-100 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <span className="text-xl mr-3">{reason.emoji}</span>
                                                        <div>
                                                            <p className={`text-sm font-medium ${selectedReason === reason.value ? 'text-red-900' : 'text-gray-900'
                                                                }`}>
                                                                {reason.label}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                {reason.description}
                                                            </p>
                                                        </div>
                                                        {selectedReason === reason.value && (
                                                            <div className="ml-auto">
                                                                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm ring-1 ring-red-100" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-4">
                                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Additional Details (Optional)
                                                </label>
                                                <textarea
                                                    id="description"
                                                    rows={3}
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none"
                                                    placeholder="Please provide any other relevant info..."
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-6 flex justify-end gap-3">
                                            <button
                                                type="button"
                                                className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                                onClick={onClose}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!selectedReason || isSubmitting}
                                                className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors ${!selectedReason || isSubmitting
                                                    ? 'bg-gray-300 cursor-not-allowed'
                                                    : 'bg-red-600 hover:bg-red-700'
                                                    }`}
                                                onClick={handleSubmit}
                                            >
                                                {isSubmitting ? 'Submitting...' : 'Submit Report'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
