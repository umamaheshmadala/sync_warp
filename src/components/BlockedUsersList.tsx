import React from 'react';
import { useBlockedUsers, useUnblockUser } from '../hooks/useBlock';

export const BlockedUsersList: React.FC = () => {
  const { data: blockedUsers, isLoading, error } = useBlockedUsers();
  const unblockMutation = useUnblockUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to load blocked users. Please try again.
      </div>
    );
  }

  if (!blockedUsers || blockedUsers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No blocked users</p>
        <p className="text-sm mt-2">Users you block will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {blockedUsers.map((block) => {
        const user = block.blocked_user;
        if (!user) return null;

        return (
          <div
            key={block.id}
            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 
              rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name || user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                    {(user.display_name || user.username)?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>

              {/* User info */}
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {user.display_name || user.username}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{user.username}
                </p>
                {block.reason && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Reason: {block.reason}
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Blocked on {new Date(block.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Unblock button */}
            <button
              onClick={() => unblockMutation.mutate(block.blocked_id)}
              disabled={unblockMutation.isPending}
              className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 
                text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {unblockMutation.isPending ? 'Unblocking...' : 'Unblock'}
            </button>
          </div>
        );
      })}
    </div>
  );
};
