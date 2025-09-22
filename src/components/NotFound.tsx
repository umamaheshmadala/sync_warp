// src/components/NotFound.tsx
// 404 error page with helpful navigation and search functionality

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Home, Search, MapPin, AlertCircle } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const goBack = () => {
    window.history.length > 1 ? navigate(-1) : navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* 404 Error Display */}
        <div className="mb-8">
          <div className="relative">
            <h1 className="text-9xl font-bold text-indigo-100 select-none">404</h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <AlertCircle className="h-24 w-24 text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Oops! Page not found
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            The page you're looking for seems to have wandered off.
          </p>
          <p className="text-gray-500">
            Don't worry, even the best explorers sometimes take a wrong turn!
          </p>
        </div>

        {/* Search Box */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for businesses, deals, or anything..."
                className="w-full px-4 py-3 pl-12 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <button
                type="submit"
                className="absolute right-2 top-2 px-4 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Navigation Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button
            onClick={goBack}
            className="flex items-center justify-center px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Go Back
          </button>
          
          <Link
            to="/"
            className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Home className="h-5 w-5 mr-2" />
            Home
          </Link>
          
          <Link
            to="/dashboard"
            className="flex items-center justify-center px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MapPin className="h-5 w-5 mr-2" />
            Dashboard
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="border-t border-gray-200 pt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Popular destinations
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              to="/search"
              className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Find Deals
            </Link>
            <Link
              to="/profile"
              className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              My Profile
            </Link>
            <Link
              to="/settings"
              className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Settings
            </Link>
            <Link
              to="/auth/login"
              className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Login
            </Link>
          </div>
        </div>

        {/* Fun Facts */}
        <div className="mt-12 p-6 bg-indigo-50 rounded-lg">
          <h4 className="text-sm font-medium text-indigo-900 mb-2">
            Did you know?
          </h4>
          <p className="text-sm text-indigo-700">
            404 errors got their name from a room number at CERN where the web was invented. 
            Room 404 was where researchers went to find missing files!
          </p>
        </div>
      </div>
    </div>
  )
}