import React, { useState } from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { LikedByFriend } from '../../../services/productLikeService';
import { FriendProfileModal } from '../../friends/FriendProfileModal';

interface FriendsLikeSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    friends: LikedByFriend[];
}

export const FriendsLikeSheet: React.FC<FriendsLikeSheetProps> = ({ isOpen, onOpenChange, friends }) => {
    const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

    return (
        <>
            <DrawerPrimitive.Root open={isOpen} onOpenChange={onOpenChange} shouldScaleBackground dismissible>
                <DrawerPrimitive.Portal>
                    {/* z-[250] — above MobileProductModal (z-[100]) so overlay is tappable for dismiss */}
                    <DrawerPrimitive.Overlay className="fixed inset-0 z-[250] bg-black/80" />
                    <DrawerPrimitive.Content
                        className="fixed inset-x-0 bottom-0 z-[250] mt-24 flex max-h-[85vh] flex-col rounded-t-[10px] border bg-white shadow-2xl outline-none"
                        aria-describedby={undefined}
                    >
                        <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />

                        <div className="border-b bg-white sticky top-0 z-10 grid gap-1.5 p-4 text-center sm:text-left">
                            <DrawerPrimitive.Title className="text-xl font-semibold leading-none tracking-tight">
                                Friends who liked this
                            </DrawerPrimitive.Title>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                            {friends.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No friends have liked this yet.
                                </div>
                            ) : (
                                <div className="space-y-3 pb-8">
                                    {friends.map((friend) => (
                                        <button
                                            key={friend.user_id}
                                            onClick={() => setSelectedFriendId(friend.user_id)}
                                            className="flex items-center gap-3 bg-white p-3 rounded-xl border w-full text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                                                {friend.avatar_url ? (
                                                    <img src={friend.avatar_url} alt={friend.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium text-lg">
                                                        {friend.full_name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="font-medium text-gray-900">
                                                {friend.full_name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </DrawerPrimitive.Content>
                </DrawerPrimitive.Portal>
            </DrawerPrimitive.Root>

            {/* Friend Profile Modal — opens when tapping a friend card */}
            <FriendProfileModal
                friendId={selectedFriendId}
                isOpen={!!selectedFriendId}
                onClose={() => setSelectedFriendId(null)}
            />
        </>
    );
};
