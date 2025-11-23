// src/components/Settings.tsx
// App settings and preferences page

import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import {
  Bell,
  Shield,
  Mail,
  Moon,
  Sun,
  Eye,
  LogOut
} from 'lucide-react'

export default function Settings() {
  const { signOut } = useAuthStore()
  const [notifications, setNotifications] = useState({
    deals: true,
    friends: true,
    email: false,
    push: true
  })
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    locationSharing: false,
    activityStatus: true
  })
  const [darkMode, setDarkMode] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account preferences and app settings</p>
      </div>

      <div className="space-y-8">
        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <Bell className="h-5 w-5 text-indigo-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Deal alerts</h3>
                <p className="text-sm text-gray-500">Get notified about new deals in your area</p>
              </div>
              <button
                onClick={() => setNotifications(prev => ({ ...prev, deals: !prev.deals }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.deals ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.deals ? 'translate-x-6' : 'translate-x-1'
                  }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Friend activity</h3>
                <p className="text-sm text-gray-500">See when friends save deals or write reviews</p>
              </div>
              <button
                onClick={() => setNotifications(prev => ({ ...prev, friends: !prev.friends }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.friends ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.friends ? 'translate-x-6' : 'translate-x-1'
                  }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Email notifications</h3>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <button
                onClick={() => setNotifications(prev => ({ ...prev, email: !prev.email }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.email ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.email ? 'translate-x-6' : 'translate-x-1'
                  }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Push notifications</h3>
                <p className="text-sm text-gray-500">Receive push notifications on your device</p>
              </div>
              <button
                onClick={() => setNotifications(prev => ({ ...prev, push: !prev.push }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.push ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.push ? 'translate-x-6' : 'translate-x-1'
                    < Moon className="h-5 w-5 text-indigo-600 mr-3" />
                ) : (
                <Sun className="h-5 w-5 text-indigo-600 mr-3" />
            )}
                <h2 className="text-xl font-semibold text-gray-900">Appearance</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Dark mode</h3>
                <p className="text-sm text-gray-500">Use dark theme for better viewing in low light</p>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`} />
              </button>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Account</h2>

            <div className="space-y-3">
              <button className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg text-left">
                <Shield className="h-5 w-5 mr-3" />
                Change Password
              </button>

              <button className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg text-left">
                <Mail className="h-5 w-5 mr-3" />
                Update Email
              </button>

              <button className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg text-left">
                <Eye className="h-5 w-5 mr-3" />
                Download My Data
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg text-left"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign Out
              </button>

              <button className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg text-left">
                <Shield className="h-5 w-5 mr-3" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
      )
}