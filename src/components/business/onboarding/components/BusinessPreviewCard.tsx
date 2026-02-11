import React from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, Phone, Globe, Image, ShieldCheck, Users, Navigation, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessPreviewCardProps {
    name: string;
    category?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    website?: string;
    logoUrl?: string;
    coverUrl?: string;
    isVerified?: boolean;
    className?: string;
    operatingHours?: Record<string, any>;
    currentStep?: number;
}

export function BusinessPreviewCard({
    name,
    category,
    address,
    city,
    state,
    phone,
    website,
    logoUrl,
    coverUrl,
    isVerified = false,
    className,
    operatingHours,
    currentStep = 99 // Default to showing everything if not provided
}: BusinessPreviewCardProps) {
    const fullLocation = [address, city, state].filter(Boolean).join(', ');

    // Helper to get open/closed status
    const getOpenStatus = () => {
        if (!operatingHours) return null;

        const now = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = dayNames[now.getDay()]; // 0 is Sunday

        // Find today's hours (handling case sensitivity if needed, though usually lowercase in this app)
        const todayKey = Object.keys(operatingHours).find(k => k.toLowerCase() === today) || today;
        const todayHours = operatingHours[todayKey];

        // Format for display (e.g., "09:00 - 18:00")
        const formatTimeRange = (open: string, close: string) => `${open} - ${close}`;

        if (!todayHours || todayHours.closed) {
            return {
                isOpen: false,
                text: 'Closed',
                color: 'text-red-600',
                details: 'Closed for Today' // Or just "Closed"
            };
        }

        const { open, close } = todayHours;
        if (!open || !close) return null;

        // Parse times to minutes for comparison
        const parseTime = (timeStr: string) => {
            // Handle "09:00" (24h) or "9:00 AM" (12h) - the input is usually 24h from input[type=time]
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);

            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            return hours * 60 + minutes;
        };

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const openMinutes = parseTime(open);
        const closeMinutes = parseTime(close);

        if (currentMinutes < openMinutes) {
            return {
                isOpen: false,
                text: 'Closed',
                color: 'text-red-600',
                details: `${formatTimeRange(open, close)}`
            };
        }

        if (currentMinutes >= closeMinutes) {
            return {
                isOpen: false,
                text: 'Closed',
                color: 'text-red-600',
                details: 'Closed for Today'
            };
        }

        if (closeMinutes - currentMinutes <= 60) {
            return {
                isOpen: true,
                text: 'Closes Soon',
                color: 'text-orange-600',
                details: `${formatTimeRange(open, close)}`
            };
        }

        return {
            isOpen: true,
            text: 'Open',
            color: 'text-green-600',
            details: `${formatTimeRange(open, close)}`
        };
    };

    const status = getOpenStatus();

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
                "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden font-sans",
                className
            )}
        >
            {/* Cover Image Area */}
            <div className="h-40 bg-gray-200 relative">
                {coverUrl ? (
                    <img
                        src={coverUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Image className="w-8 h-8 text-gray-300" />
                    </div>
                )}

                {/* Back Button Placeholder */}
                <div className="absolute top-4 left-4">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                    </div>
                </div>
            </div>

            {/* Profile Section */}
            <div className="px-4 pb-4 relative">
                {/* Avatar */}
                <div className="absolute -top-16 left-4">
                    <div className="w-28 h-28 rounded-full border-4 border-white bg-white shadow-md overflow-hidden">
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt="Logo"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-yellow-400 flex items-center justify-center">
                                <span className="text-3xl font-bold text-white">
                                    {name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Header Actions (Top Right) */}
                <div className="flex justify-end pt-3 gap-2">
                    <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500">
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500">
                        <ShieldCheck className="w-4 h-4 text-green-500" />
                    </div>
                </div>

                {/* Business Info */}
                <div className="mt-8">
                    <h1 className="text-xl font-bold text-gray-900 leading-tight">
                        {name || 'Business Name'}
                    </h1>

                    {/* Location */}
                    <div className="mt-2 flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                        <span>
                            {currentStep >= 3
                                ? (fullLocation || 'Location not set')
                                : 'Address'}
                        </span>
                    </div>

                    {/* Hours */}
                    <div className="mt-2 flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        {currentStep >= 4 ? (
                            status ? (
                                <>
                                    <span className={cn("font-medium", status.color)}>{status.text}</span>
                                    <span className="text-gray-500">· {status.details}</span>
                                </>
                            ) : (
                                <span className="text-gray-500">Operating hours not set</span>
                            )
                        ) : (
                            <span className="text-gray-600">Operating hours</span>
                        )}
                    </div>

                    {/* Phone */}
                    {phone && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 flex-shrink-0 text-gray-400" />
                            <span>{phone}</span>
                        </div>
                    )}

                    {/* Followers */}
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 flex-shrink-0 text-gray-400" />
                        <span>0 Followers</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                        <button className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 min-w-[100px] pointer-events-none cursor-default">
                            <Users className="w-4 h-4" />
                            Follow
                        </button>
                        <button className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 min-w-[100px] pointer-events-none cursor-default">
                            <MapPin className="w-4 h-4" />
                            Check In
                        </button>
                        <button className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 min-w-[100px] pointer-events-none cursor-default">
                            <Navigation className="w-4 h-4" />
                            Navigate
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mt-2 border-t border-gray-100">
                <div className="flex">
                    {['Overview', 'Products', 'Offers', 'Reviews'].map((tab, i) => (
                        <div
                            key={tab}
                            className={cn(
                                "flex-1 py-3 text-center text-sm font-medium border-b-2",
                                i === 0 ? "text-indigo-600 border-indigo-600" : "text-gray-500 border-transparent"
                            )}
                        >
                            {tab}
                        </div>
                    ))}
                </div>
            </div>

            {/* Live Preview Label (Floating or Bottom) */}
            <div className="bg-gray-50 p-2 text-center border-t border-gray-100">
                <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                    Live Storefront Preview
                </span>
            </div>
        </motion.div>
    );
}

export default BusinessPreviewCard;
