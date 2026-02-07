import React, { useState } from 'react';
import { Send, Smile } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

interface ProductCommentInputProps {
    onPost: (text: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    id?: string;
}

export const ProductCommentInput: React.FC<ProductCommentInputProps> = ({
    onPost,
    placeholder = "Add a comment...",
    autoFocus = false,
    id
}) => {
    const { user } = useAuthStore();
    const [text, setText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const charCount = text.length;
    const maxData = 300;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim() && text.length <= maxData) {
            onPost(text);
            setText('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-start gap-3 w-full">
            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 mt-1 overflow-hidden">
                {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Me" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                        {user?.user_metadata?.full_name?.charAt(0) || '👤'}
                    </div>
                )}
            </div>

            {/* Input Wrapper */}
            <div className="flex-1 relative">
                <div className={`
                    border rounded-3xl px-4 py-2 flex items-center bg-gray-50
                    ${isFocused ? 'border-gray-400' : 'border-transparent'}
                    transition-colors
                `}>
                    <input
                        id={id}
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        autoFocus={autoFocus}
                        className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-500 focus:outline-none"
                    />

                    {/* Post Button (only if text exists) */}
                    {text.length > 0 && (
                        <button
                            type="submit"
                            disabled={charCount > maxData}
                            className={`ml-2 text-sm font-semibold transition-colors
                                ${charCount > maxData ? 'text-red-500 opacity-50 cursor-not-allowed' : 'text-blue-500 hover:text-blue-600'}
                            `}
                        >
                            Post
                        </button>
                    )}
                </div>
                {/* Character Counter (visible if typing near limit) */}
                {charCount > 200 && (
                    <div className={`text-[10px] text-right mt-1 px-2 ${charCount > maxData ? 'text-red-500' : 'text-gray-400'}`}>
                        {charCount}/{maxData}
                    </div>
                )}
            </div>
        </form>
    );
};
