import { useState, useEffect } from 'react';
import { CommentInput } from '../components/deals/CommentInput';
import { CommentText } from '../components/deals/CommentText';
import { getDealComments, type Comment } from '../services/commentService';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useAuthStore } from '../store/authStore';

export function TestDealComments() {
    const dealId = 'dummy-deal-123';
    const [comments, setComments] = useState<Comment[]>([]);
    const { user } = useAuthStore();

    const loadComments = async () => {
        try {
            const data = await getDealComments(dealId);
            setComments(data);
        } catch (error) {
            console.error('Failed to load comments', error);
        }
    };

    useEffect(() => {
        loadComments();
    }, []);

    if (!user) {
        return (
            <div className="max-w-2xl mx-auto p-6 text-center">
                <h1 className="text-2xl font-bold mb-4">Deal Comments Test</h1>
                <p className="text-red-600">Please sign in to test this feature with real data.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-bold">Deal Comments Test (Story 9.7.2)</h1>
            <p className="text-gray-600">
                Testing as: <span className="font-semibold">{user.email}</span>
            </p>

            <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4">Comments</h2>
                <div className="space-y-4 mb-6">
                    {comments.map((comment) => (
                        <div key={comment.id} className="flex space-x-3">
                            <Avatar>
                                <AvatarImage src={comment.profile?.avatar_url} />
                                <AvatarFallback>{comment.profile?.full_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium text-sm">{comment.profile?.full_name}</div>
                                <div className="text-gray-700">
                                    <CommentText text={comment.content} />
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {new Date(comment.created_at).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && (
                        <div className="text-gray-500 text-center py-4">No comments yet</div>
                    )}
                </div>

                <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-2">Add a comment</h3>
                    {/* Removed testFriends prop to use real friends from hook */}
                    <CommentInput
                        dealId={dealId}
                        onCommentAdded={loadComments}
                    />
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
                <ul className="list-disc list-inside text-sm text-blue-800">
                    <li>Ensure you have friends added in the system.</li>
                    <li>Type "@" to trigger friend mentions (uses your real friends).</li>
                    <li>Select a friend from the list.</li>
                    <li>Post the comment.</li>
                    <li>Verify the mention is clickable in the comment list.</li>
                </ul>
            </div>
        </div>
    );
}
