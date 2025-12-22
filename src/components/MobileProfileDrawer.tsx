// src/components/MobileProfileDrawer.tsx
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useBusinessUrl } from '../hooks/useBusinessUrl'
import {
  X,
  User,
  Settings,
  LogOut,
  Store,
  ChevronRight,
  MapPin,
  MessageCircle,
  PlusCircle
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Business {
  id: string
  name: string
  category: string
  logo_url?: string
}

interface MobileProfileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileProfileDrawer({ isOpen, onClose }: MobileProfileDrawerProps) {
  const navigate = useNavigate()
  const { getBusinessUrl } = useBusinessUrl()
  const { user, profile, signOut } = useAuthStore()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(true)

  // Fetch user's businesses
  useEffect(() => {
    const fetchBusinesses = async () => {
      if (!user?.id) return

      setLoadingBusinesses(true)
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('id, name, category, logo_url')
          .eq('owner_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (error) throw error
        setBusinesses(data || [])
      } catch (error) {
        console.error('Error fetching businesses:', error)
        setBusinesses([])
      } finally {
        setLoadingBusinesses(false)
      }
    }

    if (isOpen) {
      fetchBusinesses()
    }
  }, [isOpen, user?.id])

  const handleNavigation = (path: string) => {
    navigate(path)
    onClose()
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
    navigate('/auth/login')
  }

  if (!isOpen) return null

  // Format interests for display
  const displayInterests = profile?.interests && profile.interests.length > 0
    ? profile.interests.join(' • ')
    : 'No interests selected'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9999] md:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`
          fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-[10000] 
          transform transition-transform duration-300 ease-in-out
          md:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Profile Section */}
          <div className="p-6 pb-4">
            {/* Avatar */}
            <div className="mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'User'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (profile?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()
                )}
              </div>
            </div>

            {/* User Name */}
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {profile?.full_name || user?.user_metadata?.full_name || 'User'}
            </h2>

            {/* Interests - replacing job description */}
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Interests:</span> {displayInterests}
            </p>

            {/* Location */}
            {profile?.city && (
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="w-4 h-4 mr-1" />
                <span>{profile.city}</span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200" />

          {/* Profile Analytics (like LinkedIn) */}
          <div className="px-6 py-4">
            <button
              onClick={() => handleNavigation('/profile')}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View Profile
            </button>
          </div>

          <div className="border-t border-gray-200" />

          {/* Business Section */}
          <div className="px-6 py-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Businesses
            </h3>

            <div className="space-y-2">
              {businesses.map((business) => (
                <button
                  key={business.id}
                  onClick={() => handleNavigation(getBusinessUrl(business.id, business.name))}
                  className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Business Logo */}
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                    {business.logo_url ? (
                      <img
                        src={business.logo_url}
                        alt={business.name}
                        className="w-full h-full rounded-lg object-cover"
                      />
                    ) : (
                      <Store className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>

                  {/* Business Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {business.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {business.category}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}

              {/* Register New Business Button */}
              <button
                onClick={() => handleNavigation('/business/register')}
                className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0 group-hover:border-indigo-400 transition-colors">
                  <PlusCircle className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600 group-hover:text-indigo-600">
                    Register New Business
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {/* Menu Items */}
          <div className="py-2">
            {/* Messages */}
            <button
              onClick={() => handleNavigation('/messages')}
              className="w-full flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <MessageCircle className="w-5 h-5 mr-3 text-gray-500" />
              <span className="text-sm font-medium">Messages</span>
            </button>

            {/* View Profile */}
            <button
              onClick={() => handleNavigation('/profile')}
              className="w-full flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <User className="w-5 h-5 mr-3 text-gray-500" />
              <span className="text-sm font-medium">Profile</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => handleNavigation('/settings')}
              className="w-full flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-5 h-5 mr-3 text-gray-500" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          </div>

          <div className="border-t border-gray-200" />

          {/* Sign Out */}
          <div className="py-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-6 py-3 text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>

          {/* Bottom Padding */}
          <div className="h-8" />
        </div>
      </div>
    </>
  )
}
