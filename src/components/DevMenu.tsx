// src/components/DevMenu.tsx
// Floating development menu for quick access to test pages
// Only visible in development mode

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { timestamp } from 'virtual:build-info'

const DevMenu = () => {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  // The user explicitly requested to bring back this Dev Menu (which has the build timestamp).
  // Previously this was hidden in production via:
  // if (!import.meta.env.DEV) { return null }

  const testPages = [
    // { name: '📱 Contact Sync Test', path: '/test/contact-sync' },
    // { name: '🎟️ Standard Designs', path: '/test/standard-designs' },
    { name: '📣 Create Campaign Example', path: '/business/campaigns/new' },
    { name: '🏷️ Manage Coupons Example', path: '/business/tu1-test-business-3-687597da/manage/coupons' },
  ]

  // Build/Sync timestamp for identification (IST) - shows when files were synced with Capacitor
  // In dev mode, this comes from the virtual module and updates on HMR
  const SYNC_TIMESTAMP = timestamp

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
    <div className="fixed bottom-24 left-4 z-50">
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 relative"
        aria-label="Developer Menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
        {/* Sync timestamp badge - simplified for small size */}
        {/* Sync timestamp badge - simplified for small size */}
        <span className="absolute -top-3 -right-6 bg-blue-500 text-white text-[9px] font-mono px-1.5 py-0.5 rounded-full whitespace-nowrap border border-white shadow-sm z-50">
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

          {/* Menu - Aligned to bottom left now */}
          <div className="absolute bottom-10 left-0 bg-white rounded-lg shadow-xl p-2 min-w-[250px] z-50">
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
