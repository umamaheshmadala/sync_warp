import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  User,
  Users,
  Check,
  X,
  Loader,
  AlertCircle,
  Mail,
  UserPlus,
  Star,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSharingLimits } from '../../hooks/useSharingLimits';
import { toast } from 'react-hot-toast';

export interface FriendUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface FriendSelectorProps {
  onSelect: (friendId: string, friendEmail: string) => void;
  onCancel: () => void;
  currentUserId: string;
  className?: string;
}

const FriendSelector: React.FC<FriendSelectorProps> = ({
  onSelect,
  onCancel,
  currentUserId,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<FriendUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { stats: sharingStats, checkCanShare } = useSharingLimits();

  // Fetch all users (or friends in future)
  useEffect(() => {
    loadUsers();
  }, [currentUserId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          friend:profiles!friendships_friend_id_fkey(*)
        `)
        .eq('user_id', currentUserId)
        .eq('status', 'active');

      if (error) throw error;

      const friends = (friendships || []).map((f: any) => f.friend).filter(Boolean);
      
      setUsers(friends);
    } catch (err) {
      console.error('Error in loadUsers:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;

    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      user.email.toLowerCase().includes(term) ||
      user.full_name?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  // Get sharing stats for a specific friend
  const getFriendSharingStats = (friendId: string) => {
    if (!sharingStats?.friends_shared_with) return null;
    return sharingStats.friends_shared_with.find(f => f.recipient_id === friendId);
  };

  // Check if can share to this friend
  const canShareToFriend = async (friendId: string) => {
    try {
      const result = await checkCanShare(friendId);
      return result.can_share; // Fix: use can_share (snake_case)
    } catch (err) {
      console.error('Error checking if can share:', err);
      return false;
    }
  };

  // Handle user selection
  const handleSelectUser = async (user: FriendUser) => {
    console.log('👥 [FriendSelector] User selected:', user.full_name || user.email);
    setSelectedUser(user);
    
    // Check if can share to this friend
    console.log('🔍 [FriendSelector] Checking sharing limits...');
    const canShareResult = await checkCanShare(user.id);
    console.log('✅ [FriendSelector] Can share result:', canShareResult);
    
    if (!canShareResult.can_share) { // Fix: use can_share (snake_case) not canShare
      const friendStats = getFriendSharingStats(user.id);
      const limit = sharingStats?.per_friend_limit || 3;
      const shared = friendStats?.count || 0;
      
      console.warn('⚠️ [FriendSelector] Cannot share - Reason:', canShareResult.reason);
      
      // Show the actual reason from the check, not a generic message
      toast.error(canShareResult.reason || `You've already shared ${shared}/${limit} coupons with ${user.full_name || user.email} today`);
      setSelectedUser(null);
      return;
    }
    
    console.log('✅ [FriendSelector] User can be selected for sharing');
  };

  // Handle confirm selection
  const handleConfirm = () => {
    if (!selectedUser) return;
    onSelect(selectedUser.id, selectedUser.email);
  };

  // Get display name for user
  const getDisplayName = (user: FriendUser) => {
    return user.full_name || user.email.split('@')[0];
  };

  // Get user initials for avatar
  const getUserInitials = (user: FriendUser) => {
    const name = getDisplayName(user);
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Select a Friend
          </h3>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            autoFocus
          />
        </div>

        {/* Sharing Stats Summary */}
        {sharingStats && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between text-xs text-blue-700">
              <span>You've shared {sharingStats.total_shared_today} coupons today</span>
              <span className="font-medium">
                {sharingStats.remaining_today || 0} remaining
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <p className="text-sm text-red-600 text-center">{error}</p>
            <button
              onClick={loadUsers}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Try Again
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <User className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-600 text-center">
              {searchTerm ? 'No friends found matching your search' : 'No friends yet'}
            </p>
            {!searchTerm && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Add friends to share coupons with them
              </p>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filteredUsers.map((user) => {
              const friendStats = getFriendSharingStats(user.id);
              const isSelected = selectedUser?.id === user.id;
              const sharedCount = friendStats?.count || 0;
              const limit = sharingStats?.per_friend_limit || 3;
              const atLimit = sharedCount >= limit;

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-2 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-50 border-blue-200' : ''
                  } ${atLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !atLimit && handleSelectUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={getDisplayName(user)}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-xs">
                            {getUserInitials(user)}
                          </div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {getDisplayName(user)}
                          </p>
                          {friendStats && sharedCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                              <Star className="w-3 h-3" />
                              {sharedCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                          <Mail className="w-3 h-3 mr-1" />
                          {user.email}
                        </div>
                        {/* Sharing Stats */}
                        {friendStats ? (
                          <div className="mt-1 text-xs text-gray-600">
                            Shared {sharedCount}/{limit} today
                            {atLimit && (
                              <span className="ml-2 text-red-600 font-medium">
                                (Limit reached)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                            <UserPlus className="w-3 h-3" />
                            Can share with this friend
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0 ml-3">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer - Confirm Button */}
      {selectedUser && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 border-t border-gray-200 bg-gray-50"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-xs">
                {getUserInitials(selectedUser)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {getDisplayName(selectedUser)}
                </p>
                <p className="text-xs text-gray-500">{selectedUser.email}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedUser(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Check className="w-4 h-4" />
              Confirm
            </button>
          </div>
        </motion.div>
      )}

      {/* Empty State - No Selection */}
      {!selectedUser && !loading && filteredUsers.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500 text-center">
            Select a friend to share your coupon with
          </p>
        </div>
      )}
    </div>
  );
};

export default FriendSelector;
