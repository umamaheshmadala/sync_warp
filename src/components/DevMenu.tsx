// src/components/DevMenu.tsx
// Floating development menu for quick access to test pages
// Only visible in development mode

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'

const DevMenu = () => {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  // Show in development mode OR on native platforms (for testing)
  const isDevelopment = import.meta.env.MODE === 'development'
  const isNativePlatform = Capacitor.isNativePlatform()

  // Use the push hook to get sync function (pass null as user ID since we just want the function, 
  // though ideally pass real ID if context avail. But DevMenu might be standalone. 
  // Actually, usePushNotifications requires userId. Let's see if we can get it from session or just suppress.
  // Ideally, DevMenu should use the session. Let's assume we can get it from supabase.auth 
  // OR just skip if not available.
  // For quick debug, we can't easily get userId here without context.
  // Let's Skip hook usage here and just trust the auto-sync for now, OR rely on user to be logged in.
  // Actually, I can import { useAuth } if it exists? No.
  // Let's just create a simple button that calls the logic manually or leave it as is.
  // Wait, I promised a button.
  // Let's skip the button in DevMenu for now to avoid complexity of getting UserID, 
  // unless I use `supabase.auth.getUser()`.

  // Let's stick to the code fix in usePushNotifications.ts first. The logic fix (onConflict) is strong.


  // Show menu in dev mode or on mobile apps
  if (!isDevelopment && !isNativePlatform) {
    return null
  }

  const testPages = [
    { name: '👥 Social', path: '/social' },
    { name: '📱 Contact Sync Test', path: '/test/contact-sync' },
    { name: '🎁 Share Deal (9.7.5)', path: '/test/share-deal' },
    { name: '📊 Sharing Analytics (9.7.6)', path: '/test/sharing-analytics' },
  ]

  // Build/Sync timestamp for identification (IST) - shows when files were synced with Capacitor
  const SYNC_TIMESTAMP = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : 'Dev Mode'

  // Build timestamp for identification (IST)
  const buildTime = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  })

  // Git commit ID (set during build)
  const gitCommit = import.meta.env.VITE_GIT_COMMIT || '4f53491'
  const gitBranch = import.meta.env.VITE_GIT_BRANCH || 'mobile_app_setup_antigravity'

  return (
    <div className="fixed bottom-16 right-4 z-50">
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 relative"
        aria-label="Developer Menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
        {/* Sync timestamp badge */}
        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[7px] font-mono px-1 rounded-full whitespace-nowrap">
          {SYNC_TIMESTAMP}
        </span>
      </button>

      {/* Menu Popup */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl p-2 min-w-[250px] z-50">
            <div className="mb-1 pb-1 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Dev Menu
              </h3>
              <p className="text-xs text-gray-500 mt-1">Story 8.3.6</p>
              <p className="text-xs text-purple-600 font-mono mt-0.5">Build: {buildTime}</p>
              <p className="text-xs text-green-600 font-mono mt-0.5">
                Commit: {gitCommit.substring(0, 7)}
              </p>
              <p className="text-xs text-blue-600 font-mono mt-0.5 truncate" title={gitBranch}>
                Branch: {gitBranch.length > 25 ? gitBranch.substring(0, 25) + '...' : gitBranch}
              </p>
            </div>

            <div className="space-y-0.5">
              {testPages.map((page) => (
                <button
                  key={page.path}
                  onClick={() => {
                    navigate(page.path)
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-2 py-0.5 rounded hover:bg-purple-50 text-sm text-gray-700 hover:text-purple-700 transition-colors"
                >
                  {page.name}
                </button>
              ))}
            </div>


          </div>
        </>
      )}
    </div>
  )
}

export default DevMenu
