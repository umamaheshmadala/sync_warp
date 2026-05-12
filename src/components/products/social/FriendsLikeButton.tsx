import React from 'react';
import { Users } from 'lucide-react';

interface FriendsLikeButtonProps {
    onClick?: () => void;
    size?: number;
    className?: string;
    children?: React.ReactNode;
}

export const FriendsLikeButton: React.FC<FriendsLikeButtonProps> = ({ onClick, size = 28, className = '', children }) => {
    return (
        <button onClick={onClick} className={`group flex items-center justify-center ${className}`}>
            <Users size={size} className="text-gray-900 group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
            {children}
        </button>
    );
};
