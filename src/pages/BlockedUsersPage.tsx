import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldOff, Search, UserX } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Capacitor } from '@capacitor/core'
import { Dialog } from '@capacitor/dialog'
import { toast } from 'react-hot-toast'
import * as blockService from '../services/blockService'
import { BlockedUser } from '../services/blockService'

export default function BlockedUsersPage() {
    const navigate = useNavigate()
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Load blocked users on mount
    useEffect(() => {
        loadBlockedUsers()
    }, [])

    const loadBlockedUsers = async () => {
        setIsLoading(true)
        try {
            const users = await blockService.getBlockedUsers()
            setBlockedUsers(users)
        } catch (error) {
            console.error('Failed to load blocked users:', error)
            toast.error('Failed to load blocked users')
        } finally {
            setIsLoading(false)
        }
    }

    const handleUnblock = async (userId: string, userName: string) => {
        try {
            let confirmed = false

            // Use native dialog on mobile, browser confirm on web
            if (Capacitor.isNativePlatform()) {
                const { value } = await Dialog.confirm({
                    title: 'Unblock User?',
                    message: `${userName} will be able to message you again.`,
                    okButtonTitle: 'Unblock',
                    cancelButtonTitle: 'Cancel',
                })
                confirmed = value
            } else {
                // Web fallback using native browser confirm
                confirmed = window.confirm(`Are you sure you want to unblock ${userName}? They will be able to message you again.`)
            }

            if (confirmed) {
                await blockService.unblockUser(userId)
                toast.success(`Unblocked ${userName}`)

                // Remove from local state for instant UI update
                setBlockedUsers((prev) => prev.filter((u) => u.blocked_id !== userId))
            }
        } catch (error: any) {
            console.error('Failed to unblock user:', error)
            toast.error(error.message || 'Failed to unblock user')
        }
    }

    // Filter blocked users based on search query
    const filteredUsers = blockedUsers.filter((user) =>
        user.blocked_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-lg font-semibold text-gray-900">Blocked Users</h1>
                    <p className="text-xs text-gray-500">
                        {blockedUsers.length} {blockedUsers.length === 1 ? 'user' : 'users'} blocked
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            {blockedUsers.length > 0 && (
                <div className="bg-white border-b border-gray-200 px-4 py-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search blocked users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : blockedUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
                        <UserX className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Blocked Users</h3>
                        <p className="text-sm text-gray-500 max-w-sm">
                            You haven't blocked anyone yet. Blocked users won't be able to message you.
                        </p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
                        <Search className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results</h3>
                        <p className="text-sm text-gray-500">No blocked users match your search.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredUsers.map((blockedUser) => {
                            const user = blockedUser.blocked_user
                            const initials = user?.full_name
                                ?.split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2) || '??'

                            return (
                                <div
                                    key={blockedUser.blocked_id}
                                    className="bg-white px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                                >
                                    {/* Avatar */}
                                    <Avatar className="h-12 w-12 flex-shrink-0">
                                        <AvatarImage src={user?.avatar_url || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                                            {user?.full_name || 'Unknown User'}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            Blocked {new Date(blockedUser.blocked_at).toLocaleDateString()}
                                        </p>
                                    </div>

                                    {/* Unblock Button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUnblock(blockedUser.blocked_id, user?.full_name || 'User')}
                                        className="flex-shrink-0 text-orange-600 border-orange-600 hover:bg-orange-50"
                                    >
                                        <ShieldOff className="h-4 w-4 mr-1" />
                                        Unblock
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
