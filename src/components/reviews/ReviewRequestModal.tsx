import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock, X, MessageSquare } from 'lucide-react';
import { recordRequestResponse } from '../../services/reviewRequestService';
import { toast } from 'react-hot-toast';

interface ReviewRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string;
    businessName: string;
    checkinId: string;
    onWriteReview: () => void;
}

const ReviewRequestModal: React.FC<ReviewRequestModalProps> = ({
    isOpen,
    onClose,
    businessId,
    businessName,
    checkinId,
    onWriteReview
}) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleResponse = async (response: 'now' | 'later' | 'never') => {
        setIsLoading(true);

        try {
            await recordRequestResponse(checkinId, response);

            if (response === 'now') {
                onWriteReview();
            } else if (response === 'later') {
                toast.success("We'll remind you in 4 hours!");
            }

            onClose();
        } catch (error) {
            console.error('Error recording response:', error);
            // Even if recording fails, proceed with the action to not block user
            if (response === 'now') onWriteReview();
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
                    >
                        <div className="relative p-6 text-center">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageSquare className="w-8 h-8 text-blue-600" />
                            </div>

                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                                How was {businessName}?
                            </h2>

                            <p className="text-gray-600 mb-6">
                                Share your experience to help others discover great places!
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleResponse('now')}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    <Star className="w-4 h-4 mr-2" />
                                    Write Review Now
                                </button>

                                <button
                                    onClick={() => handleResponse('later')}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    <Clock className="w-4 h-4 mr-2" />
                                    Remind Me Later
                                </button>

                                <button
                                    onClick={() => handleResponse('never')}
                                    disabled={isLoading}
                                    className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
                                >
                                    Not Interested
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ReviewRequestModal;
