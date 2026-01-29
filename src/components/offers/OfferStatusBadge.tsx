import React from 'react';
import { OfferStatus } from '../../types/offers';
import { Zap, FileEdit, PauseCircle, Ban, Archive, Clock } from 'lucide-react';

interface OfferStatusBadgeProps {
    status: OfferStatus;
    className?: string;
    variant?: 'text' | 'icon';
}

export const OfferStatusBadge: React.FC<OfferStatusBadgeProps> = ({ status, className = '', variant = 'text' }) => {
    const getStatusStyles = (status: OfferStatus) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'paused':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'draft':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'terminated':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'archived':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'expired':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusLabel = (status: OfferStatus) => {
        switch (status) {
            case 'active': return 'Active';
            case 'paused': return 'Paused';
            case 'draft': return 'Draft';
            case 'terminated': return 'Terminated';
            case 'archived': return 'Archived';
            case 'expired': return 'Expired';
            default: return status;
        }
    };

    if (variant === 'icon') {
        const getIcon = () => {
            const size = 14;
            switch (status) {
                case 'active': return <Zap size={size} className="fill-current" />;
                case 'draft': return <FileEdit size={size} />;
                case 'paused': return <PauseCircle size={size} />;
                case 'terminated': return <Ban size={size} />;
                case 'archived': return <Archive size={size} />;
                case 'expired': return <Clock size={size} />;
                default: return <Clock size={size} />;
            }
        };

        return (
            <div
                className={`p-1.5 rounded-full border shadow-sm ${getStatusStyles(status)} ${className}`}
                title={getStatusLabel(status)}
            >
                {getIcon()}
            </div>
        );
    }

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(
                status
            )} ${className}`}
        >
            {getStatusLabel(status)}
        </span>
    );
};
