import React from 'react';
import { Toast, toast, resolveValue } from 'react-hot-toast';
import { Check, X, Loader2, Info } from 'lucide-react';

interface CustomToastProps {
    t: Toast;
}

export const CustomToast: React.FC<CustomToastProps> = ({ t }) => {
    // Animation classes based on toast state
    const animationClass = t.visible ? 'animate-enter' : 'animate-leave';

    // Determine styles and icon based on toast type
    let bgClass = 'bg-gray-800';
    let icon = <Info className="w-5 h-5 text-white" />;

    switch (t.type) {
        case 'success':
            // Emerald-500 matches the user's green screenshot well
            bgClass = 'bg-emerald-500';
            icon = (
                <div className="bg-white/20 rounded-full p-1">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
            );
            break;
        case 'error':
            bgClass = 'bg-red-500';
            icon = (
                <div className="bg-white/20 rounded-full p-1">
                    <X className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
            );
            break;
        case 'loading':
            bgClass = 'bg-blue-500';
            icon = <Loader2 className="w-5 h-5 text-white animate-spin" />;
            break;
        default:
            // Custom or blank types
            // Use standard Gray-800 but ensure it looks premium
            bgClass = 'bg-gray-800';

            // If a custom icon is passed via options (e.g. '🔔'), use it
            if (t.icon) {
                icon = <span className="text-xl">{t.icon}</span>;
            } else {
                icon = <div className="bg-white/10 rounded-full p-1"><Info className="w-4 h-4 text-white" /></div>;
            }
            break;
    }

    return (
        <div
            className={`${animationClass} max-w-md w-full ${bgClass} shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 transition-all duration-300 ease-in-out transform`}
            style={{
                // Custom animation handling if Tailwind classes aren't enough for enter/leave
                opacity: t.visible ? 1 : 0,
                transform: t.visible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.9)',
            }}
        >
            <div className="flex-1 w-0 p-4">
                <div className="flex items-center">
                    <div className="flex-shrink-0 pt-0.5">
                        {icon}
                    </div>
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-white">
                            {resolveValue(t.message, t)}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex border-l border-white/20">
                <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
