// src/components/ShareDeal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Send, Search, Tag, Clock, Star, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useNewFriends as useFriends } from '../hooks/useNewFriends';
// import { useDealsStore } from '../store/dealsStore';
// import type { Deal } from '../types';
// import type { Friendship } from '../services/friendService';

// Mock Deal type for now
interface Deal {
  id: string;
  title: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  image_url?: string;
  expires_at: string;
}

interface ShareDealProps {
  friendId: string;
  dealId?: string; // Optional specific deal to share
  isOpen: boolean;
  onClose: () => void;
}

const ShareDeal: React.FC<ShareDealProps> = ({ friendId, dealId, isOpen, onClose }) => {
  const { triggerHaptic } = useHapticFeedback();
  const { friends } = useFriends();
  // const { deals } = useDealsStore();
  
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Mock deals data for now
  const mockDeals: Deal[] = [
    {
      id: '1',
      title: '50% off Premium Coffee',
      description: 'Get premium coffee at half price',
      price: 15.99,
      original_price: 31.98,
      category: 'Food & Drink',
      image_url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      title: 'Buy 1 Get 1 Free Pizza',
      description: 'Amazing pizza deal for friends',
      price: 24.99,
      original_price: 49.98,
      category: 'Food & Drink',
      image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
      expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      title: '30% off Fitness Membership',
      description: 'Get fit with this amazing deal',
      price: 69.99,
      original_price: 99.99,
      category: 'Health & Fitness',
      image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Find the friend we're sharing with
  const friend = friends.find(f => f.friend_profile.user_id === friendId);
  
  // Get available deals to share
  const availableDeals = mockDeals.filter(deal => 
    !searchQuery || 
    deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deal.category.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 20); // Limit to 20 for performance

  useEffect(() => {
    if (dealId && mockDeals.length > 0) {
      const deal = mockDeals.find(d => d.id === dealId);
      if (deal) {
        setSelectedDeal(deal);
      }
    }
  }, [dealId]);

  const handleDealSelect = (deal: Deal) => {
    triggerHaptic('light');
    setSelectedDeal(deal);
    setMessage(`Check out this deal: ${deal.title}`);
  };

  const handleShare = async () => {
    if (!selectedDeal || !friend) return;
    
    setIsSharing(true);
    triggerHaptic('light');

    try {
      // Mock share activity - replace with actual implementation later
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      console.log('Sharing deal:', {
        friendId: friend.friend_profile.user_id,
        friendName: friend.friend_profile.full_name,
        dealId: selectedDeal.id,
        dealTitle: selectedDeal.title,
        message: message.trim() || 'Check out this deal!'
      });

      setShareSuccess(true);
      triggerHaptic('success');
      
      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (error) {
      console.error('Error sharing deal:', error);
      triggerHaptic('error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    setSelectedDeal(null);
    setMessage('');
    setSearchQuery('');
    setShareSuccess(false);
    setIsSharing(false);
    onClose();
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={handleClose}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    {/* Header */}
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                      Share Deal with {friend?.friend_profile.full_name}
                    </Dialog.Title>

                    {shareSuccess ? (
                      <motion.div
                        className="text-center py-8"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                          <Send className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Deal Shared!</h3>
                        <p className="text-sm text-gray-500">
                          {friend?.friend_profile.full_name} will be notified about this deal.
                        </p>
                      </motion.div>
                    ) : (
                      <div className="space-y-4">
                        {/* Deal Selection */}
                        {!selectedDeal ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Choose a deal to share
                            </label>
                            
                            {/* Search */}
                            <div className="relative mb-3">
                              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                className="block w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Search deals..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                              />
                            </div>

                            {/* Deal List */}
                            <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                              {availableDeals.length === 0 ? (
                                <div className="text-center py-4">
                                  <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                  <p className="text-sm text-gray-500">
                                    {searchQuery ? 'No deals found matching your search' : 'No deals available to share'}
                                  </p>
                                </div>
                              ) : (
                                availableDeals.map((deal) => (
                                  <motion.button
                                    key={deal.id}
                                    onClick={() => handleDealSelect(deal)}
                                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <div className="flex items-start space-x-3">
                                      {deal.image_url && (
                                        <img
                                          src={deal.image_url}
                                          alt={deal.title}
                                          className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                                        />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-gray-900 truncate">
                                          {deal.title}
                                        </h4>
                                        <div className="flex items-center space-x-2 mt-1">
                                          <span className="text-sm font-semibold text-green-600">
                                            {formatPrice(deal.price)}
                                          </span>
                                          {deal.original_price && deal.original_price > deal.price && (
                                            <span className="text-xs text-gray-500 line-through">
                                              {formatPrice(deal.original_price)}
                                            </span>
                                          )}
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            <Tag className="h-3 w-3 mr-1" />
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Selected Deal
                            </label>
                            <div className="border border-indigo-300 bg-indigo-50 rounded-lg p-3 mb-4">
                              <div className="flex items-start space-x-3">
                                {selectedDeal.image_url && (
                                  <img
                                    src={selectedDeal.image_url}
                                    alt={selectedDeal.title}
                                    className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{selectedDeal.title}</h4>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-lg font-semibold text-green-600">
                                      {formatPrice(selectedDeal.price)}
                                    </span>
                                    {selectedDeal.original_price && selectedDeal.original_price > selectedDeal.price && (
                                      <span className="text-sm text-gray-500 line-through">
                                        {formatPrice(selectedDeal.original_price)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center mt-2 text-xs text-gray-500">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Expires {new Date(selectedDeal.expires_at).toLocaleDateString()}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSelectedDeal(null)}
                                  className="text-gray-400 hover:text-gray-600"
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
                              Add a message (optional)
                            </label>
                            <textarea
                              rows={3}
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="Add a personal note..."
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              maxLength={200}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {message.length}/200 characters
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {!shareSuccess && (
                      <div className="mt-6 flex space-x-3">
                        <button
                          type="button"
                          className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                          onClick={handleClose}
                          disabled={isSharing}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                              Share Deal
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ShareDeal;