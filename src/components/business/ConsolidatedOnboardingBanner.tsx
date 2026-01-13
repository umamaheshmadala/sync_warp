import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, X, ChevronDown, ChevronUp, CheckCircle, ArrowRight } from 'lucide-react';
import { useBusinessUrl } from '@/hooks/useBusinessUrl';

interface Business {
    id: string;
    business_name: string;
    onboarding_completed_at?: string | null;
}

interface ConsolidatedOnboardingBannerProps {
    businesses: Business[];
}

export const ConsolidatedOnboardingBanner: React.FC<ConsolidatedOnboardingBannerProps> = ({
    businesses
}) => {
    const { getBusinessUrl } = useBusinessUrl();
    const [isExpanded, setIsExpanded] = useState(false);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    // Filter businesses that need onboarding and aren't dismissed
    const relevantBusinesses = useMemo(() => {
        return businesses.filter(b => {
            // Must not be completed
            if (b.onboarding_completed_at) return false;

            // Must not be dismissed in session
            if (dismissedIds.has(b.id)) return false;

            // Check storage (optional, for persistency)
            const dismissed = localStorage.getItem(`onboarding_dismissed_${b.id}`);
            const tempDismissed = sessionStorage.getItem(`onboarding_temp_dismissed_${b.id}`);
            if (dismissed || tempDismissed) return false;

            return true;
        });
    }, [businesses, dismissedIds]);

    const handleDismiss = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        sessionStorage.setItem(`onboarding_temp_dismissed_${id}`, 'true');
        setDismissedIds(prev => {
            const newSet = new Set(prev);
            newSet.add(id);
            return newSet;
        });
    };

    const handleDismissAll = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newSet = new Set(dismissedIds);
        relevantBusinesses.forEach(b => {
            sessionStorage.setItem(`onboarding_temp_dismissed_${b.id}`, 'true');
            newSet.add(b.id);
        });
        setDismissedIds(newSet);
    };

    if (relevantBusinesses.length === 0) return null;

    // If only one, render the compact single line version (similar to original but slightly tweaked)
    if (relevantBusinesses.length === 1) {
        const business = relevantBusinesses[0];
        const enhancedProfileUrl = `${getBusinessUrl(business.id, business.business_name)}?tab=enhanced-profile`;

        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg px-4 py-3 shadow-sm"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full shadow-sm">
                            <Target className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                Complete Enhanced Profile for <span className="font-bold text-purple-700">{business.business_name}</span>
                            </p>
                            <p className="text-xs text-gray-500">Unlock full potential with better reach</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to={enhancedProfileUrl}
                            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold rounded-full hover:shadow-md transition-all flex items-center gap-1"
                        >
                            Complete
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                        <button onClick={(e) => handleDismiss(e, business.id)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-white border border-purple-100 rounded-xl shadow-sm overflow-hidden"
        >
            {/* Header - Always visible */}
            <div
                className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="p-2 bg-white rounded-full shadow-sm">
                            <Target className="w-5 h-5 text-purple-600" />
                        </div>
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                            {relevantBusinesses.length}
                        </span>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900">Pending Actions</h4>
                        <p className="text-xs text-gray-500">
                            Complete Enhanced Profiles for {relevantBusinesses.length} businesses
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-xs font-medium text-purple-600 flex items-center gap-1">
                        {isExpanded ? 'Show Less' : 'View All'}
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                    <button
                        onClick={handleDismissAll}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                        title="Dismiss All"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-purple-100"
                    >
                        <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                            {relevantBusinesses.map(business => (
                                <div key={business.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <span className="text-sm text-gray-700 font-medium truncate max-w-[200px]">
                                        {business.business_name}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <Link
                                            to={`${getBusinessUrl(business.id, business.business_name)}?tab=enhanced-profile`}
                                            className="text-xs font-medium text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
                                        >
                                            Complete Now
                                            <ArrowRight className="w-3 h-3" />
                                        </Link>
                                        <button
                                            onClick={(e) => handleDismiss(e, business.id)}
                                            className="text-gray-300 hover:text-gray-500"
                                            title="Dismiss"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
