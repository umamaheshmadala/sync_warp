// src/components/ShareDealSimple.tsx
import React, { useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { X, Send, Search, Tag, Clock, Star, AlertCircle, Heart } from 'lucide-react'
import { motion } from 'framer-motion'

interface ShareDealProps {
  friendId: string
  friendName?: string
  dealId?: string
  isOpen: boolean
  onClose: () => void
}

interface MockDeal {
  id: string
  title: string
  description: string
  price: number
  originalPrice?: number
  category: string
  imageUrl?: string
  expiresAt: string
}

const ShareDealSimple: React.FC<ShareDealProps> = ({ 
  friendId, 
  friendName = 'Friend', 
  dealId, 
  isOpen, 
  onClose 
}) => {
  const [selectedDeal, setSelectedDeal] = useState<MockDeal | null>(null)
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)

  // Mock deals data
  const mockDeals: MockDeal[] = [
    {
      id: '1',
      title: '50% off Premium Coffee ☕',
      description: 'Get premium coffee at half price',
      price: 15.99,
      originalPrice: 31.98,
      category: 'Food & Drink',
      imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=200&h=200&fit=crop',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      title: '🍕 Buy 1 Get 1 Free Pizza',
      description: 'Amazing pizza deal for friends',
      price: 24.99,
      originalPrice: 49.98,
      category: 'Food & Drink',
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop',
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      title: '30% off Fitness Membership 💪',
      description: 'Get fit with this amazing deal',
      price: 69.99,
      originalPrice: 99.99,
      category: 'Health & Fitness',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      title: '🎬 Movie Night Special',
      description: '2 tickets + popcorn combo',
      price: 19.99,
      originalPrice: 35.99,
      category: 'Entertainment',
      imageUrl: 'https://images.unsplash.com/photo-1489185078578-5d97e2d5ee96?w=200&h=200&fit=crop',
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '5',
      title: '📚 Books Buy 2 Get 1 Free',
      description: 'Perfect for book lovers',
      price: 29.99,
      originalPrice: 44.99,
      category: 'Books',
      imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=200&fit=crop',
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]
  
  // Filter deals based on search
  const availableDeals = mockDeals.filter(deal => 
    !searchQuery || 
    deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deal.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Set initial deal if dealId provided
  React.useEffect(() => {
    if (dealId) {
      const deal = mockDeals.find(d => d.id === dealId)
      if (deal) {
        setSelectedDeal(deal)
        setMessage(`Check out this amazing deal: ${deal.title}`)
      }
    }
  }, [dealId])

  const handleDealSelect = (deal: MockDeal) => {
    setSelectedDeal(deal)
    setMessage(`Hey ${friendName}! Check out this deal: ${deal.title}`)
  }

  const handleShare = async () => {
    if (!selectedDeal) return
    
    setIsSharing(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      console.log('🚀 Sharing deal:', {
        friendId,
        friendName,
        dealId: selectedDeal.id,
        dealTitle: selectedDeal.title,
        message: message.trim() || 'Check out this deal!'
      })

      setShareSuccess(true)
      
      // Auto-close after success
      setTimeout(() => {
        handleClose()
      }, 2000)

    } catch (error) {
      console.error('❌ Error sharing deal:', error)
    } finally {
      setIsSharing(false)
    }
  }

  const handleClose = () => {
    setSelectedDeal(null)
    setMessage('')
    setSearchQuery('')
    setShareSuccess(false)
    setIsSharing(false)
    onClose()
  }

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                {/* Close Button */}
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                    onClick={handleClose}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="w-full">
                  {/* Header */}
                  <div className="flex items-center mb-6">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Heart className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                        Share Deal with {friendName}
                      </Dialog.Title>
                      <p className="text-sm text-gray-500">
                        Spread the love and save together! 💝
                      </p>
                    </div>
                  </div>

                  {shareSuccess ? (
                    <motion.div
                      className="text-center py-8"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                        <Send className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Deal Shared! 🎉</h3>
                      <p className="text-gray-600">
                        {friendName} will be notified about this amazing deal.
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-6">
                      {/* Deal Selection */}
                      {!selectedDeal ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Choose a deal to share 🎯
                          </label>
                          
                          {/* Search */}
                          <div className="relative mb-4">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
                              placeholder="Search deals..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>

                          {/* Deal List */}
                          <div className="max-h-64 overflow-y-auto space-y-3 border border-gray-200 rounded-lg p-3">
                            {availableDeals.length === 0 ? (
                              <div className="text-center py-8">
                                <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">
                                  {searchQuery ? 'No deals found matching your search' : 'No deals available'}
                                </p>
                              </div>
                            ) : (
                              availableDeals.map((deal) => (
                                <motion.button
                                  key={deal.id}
                                  onClick={() => handleDealSelect(deal)}
                                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 group"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <Tag className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-900">
                                        {deal.title}
                                      </h4>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <span className="text-lg font-bold text-green-600">
                                          {formatPrice(deal.price)}
                                        </span>
                                        {deal.originalPrice && deal.originalPrice > deal.price && (
                                          <span className="text-sm text-gray-500 line-through">
                                            {formatPrice(deal.originalPrice)}
                                          </span>
                                        )}
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                          {deal.category}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </motion.button>
                              ))
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Selected Deal ✨
                          </label>
                          <div className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-4">
                            <div className="flex items-start space-x-4">
                              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Tag className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">{selectedDeal.title}</h4>
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-xl font-bold text-green-600">
                                    {formatPrice(selectedDeal.price)}
                                  </span>
                                  {selectedDeal.originalPrice && selectedDeal.originalPrice > selectedDeal.price && (
                                    <span className="text-sm text-gray-500 line-through">
                                      {formatPrice(selectedDeal.originalPrice)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center text-xs text-gray-600">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Expires {formatDate(selectedDeal.expiresAt)}
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedDeal(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Message */}
                      {selectedDeal && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Add a personal message 💌
                          </label>
                          <textarea
                            rows={3}
                            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
                            placeholder="Why do you think they'll love this deal?"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            maxLength={200}
                          />
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-gray-500">
                              {message.length}/200 characters
                            </p>
                            {message.length > 150 && (
                              <p className="text-xs text-amber-600">
                                Keep it concise! 📝
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {!shareSuccess && (
                    <div className="mt-6 flex space-x-3">
                      <button
                        type="button"
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                        onClick={handleClose}
                        disabled={isSharing}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="flex-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                        onClick={handleShare}
                        disabled={!selectedDeal || isSharing}
                      >
                        {isSharing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Sharing...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Share Deal 🚀
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

export default ShareDealSimple