import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { useFriends } from '../../hooks/useFriends';
import { createComment, notifyMentionedUsers } from '../../services/commentService';
import toast from 'react-hot-toast';

interface CommentInputProps {
    dealId: string;
    onCommentAdded?: () => void;
    testFriends?: any[]; // For testing purposes
}

export function CommentInput({ dealId, onCommentAdded, testFriends }: CommentInputProps) {
    const [comment, setComment] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionPosition, setMentionPosition] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const queryClient = useQueryClient();

    const { friends: hookFriends } = useFriends();
    const friends = testFriends || hookFriends;

    // Filter friends for mentions
    const filteredFriends = friends?.filter((friendship) => {
        const profile = friendship.friend;
        if (!profile) return false;
        return (
            profile.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
            profile.username?.toLowerCase().includes(mentionQuery.toLowerCase())
        );
    }).slice(0, 5); // Limit to 5 suggestions

    // Extract user IDs from @mentions
    const extractMentions = (text: string): string[] => {
        const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
        const matches = [...text.matchAll(mentionRegex)];
        return matches.map((match) => match[2]);
    };

    // Create comment mutation
    const createCommentMutation = useMutation({
        mutationFn: async () => {
            // Create comment
            const newComment = await createComment(dealId, comment);

            // Notify mentioned users (handled by DB trigger, but we can do client side if needed)
            // const mentionedUserIds = extractMentions(comment);
            // if (mentionedUserIds.length > 0) {
            //   await notifyMentionedUsers(mentionedUserIds, dealId, newComment.id);
            // }

            return newComment;
        },
        onSuccess: () => {
            setComment('');
            toast.success('Comment posted');
            queryClient.invalidateQueries({ queryKey: ['deal-comments', dealId] });
            onCommentAdded?.();
        },
        onError: () => {
            toast.error('Failed to post comment');
        },
    });

    // Handle text change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;

        setComment(value);

        // Check for @ mention trigger
        const textBeforeCursor = value.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

            // Check if we're still in a mention (no space after @)
            if (!textAfterAt.includes(' ')) {
                setShowMentions(true);
                setMentionQuery(textAfterAt);
                setMentionPosition(lastAtIndex);
                setSelectedIndex(0);
                return;
            }
        }

        setShowMentions(false);
    };

    // Handle mention selection
    const selectMention = (friendship: any) => {
        const profile = friendship.friend;
        const beforeMention = comment.slice(0, mentionPosition);
        const afterMention = comment.slice(textareaRef.current?.selectionStart || 0);

        // Insert mention in markdown format: @[Name](user_id)
        const mentionText = `@[${profile.full_name}](${profile.id})`;
        const newComment = beforeMention + mentionText + ' ' + afterMention;

        setComment(newComment);
        setShowMentions(false);
        setMentionQuery('');

        // Focus back on textarea
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 0);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showMentions || !filteredFriends || filteredFriends.length === 0) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < filteredFriends.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                break;
            case 'Enter':
            case 'Tab':
                e.preventDefault();
                if (filteredFriends[selectedIndex]) {
                    selectMention(filteredFriends[selectedIndex]);
                }
                break;
            case 'Escape':
                setShowMentions(false);
                break;
        }
    };

    const handleSubmit = () => {
        if (!comment.trim()) return;
        createCommentMutation.mutate();
    };

    return (
        <div className="relative">
            <div className="flex space-x-2">
                <Textarea
                    ref={textareaRef}
                    value={comment}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a comment... (type @ to mention friends)"
                    rows={3}
                    className="flex-1"
                />
                <Button
                    onClick={handleSubmit}
                    disabled={!comment.trim() || createCommentMutation.isPending}
                    size="icon"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>

            {/* Mention Autocomplete Dropdown */}
            {showMentions && filteredFriends && filteredFriends.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 w-full max-w-sm bg-white border rounded-lg shadow-lg z-50 overflow-hidden">
                    <div className="p-1 space-y-1">
                        {filteredFriends.map((friendship, index) => {
                            const profile = friendship.friend;
                            return (
                                <button
                                    key={profile.id}
                                    onClick={() => selectMention(friendship)}
                                    className={`w-full flex items-center space-x-3 p-2 rounded hover:bg-gray-100 text-left ${index === selectedIndex ? 'bg-gray-100' : ''
                                        }`}
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={profile.avatar_url} />
                                        <AvatarFallback>
                                            {profile.full_name?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium text-sm">
                                            {profile.full_name}
                                        </div>
                                        {profile.username && (
                                            <div className="text-xs text-gray-500">
                                                @{profile.username}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
