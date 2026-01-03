// src/components/FriendManagement.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Activity, MessageSquare, RefreshCw } from 'lucide-react';
import { useFriends } from '../hooks/friends/useFriends';
import { useReceivedFriendRequests } from '../hooks/friends/useFriendRequests';
import ContactsSidebar from './ContactsSidebarWithTabs';
import AddFriend from './AddFriend';
import FriendRequests from './FriendRequests';
import FriendActivityFeed from './FriendActivityFeed';

interface FriendManagementProps {
  className?: string;
}

const FriendManagement: React.FC<FriendManagementProps> = ({ className = '' }) => {
  const { data: friendsResponse, isLoading: loading, isRefetching } = useFriends();
  const { data: receivedRequests = [] } = useReceivedFriendRequests();

  // Extract friends array from ServiceResponse
  const friends = friendsResponse?.data || [];
  const totalFriends = friends.length;
  const onlineCount = friends.filter((f: any) => f.friend?.is_online).length;

  const [showContactsSidebar, setShowContactsSidebar] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Stats */}
      <div className="flex items-center justify-between mb-2">
        {/* Hidden title or just spacer if needed, or we just append the indicator to the container */}
      </div>
      {isRefetching && (
        <div className="flex items-center gap-2 text-xs text-indigo-600 mb-2 bg-indigo-50 w-fit px-2 py-1 rounded-full">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Updating friends...</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : totalFriends}
              </p>
              <p className="text-sm font-medium text-gray-500">Total Friends</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-green-500 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : onlineCount}
              </p>
              <p className="text-sm font-medium text-gray-500">Online Now</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : receivedRequests.length}
              </p>
              <p className="text-sm font-medium text-gray-500">Pending Requests</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : Math.floor(Math.random() * 20) + 1}
              </p>
              <p className="text-sm font-medium text-gray-500">Recent Activities</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.button
            onClick={() => setShowContactsSidebar(true)}
            className="flex flex-col items-center p-4 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Users className="h-8 w-8 text-indigo-600 mb-2" />
            <span className="text-sm font-medium text-indigo-900">View Friends</span>
            <span className="text-xs text-indigo-600">{totalFriends} friends</span>
          </motion.button>

          <motion.button
            onClick={() => setShowAddFriend(true)}
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <UserPlus className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-900">Add Friends</span>
            <span className="text-xs text-blue-600">Find new connections</span>
          </motion.button>

          <motion.button
            onClick={() => setShowFriendRequests(true)}
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors relative"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <MessageSquare className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-900">Friend Requests</span>
            <span className="text-xs text-green-600">
              {receivedRequests.length > 0 ? `${receivedRequests.length} pending` : 'No pending'}
            </span>
            {receivedRequests.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                {receivedRequests.length}
              </div>
            )}
          </motion.button>

          <motion.div
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg border border-purple-200"
            whileHover={{ scale: 1.05 }}
          >
            <Activity className="h-8 w-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-900">Activity Feed</span>
            <span className="text-xs text-purple-600">See friend activities</span>
          </motion.div>
        </div>
      </div>

      {/* Friend Activity Feed */}
      <FriendActivityFeed className="w-full" />

      {/* Modals */}
      <ContactsSidebar
        isOpen={showContactsSidebar}
        onClose={() => setShowContactsSidebar(false)}
      />

      <AddFriend
        isOpen={showAddFriend}
        onClose={() => setShowAddFriend(false)}
      />

      <FriendRequests
        isOpen={showFriendRequests}
        onClose={() => setShowFriendRequests(false)}
      />
    </div>
  );
};

export default FriendManagement;