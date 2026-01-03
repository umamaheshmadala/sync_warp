import React, { useState } from 'react';
import { useBlockUser } from '../hooks/useBlock';

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  onConfirm?: () => void;
}

export const BlockUserDialog: React.FC<BlockUserDialogProps> = ({
  open,
  onOpenChange,
  userId,
  username,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const blockMutation = useBlockUser();

  if (!open) return null;

  const handleBlock = () => {
    blockMutation.mutate(
      { userId, reason: reason || undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          onConfirm?.();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold mb-4">Block {username}?</h2>
        
        <div className="space-y-4 mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            Once you block {username}, they will no longer be able to:
          </p>
          
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>See your profile or posts</li>
            <li>Message you</li>
            <li>Send you friend requests</li>
            <li>Follow you</li>
          </ul>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You will be unfriended automatically and they won't be notified.
          </p>

          <div>
            <label className="block text-sm font-medium mb-2">
              Reason (optional, private)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you blocking this user?"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={200}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 
              hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            disabled={blockMutation.isPending}
          >
            Cancel
          </button>
          
          <button
            onClick={handleBlock}
            disabled={blockMutation.isPending}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {blockMutation.isPending ? 'Blocking...' : 'Block User'}
          </button>
        </div>
      </div>
    </div>
  );
};
