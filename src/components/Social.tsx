// src/components/Social.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Users, MessageCircle, Share2, Heart, UserPlus, Bell } from 'lucide-react';
import { FriendIntegration } from './FriendIntegration';

const Social: React.FC = () => {
  // Sample data for demonstration
  const friends = [
    { id: 1, name: 'Priya Sharma', avatar: '👩‍💼', status: 'online', sharedDeals: 5 },
    { id: 2, name: 'Rahul Kumar', avatar: '👨‍💻', status: 'offline', sharedDeals: 12 },
    { id: 3, name: 'Sneha Patel', avatar: '👩‍🎓', status: 'online', sharedDeals: 8 }
  ];

  const activities = [
    { id: 1, user: 'Priya', action: 'shared a deal', item: '20% off at Café Coffee Day', time: '2h ago' },
    { id: 2, user: 'Rahul', action: 'saved a deal', item: 'Buy 1 Get 1 Free Pizza', time: '4h ago' },
    { id: 3, user: 'Sneha', action: 'liked your share', item: '50% off Fashion Store', time: '1d ago' }
  ];

  const stats = [
    { label: 'Friends', value: '24', icon: Users, color: 'text-blue-600' },
    { label: 'Shared Deals', value: '18', icon: Share2, color: 'text-green-600' },
    { label: 'Likes Received', value: '47', icon: Heart, color: 'text-red-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Social</h1>
              <p className="text-gray-600">Connect and share deals</p>
            </div>
          </div>
          <button className="p-2 bg-blue-600 text-white rounded-full">
            <UserPlus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex flex-col items-center text-center">
                  <IconComponent className={`h-6 w-6 mb-2 ${stat.color}`} />
                  <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Friends List */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Friends</h2>
          <button className="text-blue-600 text-sm font-medium">View All</button>
        </div>

        <div className="space-y-3">
          {friends.map((friend, index) => (
            <motion.div
              key={friend.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                      {friend.avatar}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{friend.name}</h3>
                    <p className="text-sm text-gray-500">
                      Shared {friend.sharedDeals} deals this week
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <MessageCircle className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-4 pb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Bell className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.user}</span> {activity.action}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{activity.item}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-left"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Share2 className="h-6 w-6 text-blue-600 mb-2" />
            <div className="font-medium text-gray-900">Share Deal</div>
            <div className="text-sm text-gray-500">Share with friends</div>
          </motion.button>
          
          <motion.button
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-left"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <UserPlus className="h-6 w-6 text-green-600 mb-2" />
            <div className="font-medium text-gray-900">Find Friends</div>
            <div className="text-sm text-gray-500">Invite contacts</div>
          </motion.button>
        </div>
      </div>

      {/* Friend Management Integration */}
      <FriendIntegration />
    </div>
  );
};

export default Social;
