// src/components/DevMenu.tsx
// Floating development menu for quick access to test pages
// Only visible in development mode

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DevMenu = () => {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  
  // Only show in development mode
  const isDevelopment = import.meta.env.MODE === 'development'
  
  if (!isDevelopment) {
    return null
  }

  const testPages = [
    { name: 'Storage Test (8.1.3)', path: '/test/storage' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Profile', path: '/profile' },
  ]

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
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
          <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl p-4 min-w-[250px] z-50">
            <div className="mb-3 pb-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Dev Menu
              </h3>
              <p className="text-xs text-gray-500 mt-1">Development Mode</p>
            </div>
            
            <div className="space-y-2">
              {testPages.map((page) => (
                <button
                  key={page.path}
                  onClick={() => {
                    navigate(page.path)
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-purple-50 text-sm text-gray-700 hover:text-purple-700 transition-colors"
                >
                  {page.name}
                </button>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full text-center px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DevMenu
