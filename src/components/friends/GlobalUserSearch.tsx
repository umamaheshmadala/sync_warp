// src/components/friends/GlobalUserSearch.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, UserPlus, MapPin, Heart, Check } from 'lucide-react'
import { useNewFriends as useFriends } from '../../hooks/useNewFriends'
import { useSendFriendRequest } from '../../hooks/useFriendRequests'
import { useHapticFeedback } from '../../hooks/useHapticFeedback'
import { toast } from 'react-hot-toast'
import type { FriendProfile } from '../../services/newFriendService'
import { EmptyState } from '../ui/EmptyState'

interface GlobalUserSearchProps {
    query: string
    onEmpty?: () => void
    hideEmptyMessage?: boolean
}

export const GlobalUserSearch: React.FC<GlobalUserSearchProps> = ({ query, onEmpty, hideEmptyMessage = false }) => {
    const { searchUsers } = useFriends()
    const sendRequest = useSendFriendRequest()
    const { triggerHaptic } = useHapticFeedback()

    const [searchResults, setSearchResults] = useState<FriendProfile[]>([])
    const [loading, setLoading] = useState(false)
    const [sendingRequest, setSendingRequest] = useState<Set<string>>(new Set())
    const [successMessages, setSuccessMessages] = useState<Set<string>>(new Set())

    // Previous query tracker to detecting changes
    const prevQueryRef = useRef(query)

    /**
     * Perform Search
     */
    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setSearchResults([])
            return
        }

        setLoading(true)
        try {
            const results = await searchUsers(searchQuery)
            setSearchResults(results)
            if (results.length === 0 && onEmpty) {
                onEmpty()
            }
        } catch (error) {
            console.error('Search error:', error)
            setSearchResults([])
        } finally {
            setLoading(false)
        }
    }, [searchUsers, onEmpty])

    // Trigger search when query changes (debounced by parent input, but we might want a small check)
    // Assuming parent 'query' is already debounced or we debounce here.
    // The user requirement implies instant search integration. 
    // Let's debounce slightly here to be safe if parent passes raw input.
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                performSearch(query)
            } else {
                setSearchResults([])
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [query, performSearch])

    /**
     * Send friend request
     */
    const handleSendRequest = useCallback((userId: string) => {
        setSendingRequest(prev => new Set(prev).add(userId))

        sendRequest.mutate(
            { receiverId: userId },
            {
                onSuccess: (result) => {
                    if (result.success) {
                        triggerHaptic('success')
                        toast.success('Friend request sent!')

                        // Mark as successfully sent
                        setSuccessMessages(prev => new Set(prev).add(userId))

                        // Remove user from search results after successful send
                        // setSearchResults(prev => prev.filter(user => user.user_id !== userId))
                    } else {
                        triggerHaptic('error')
                        toast.error(result.error || 'Failed to send friend request')
                    }

                    setSendingRequest(prev => {
                        const next = new Set(prev)
                        next.delete(userId)
                        return next
                    })
                },
                onError: (error) => {
                    console.error('Error sending friend request:', error)
                    triggerHaptic('error')
                    toast.error('Failed to send friend request')

                    setSendingRequest(prev => {
                        const next = new Set(prev)
                        next.delete(userId)
                        return next
                    })
                }
            }
        )
    }, [sendRequest, triggerHaptic])

    if (!query.trim()) return null

    if (loading) {
        return (
            <div className="py-8 text-center text-gray-500">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2"></div>
                <p>Searching global directory...</p>
            </div>
        )
    }

    if (searchResults.length === 0) {
        if (hideEmptyMessage) return null;

        return (
            <div className="py-8 text-center text-gray-500">
                <p>No results found for "{query}"</p>
            </div>
        )
    }

    return (
        <div className="space-y-3 mt-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-2">Global Results</h3>
            {searchResults.map((user) => {
                const isSending = sendingRequest.has(user.user_id)
                const wasSuccessful = successMessages.has(user.user_id)

                return (
                    <motion.div
                        key={user.user_id}
                        className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                {user.avatar_url ? (
                                    <img
                                        src={user.avatar_url}
                                        alt={user.full_name}
                                        className="h-10 w-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                                        <span className="text-white font-semibold text-sm">
                                            {user.full_name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                {user.is_online && (
                                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-400 border-2 border-white rounded-full" />
                                )}
                            </div>

                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900 text-sm">{user.full_name}</h4>
                                <div className="flex items-center space-x-2 mt-0.5">
                                    {user.city && (
                                        <div className="flex items-center text-xs text-gray-500">
                                            <MapPin className="h-3 w-3 mr-1" />
                                            {user.city}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <motion.button
                            onClick={() => handleSendRequest(user.user_id)}
                            disabled={isSending || wasSuccessful}
                            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isSending || wasSuccessful
                                ? 'bg-green-50 text-green-700 cursor-not-allowed'
                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                }`}
                            whileHover={{ scale: isSending || wasSuccessful ? 1 : 1.02 }}
                            whileTap={{ scale: isSending || wasSuccessful ? 1 : 0.98 }}
                        >
                            {isSending ? (
                                <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-1" />
                                    <span>...</span>
                                </>
                            ) : wasSuccessful ? (
                                <>
                                    <Check className="h-3 w-3 mr-1" />
                                    <span>Sent</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    <span>Add</span>
                                </>
                            )}
                        </motion.button>
                    </motion.div>
                )
            })}
        </div>
    )
}
