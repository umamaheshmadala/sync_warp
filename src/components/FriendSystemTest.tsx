// src/components/FriendSystemTest.tsx
import React, { useState } from 'react'
import { Users, UserPlus, MessageSquare } from 'lucide-react'
import { useNewFriends } from '../hooks/useNewFriends'
import ContactsSidebar from './ContactsSidebarWithTabs'
import AddFriend from './AddFriend'
import ShareDeal from './ShareDealSimple'

const FriendSystemTest: React.FC = () => {
  const {
    friends,
    friendRequests,
    loading,
    totalFriends,
    onlineCount
  } = useNewFriends()

  const [showContactsSidebar, setShowContactsSidebar] = useState(false)
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [showShareDeal, setShowShareDeal] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Friend System Test 🚀
          </h1>
          <p className="text-gray-600 mb-8">
            Testing the new friend system with tabs, real-time updates, and improved UX
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-xl text-white">
              <div className="flex items-center">
                <Users className="h-8 w-8 mb-2" />
                <div className="ml-4">
                  <p className="text-3xl font-bold">{totalFriends}</p>
                  <p className="text-blue-100">Total Friends</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-xl text-white">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center mr-4">
                  <div className="h-4 w-4 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <p className="text-3xl font-bold">{onlineCount}</p>
                  <p className="text-green-100">Online Now</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 rounded-xl text-white">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 mb-2" />
                <div className="ml-4">
                  <p className="text-3xl font-bold">{friendRequests.length}</p>
                  <p className="text-purple-100">Friend Requests</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 rounded-xl text-white">
              <div className="flex items-center">
                <UserPlus className="h-8 w-8 mb-2" />
                <div className="ml-4">
                  <p className="text-3xl font-bold">∞</p>
                  <p className="text-orange-100">Potential Friends</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <button
              onClick={() => setShowContactsSidebar(true)}
              className="flex items-center justify-center space-x-3 bg-indigo-600 text-white px-6 py-4 rounded-xl hover:bg-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Users className="h-6 w-6" />
              <span className="text-lg font-medium">View Friends & Requests</span>
              {friendRequests.length > 0 && (
                <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full">
                  {friendRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowAddFriend(true)}
              className="flex items-center justify-center space-x-3 bg-green-600 text-white px-6 py-4 rounded-xl hover:bg-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <UserPlus className="h-6 w-6" />
              <span className="text-lg font-medium">Add New Friends</span>
            </button>

            <button
              onClick={() => setShowShareDeal(true)}
              className="flex items-center justify-center space-x-3 bg-purple-600 text-white px-6 py-4 rounded-xl hover:bg-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <MessageSquare className="h-6 w-6" />
              <span className="text-lg font-medium">Test Share Deal</span>
            </button>
          </div>

          {/* Feature List */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">✨ New Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Tabbed interface (Friends & Requests)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Real-time friend status updates</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Live badge count updates</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Enhanced search and filtering</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Improved friend request handling</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Smooth animations and transitions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ContactsSidebar
        isOpen={showContactsSidebar}
        onClose={() => setShowContactsSidebar(false)}
      />

      <AddFriend
        isOpen={showAddFriend}
        onClose={() => setShowAddFriend(false)}
      />

      <ShareDeal
        friendId="test-friend"
        friendName="Test Friend"
        isOpen={showShareDeal}
        onClose={() => setShowShareDeal(false)}
      />
    </div>
  )
}

export default FriendSystemTest