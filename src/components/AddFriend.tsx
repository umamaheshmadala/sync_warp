// src/components/AddFriend.tsx
import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, UserPlus, X, User } from 'lucide-react'
import { GlobalUserSearch } from './friends/GlobalUserSearch'

interface AddFriendProps {
    isOpen: boolean
    onClose: () => void
}

const AddFriend: React.FC<AddFriendProps> = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('')

    const handleClose = useCallback(() => {
        setSearchQuery('')
        onClose()
    }, [onClose])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 overflow-y-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="min-h-screen px-4 text-center">
                        <motion.div
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClose}
                        />

                        <div className="inline-block w-full max-w-lg p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl relative">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                transition={{ type: "spring", duration: 0.3 }}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-indigo-100 rounded-full">
                                            <UserPlus className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-900">Find Friends</h3>
                                            <p className="text-sm text-gray-600">Search for people to connect with</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Search Input */}
                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name or email..."
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        autoFocus
                                    />
                                </div>

                                {/* Search Results */}
                                <div className="max-h-96 overflow-y-auto min-h-[150px]">
                                    {!searchQuery ? (
                                        <div className="text-center py-8">
                                            <Search className="mx-auto h-12 w-12 text-gray-400" />
                                            <h3 className="mt-2 text-sm font-medium text-gray-900">Start searching</h3>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Enter a name or email to find friends
                                            </p>
                                        </div>
                                    ) : (
                                        <GlobalUserSearch query={searchQuery} />
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                                    <button
                                        onClick={handleClose}
                                        className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
                                    >
                                        Done
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default AddFriend
