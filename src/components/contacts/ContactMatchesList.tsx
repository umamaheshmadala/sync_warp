/**
 * Contact Matches List
 * Story 9.2.3: Display matched contacts from sync
 */

import React from 'react';
import { Users } from 'lucide-react';
import { useContactMatches } from '../../hooks/useContactSync';
import { useSendFriendRequest } from '../../hooks/useFriendRequests';
import { useNavigate } from 'react-router-dom';

export function ContactMatchesList() {
  const { data: matches, isLoading } = useContactMatches();
  const sendFriendRequest = useSendFriendRequest();
  const navigate = useNavigate();

  if (isLoading) {
    return <ContactMatchesSkeleton />;
  }

  if (!matches || matches.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Users className="w-5 h-5 mr-2" />
        Friends from Contacts ({matches.length})
      </h3>
      
      <div className="space-y-2">
        {matches.map((match) => (
          <div
            key={match.user_id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
            onClick={() => navigate(`/profile/${match.user_id}`)}
          >
            <div className="flex items-center space-x-3">
              <img
                src={match.avatar_url || '/default-avatar.png'}
                alt={match.full_name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h4 className="font-semibold text-gray-900">{match.full_name}</h4>
                <p className="text-sm text-gray-500">@{match.username}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                sendFriendRequest.mutate(match.user_id);
              }}
              disabled={sendFriendRequest.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
            >
              Add Friend
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactMatchesSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 mb-2">
          <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
