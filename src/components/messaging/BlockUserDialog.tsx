import React from 'react'
import { Ban, ShieldOff, X } from 'lucide-react'

interface BlockUserDialogProps {
    isOpen: boolean
    isBlocked: boolean
    userName: string
    onClose: () => void
    onConfirm: () => void
}

export function BlockUserDialog({
    isOpen,
    isBlocked,
    userName,
    onClose,
    onConfirm,
}: BlockUserDialogProps) {
    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                {/* Dialog */}
                <div
                    className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            {isBlocked ? (
                                <ShieldOff className="w-6 h-6 text-green-600" />
                            ) : (
                                <Ban className="w-6 h-6 text-orange-600" />
                            )}
                            <h2 className="text-xl font-semibold">
                                {isBlocked ? `Unblock ${userName}?` : `Block ${userName}?`}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2 text-white rounded-lg font-medium ${isBlocked
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-orange-600 hover:bg-orange-700'
                                }`}
                        >
                            {isBlocked ? 'Unblock' : 'Block'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
