import React from 'react';
import { Users } from 'lucide-react';

interface FriendsLikeButtonProps {
    onClick?: () => void;
    size?: number;
    className?: string;
}

export const FriendsLikeButton: React.FC<FriendsLikeButtonProps> = ({ onClick, size = 28, className = '' }) => {
    return (
        <button onClick={onClick} className={`group ${className}`}>
            <Users size={size} className="text-gray-900 group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
        </button>
    );
};
