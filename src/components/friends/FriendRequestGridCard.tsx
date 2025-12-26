
import React, { useState } from 'react';
import { User, Check, X, Loader2 } from 'lucide-react';
import { useRequestActions } from '../../hooks/friends/useRequestActions';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import toast from 'react-hot-toast';

interface FriendRequestGridCardProps {
    request: {
        id: string;
        sender: {
            id: string;
            full_name: string;
            email: string;
            avatar_url?: string;
        };
        mutual_friends_count?: number;
    };
}

export function FriendRequestGridCard({ request }: FriendRequestGridCardProps) {
    const { acceptRequest, rejectRequest, isLoading } = useRequestActions();
    const [showRejectDialog, setShowRejectDialog] = useState(false);

    const handleAccept = (e: React.MouseEvent) => {
        e.stopPropagation();
        acceptRequest(request.id, {
            onSuccess: () => toast.success(`Accepted request from ${request.sender.full_name}`)
        });
    };

    const handleReject = () => {
        rejectRequest(request.id, {
            onSuccess: () => {
                toast.success('Request rejected');
                setShowRejectDialog(false);
            }
        });
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-default p-3 flex flex-col items-center h-full w-[160px] flex-shrink-0">

                {/* Avatar */}
                <div className="flex flex-col items-center mb-2 w-full mt-2">
                    {request.sender.avatar_url ? (
                        <img
                            src={request.sender.avatar_url}
                            alt={request.sender.full_name}
                            className="w-16 h-16 rounded-full object-cover mb-2 border border-gray-100"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold mb-2">
                            {request.sender.full_name.charAt(0)}
                        </div>
                    )}

                    <h3 className="font-semibold text-gray-900 text-sm text-center truncate w-full px-1" title={request.sender.full_name}>
                        {request.sender.full_name}
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                        {request.mutual_friends_count ? `${request.mutual_friends_count} mutual friends` : 'Sent you a request'}
                    </p>
                </div>

                {/* Buttons */}
                <div className="mt-auto w-full grid grid-cols-2 gap-2">
                    <button
                        onClick={handleAccept}
                        disabled={isLoading}
                        className="flex items-center justify-center px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        title="Accept"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowRejectDialog(true); }}
                        disabled={isLoading}
                        className="flex items-center justify-center px-2 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
                        title="Reject"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showRejectDialog}
                onClose={() => setShowRejectDialog(false)}
                onConfirm={handleReject}
                title="Reject Request"
                message={`Are you sure you want to reject ${request.sender.full_name}?`}
                confirmText="Reject"
                variant="danger"
            />
        </>
    );
}
