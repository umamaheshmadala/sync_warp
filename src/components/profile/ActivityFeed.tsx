import React from 'react';
import { Activity, MessageSquare, Heart, Star, TrendingUp, Clock } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'offer' | 'message' | 'like' | 'review' | 'achievement';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}

export const ActivityFeed: React.FC = () => {
  // Mock data - replace with actual data from API
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'offer',
      title: 'New offer posted',
      description: 'Your offer "Premium Business Package" was published',
      timestamp: '2 hours ago',
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />
    },
    {
      id: '2',
      type: 'message',
      title: 'New message received',
      description: 'John Doe sent you a message about your offer',
      timestamp: '5 hours ago',
      icon: <MessageSquare className="w-5 h-5 text-green-600" />
    },
    {
      id: '3',
      type: 'like',
      title: 'Someone liked your offer',
      description: '3 people liked your "Web Development Services" offer',
      timestamp: '1 day ago',
      icon: <Heart className="w-5 h-5 text-red-600" />
    },
    {
      id: '4',
      type: 'review',
      title: 'New review received',
      description: 'Sarah gave you a 5-star review',
      timestamp: '2 days ago',
      icon: <Star className="w-5 h-5 text-yellow-600" />
    },
    {
      id: '5',
      type: 'achievement',
      title: 'Achievement unlocked',
      description: 'You completed 10 successful deals!',
      timestamp: '3 days ago',
      icon: <Star className="w-5 h-5 text-purple-600" />
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h3>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Your latest actions and updates
        </p>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-gray-200">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {activity.description}
                  </p>
                  <div className="flex items-center mt-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {activity.timestamp}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No recent activity yet
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Your activities will appear here
            </p>
          </div>
        )}
      </div>

      {/* View All Button */}
      {activities.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
};
