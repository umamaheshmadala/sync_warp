import React from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, Phone, Globe, Image, ShieldCheck } from 'lucide-react';
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
    className
}: BusinessPreviewCardProps) {
    const fullLocation = [address, city, state].filter(Boolean).join(', ');

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
                "bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden",
                className
            )}
        >
            {/* Cover Image */}
            <div className="h-24 bg-gradient-to-br from-indigo-500 to-purple-600 relative">
                {coverUrl ? (
                    <img
                        src={coverUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Image className="w-8 h-8 text-white/50" />
                    </div>
                )}

                {/* Logo */}
                <div className="absolute -bottom-8 left-4">
                    <div className="w-16 h-16 rounded-xl bg-white shadow-md border-2 border-white overflow-hidden">
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt="Logo"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <span className="text-2xl font-bold text-gray-400">
                                    {name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="pt-10 p-4">
                {/* Name & Verification */}
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                            {name || 'Your Business Name'}
                        </h3>
                        {category && (
                            <p className="text-sm text-indigo-600 font-medium">
                                {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                        )}
                    </div>
                    {isVerified && (
                        <div title="Verified Business" className="p-1 bg-green-100 text-green-700 rounded-full">
                            <ShieldCheck className="w-3 h-3" />
                        </div>
                    )}
                </div>

                {/* Rating Placeholder */}
                <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map(star => (
                        <Star
                            key={star}
                            className="w-4 h-4 text-gray-300"
                            fill="currentColor"
                        />
                    ))}
                    <span className="text-sm text-gray-500 ml-1">No reviews yet</span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm text-gray-600">
                    {fullLocation && (
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{fullLocation}</span>
                        </div>
                    )}
                    {phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>+91 {phone}</span>
                        </div>
                    )}
                    {website && (
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate text-indigo-600">{website}</span>
                        </div>
                    )}
                </div>

                {/* Preview Label */}
                <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">
                        Live Preview
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

export default BusinessPreviewCard;
