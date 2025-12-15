import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Clock,
  MessageCircle,
  Share2,
  Search,
  Filter,
  User,
  Check,
  X,
  MapPin,
  Heart,
  MoreHorizontal
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useFriends } from '../hooks/friends/useFriends';
import { useReceivedFriendRequests } from '../hooks/friends/useFriendRequests';
import { useFriendActions } from '../hooks/friends/useFriendActions';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { toast } from 'react-hot-toast';
import AddFriend from './AddFriend';
import ShareDeal from './ShareDealSimple';
import type { Friend } from '../services/newFriendService';
import { NoRequestsEmptyState } from './friends/EmptyStates';
import { FriendsListSkeleton } from './ui/skeletons/FriendsListSkeleton';

type TabType = 'friends' | 'requests' | 'add' | 'activity';

const FriendsManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data: friends = [], isLoading: loading } = useFriends();
  const { data: receivedRequests = [] } = useReceivedFriendRequests();
  const { acceptRequest, rejectRequest, unfriend } = useFriendActions();
  const { triggerHaptic } = useHapticFeedback();

  const totalFriends = friends.length;
  const onlineCount = friends.filter((f: any) => f.friend?.is_online).length;

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOnline, setFilterOnline] = useState(false);
  const [showShareDeal, setShowShareDeal] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<Set<string>>(new Set());

  // Filter friends based on search and online status
  const getFilteredFriends = () => {
    let filteredFriends = friends;

    if (filterOnline) {
      filteredFriends = filteredFriends.filter((f: any) => f.friend?.is_online);
    }

    if (searchQuery) {
      filteredFriends = filteredFriends.filter((f: any) =>
        f.friend?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.friend?.city && f.friend.city.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filteredFriends;
  };

  const filteredFriends = getFilteredFriends();

  // Handle friend request actions
  const handleAcceptRequest = (requestId: string) => {
    setProcessingRequest(prev => new Set(prev).add(requestId));

    acceptRequest.mutate(requestId, {
      onSuccess: (result) => {
        if (result.success) {
          triggerHaptic('success');
          toast.success('Friend request accepted!');
        } else {
          triggerHaptic('error');
          toast.error(result.error || 'Failed to accept request');
        }
        setProcessingRequest(prev => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      },
      onError: (error) => {
        console.error('Error accepting friend request:', error);
        triggerHaptic('error');
        toast.error('Failed to accept friend request');
        setProcessingRequest(prev => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      }
    });
  };

  const handleRejectRequest = (requestId: string) => {
    setProcessingRequest(prev => new Set(prev).add(requestId));

    rejectRequest.mutate(requestId, {
      onSuccess: (result) => {
        if (result.success) {
          triggerHaptic('light');
          toast.success('Friend request declined');
        } else {
          triggerHaptic('error');
          toast.error(result.error || 'Failed to decline request');
        }
        setProcessingRequest(prev => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      },
      onError: (error) => {
        console.error('Error rejecting friend request:', error);
        triggerHaptic('error');
        toast.error('Failed to decline friend request');
        setProcessingRequest(prev => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      }
    });
  };

  const handleRemoveFriend = async (friend: any) => {
    if (confirm(`Remove ${friend.friend?.full_name} from friends?`)) {
      try {
        unfriend.mutate(friend.friend?.id, {
          onSuccess: () => {
            triggerHaptic('success');
          }
        });
      } catch (error) {
        console.error('Error removing friend:', error);
      }
    }
  };

  const formatLastActive = (lastActive: string): string => {
    if (!lastActive) return 'Offline';
    const date = new Date(lastActive);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const tabs = [
    { id: 'friends', label: 'Friends', icon: Users, count: totalFriends },
    { id: 'requests', label: 'Requests', icon: Clock, count: receivedRequests.length },
    { id: 'add', label: 'Add Friends', icon: UserPlus, count: null },
    { id: 'activity', label: 'Activity', icon: MessageCircle, count: null }
  ];

  if (loading && friends.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 px-4">
        <div className="max-w-4xl mx-auto">
          <FriendsListSkeleton count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Friends</h1>
              <p className="text-gray-600">
                {totalFriends} friends • {onlineCount} online
                {receivedRequests.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                    {receivedRequests.length} pending
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mt-4 flex items-center space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setFilterOnline(!filterOnline)}
              className={`px-4 py-2 rounded-lg border font-medium transition-colors ${filterOnline
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
              <Filter className="w-4 h-4 mr-2 inline" />
              Online
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-gray-100 text-gray-900'
                      }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div className="space-y-4">
                {filteredFriends.length > 0 ? (
                  filteredFriends.map((friend: any) => (
                    <div
                      key={friend.friend?.id || Math.random()}
                      className="bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-400" />
                            </div>
                            {friend.friend?.is_online && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {friend.friend?.full_name}
                            </h3>
                            <div className="flex items-center text-sm text-gray-500">
                              {friend.friend?.city && (
                                <>
                                  <MapPin className="w-3 h-3 mr-1" />
                                  <span className="mr-3">{friend.friend.city}</span>
                                </>
                              )}
                              <span>
                                {friend.friend?.is_online
                                  ? 'Online'
                                  : `Last seen ${formatLastActive(friend.friend?.last_active)}`
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setShowShareDeal(friend.friend?.id)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
                            title="Share Deal"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => console.log('Message:', friend.friend?.full_name)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                            title="Send Message"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveFriend(friend)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                            title="Remove Friend"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No friends found</h3>
                    <p className="text-gray-500 mb-4">
                      {searchQuery ? 'Try adjusting your search' : 'Start building your network'}
                    </p>
                    <button
                      onClick={() => setActiveTab('add')}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Friends
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Friend Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                {receivedRequests.length > 0 ? (
                  receivedRequests.map((request: any) => (
                    <div
                      key={request.id}
                      className="bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {request.sender?.full_name || 'Unknown User'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {request.sender?.city && (
                                <>
                                  <MapPin className="w-3 h-3 inline mr-1" />
                                  {request.sender.city}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={processingRequest.has(request.id)}
                            className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={processingRequest.has(request.id)}
                            className="inline-flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <NoRequestsEmptyState />
                )}
              </div>
            )}

            {/* Add Friends Tab */}
            {activeTab === 'add' && (
              <div className="bg-white rounded-lg border p-6">
                <AddFriend />
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Friend Activity</h3>
                <p className="text-gray-500">Activity feed coming soon!</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Share Deal Modal */}
      {showShareDeal && (
        <ShareDeal
          recipientId={showShareDeal}
          onClose={() => setShowShareDeal(null)}
        />
      )}
    </div>
  );
};

export default FriendsManagementPage;