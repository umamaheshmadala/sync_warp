import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    CheckCircle,
    AlertTriangle,
    Info
} from 'lucide-react';
import { BusinessPhoneVerification } from '../../BusinessPhoneVerification';

interface Step1_PhoneVerifyProps {
    phoneNumber: string;
    onPhoneChange: (phone: string) => void;
    onVerified: () => void;
    onSkip: () => void;
    businessName: string;
    isPrefilledFromGoogle: boolean;
}

export function Step1_PhoneVerify({
    phoneNumber,
    onPhoneChange,
    onVerified,
    onSkip,
    businessName,
    isPrefilledFromGoogle
}: Step1_PhoneVerifyProps) {
    const [isVerified, setIsVerified] = useState(false);
    const [showSkipWarning, setShowSkipWarning] = useState(false);

    const handleVerified = () => {
        setIsVerified(true);
        // Small delay for animation
        setTimeout(() => {
            onVerified();
        }, 1500);
    };

    const handleSkipClick = () => {
        setShowSkipWarning(true);
    };

    const confirmSkip = () => {
        onSkip();
    };

    return (
        <div className="max-w-lg mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Verify you own this business
                </h1>
                <p className="text-gray-600">
                    We'll send a verification code to confirm you own <strong>{businessName || 'your business'}</strong>
                </p>
            </motion.div>

            {/* Pre-fill Indicator */}
            {isPrefilledFromGoogle && phoneNumber && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3"
                >
                    <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm text-blue-800">
                            We found this phone number from Google for your business. Please verify it's correct.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Phone Verification Component */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <BusinessPhoneVerification
                    phoneNumber={phoneNumber}
                    onPhoneChange={onPhoneChange}
                    onVerified={handleVerified}
                    isVerified={isVerified}
                />
            </motion.div>

            {/* Success State */}
            <AnimatePresence>
                {isVerified && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6 text-center"
                    >
                        <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-green-800 mb-2">
                            Verification Complete!
                        </h3>
                        <p className="text-green-600">
                            Proceeding to next step...
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Skip Warning Modal */}
            <AnimatePresence>
                {showSkipWarning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowSkipWarning(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-12 h-12 bg-amber-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-amber-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                                Skip Verification?
                            </h3>
                            <p className="text-gray-600 text-center mb-4">
                                Unverified businesses have limited features:
                            </p>

                            <ul className="space-y-2 mb-6">
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs">✕</span>
                                    No "Verified" badge on your profile
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs">✕</span>
                                    Cannot be featured in promotions
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs">✕</span>
                                    Requires admin approval for changes
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-500 flex items-center justify-center text-xs">✓</span>
                                    Can verify later anytime
                                </li>
                            </ul>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSkipWarning(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 bg-white"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={confirmSkip}
                                    className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800"
                                >
                                    Skip Anyway
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Skip Link */}
            {!isVerified && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 text-center"
                >
                    <button
                        onClick={handleSkipClick}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                        Skip verification for now
                    </button>
                </motion.div>
            )}

            {/* Why Verify Info */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 bg-gray-50 rounded-xl p-4"
            >
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    Why verify your business?
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Builds trust with potential customers</li>
                    <li>• Prevents unauthorized changes to your listing</li>
                    <li>• Unlocks premium features and promotions</li>
                    <li>• Verified badge displayed on your profile</li>
                </ul>
            </motion.div>
        </div>
    );
}
