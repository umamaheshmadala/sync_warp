import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { BusinessPhoneVerification } from './BusinessPhoneVerification';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface ClaimBusinessButtonProps {
    businessId: string;
    businessName: string;
    businessPhone: string;
    claimStatus: string; // db enum value as string
    ownerId?: string | null;
    onClaimed?: () => void;
    className?: string;
}

export function ClaimBusinessButton({
    businessId,
    businessName,
    businessPhone,
    claimStatus,
    ownerId,
    onClaimed,
    className
}: ClaimBusinessButtonProps) {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [claimId, setClaimId] = useState<string | null>(null);
    const [step, setStep] = useState<'confirm' | 'verify' | 'success'>('confirm');
    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState(businessPhone);
    const [isVerified, setIsVerified] = useState(false);

    // LOGIC:
    // Show button if:
    // 1. Business has no owner (user_id IS NULL)
    // OR
    // 2. Business claim_status is 'unclaimed' or 'manual'

    // Hide if:
    // 1. Current user IS the owner
    // 2. Business is already claimed_verified (by someone else)

    const isOwner = user && ownerId === user.id;
    const isMainClaimed = claimStatus === 'claimed_verified';

    // If user owns it, don't show claim button
    if (isOwner) return null;

    // If someone else owns it and it's verified, don't show (it's taken)
    // Note: logic might be subtle if 'unclaimed' but user_id is set (rare/inconsistent state), 
    // but generally rely on claim_status.
    // Actually, if it is 'claimed_verified', we definitely hide it.
    if (isMainClaimed) return null;

    // If it has an owner but NOT verified, technically it might be in pending state?
    // But strict check:
    const isClaimable = claimStatus === 'unclaimed' ||
        claimStatus === 'manual' ||
        !ownerId; // If no owner_id, it is claimable regardless of status (unless status says verified which implies owner)

    if (!isClaimable) {
        // If status is 'claimed_pending', maybe we show "Claim Pending" or similar?
        // For now, per requirements, just hide if not claimable.
        return null;
    }

    const handleStartClaim = async () => {
        if (!user) {
            toast.error('Please sign in to claim this business');
            navigate('/login'); // Redirect to login
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('initiate_business_claim', {
                p_business_id: businessId,
                p_verification_method: 'phone_otp'
            });

            if (error) throw error;

            setClaimId(data);
            setStep('verify');
        } catch (error: any) {
            console.error('Error initiating claim:', error);
            toast.error(error.message || 'Failed to start claim process');
        } finally {
            setLoading(false);
        }
    };

    const handleVerified = async () => {
        if (!claimId) return;

        setLoading(true);
        try {
            const { error } = await supabase.rpc('complete_business_claim', {
                p_claim_id: claimId,
                p_phone_verified: true
            });

            if (error) throw error;

            setIsVerified(true);
            setStep('success');
            toast.success('Business claimed successfully!');

            setTimeout(() => {
                setIsModalOpen(false);
                onClaimed?.();
            }, 2000);
        } catch (error: any) {
            console.error('Error completing claim:', error);
            toast.error(error.message || 'Failed to complete claim');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors shadow-sm",
                    className
                )}
            >
                <Shield className="w-4 h-4" />
                Claim this business
            </button>

            {/* Claim Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
                        onClick={() => !loading && setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Confirm Step */}
                            {step === 'confirm' && (
                                <>
                                    <div className="w-14 h-14 bg-amber-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                        <Shield className="w-7 h-7 text-amber-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                                        Claim {businessName}
                                    </h2>
                                    <p className="text-gray-600 text-center mb-6">
                                        To prove you own this business, we'll verify the phone number on file.
                                    </p>

                                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                        <p className="text-sm text-gray-600 mb-1">Phone on file:</p>
                                        <p className="font-medium text-gray-900">
                                            {businessPhone ? `+91 ${businessPhone}` : 'No phone on file'}
                                        </p>
                                        {!businessPhone && (
                                            <p className="text-sm text-amber-600 mt-2">
                                                You'll need to provide and verify your business phone.
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setIsModalOpen(false)}
                                            disabled={loading}
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleStartClaim}
                                            disabled={loading}
                                            className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                            Start Verification
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Verify Step */}
                            {step === 'verify' && (
                                <>
                                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                                        Verify Ownership
                                    </h2>

                                    <BusinessPhoneVerification
                                        initialPhone={phone}
                                        onVerified={(verified) => {
                                            if (verified) handleVerified();
                                        }}
                                    />

                                    <button
                                        onClick={() => {
                                            setStep('confirm');
                                            setClaimId(null);
                                        }}
                                        disabled={loading}
                                        className="mt-4 w-full px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                                    >
                                        ← Back
                                    </button>
                                </>
                            )}

                            {/* Success Step */}
                            {step === 'success' && (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                                        Congratulations!
                                    </h2>
                                    <p className="text-gray-600">
                                        You now own <strong>{businessName}</strong>
                                    </p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Redirecting to your dashboard...
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default ClaimBusinessButton;
