/**
 * Notification Badge Component
 * Displays a count badge with configurable colors
 * Story 9.3.7: Online Status & Badges
 */

interface NotificationBadgeProps {
    count: number;
    type?: 'default' | 'primary' | 'danger';
    className?: string;
}

export function NotificationBadge({
    count,
    type = 'default',
    className = ''
}: NotificationBadgeProps) {
    if (count === 0) return null;

    const bgColor = {
        default: 'bg-gray-500',
        primary: 'bg-blue-500',
        danger: 'bg-red-500'
    }[type];

    const displayCount = count > 99 ? '99+' : count.toString();
    const ariaLabel = `${count} notification${count > 1 ? 's' : ''}`;

    return (
        <span
            className={`absolute -top-1 -right-1 ${bgColor} text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 transition-all duration-150 ${className}`}
            aria-label={ariaLabel}
            role="status"
        >
            {displayCount}
        </span>
    );
}
