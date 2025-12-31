import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>

                    <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Delete Account?</h3>

                    <div className="text-center text-gray-600 mb-6 space-y-2">
                        <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                        <p className="text-sm bg-red-50 text-red-700 py-2 px-3 rounded-md">
                            All your data, including friends, messages, and saved items, will be permanently removed.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                        >
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
