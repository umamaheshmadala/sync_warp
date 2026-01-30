// OperatingHoursModal.tsx
// Enhanced modal component with modern design to display detailed weekly operating hours
// Features include gradient headers, visual open/closed indicators, and contemporary styling

import React from 'react';
import { X, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface OperatingHours {
    [day: string]: {
        open: string;
        close: string;
        closed?: boolean;
    };
}

interface OperatingHoursModalProps {
    business: {
        business_name: string;
        operating_hours?: OperatingHours | null;
        timezone?: string;
    };
    isOpen: boolean;
    onClose: () => void;
}

export const OperatingHoursModal: React.FC<OperatingHoursModalProps> = ({
    business,
    isOpen,
    onClose,
}) => {
    if (!isOpen) return null;

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const now = new Date();
    const currentDayName = dayNames[now.getDay() === 0 ? 6 : now.getDay() - 1]; // Adjust for Monday=0 indexing

    const hasHours = business.operating_hours && Object.keys(business.operating_hours).length > 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl max-h-[600px] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modern Gradient Header */}
                <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Business Hours</h2>
                            <p className="text-indigo-100 text-sm mt-0.5">Weekly Schedule</p>
                        </div>
                    </div>
                </div>

                {/* Business Name Bar */}
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                    <p className="text-sm font-semibold text-gray-900 truncate">{business.business_name}</p>
                </div>

                {/* Hours List */}
                <div className="flex-1 overflow-y-auto">
                    {!hasHours ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
                                <Clock className="w-10 h-10 text-gray-400" />
                            </div>
                            <p className="text-base font-semibold text-gray-900 mb-2">No hours available</p>
                            <p className="text-sm text-gray-500 max-w-xs">Business hours have not been set for this location yet</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-2">
                            {dayKeys.map((dayKey, index) => {
                                const dayName = dayNames[index];
                                const dayHours = business.operating_hours?.[dayKey];
                                const isToday = dayName === currentDayName;
                                const isClosed = !dayHours || dayHours.closed;

                                return (
                                    <div
                                        key={dayKey}
                                        className={`
                      group relative rounded-xl p-4 transition-all duration-200
                      ${isToday
                                                ? 'bg-gradient-to-r from-indigo-50 to-purple-50 ring-2 ring-indigo-200 shadow-sm'
                                                : 'bg-gray-50 hover:bg-gray-100 hover:shadow-sm'
                                            }
                    `}
                                    >
                                        <div className="flex items-center justify-between">
                                            {/* Day Name */}
                                            <div className="flex items-center gap-3">
                                                <div className={`
                          w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm
                          ${isToday
                                                        ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md'
                                                        : 'bg-white text-gray-600 group-hover:bg-gray-200'
                                                    }
                        `}>
                                                    {dayName.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className={`font-semibold ${isToday ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                        {dayName}
                                                    </p>
                                                    {isToday && (
                                                        <p className="text-xs font-medium text-indigo-600 mt-0.5">Today</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Hours or Closed Status */}
                                            <div className="flex items-center gap-2">
                                                {isClosed ? (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
                                                        <XCircle className="w-4 h-4 text-red-500" />
                                                        <span className="text-sm font-semibold text-red-700">Closed</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                        <span className="text-sm font-semibold text-green-700">
                                                            {dayHours.open} – {dayHours.close}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Today Indicator Line */}
                                        {isToday && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-l-xl" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Modern Footer */}
                <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t">
                    {business.timezone && (
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-600 mb-3">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-medium">{business.timezone}</span>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all duration-200 hover:shadow-xl active:scale-98"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
