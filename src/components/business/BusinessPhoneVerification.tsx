import React, { useState, useEffect } from 'react';
import { Phone, Check, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { OtpInput } from '../auth/OtpInput';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

interface Props {
    initialPhone?: string;
    onVerified: (verified: boolean) => void;
    onSkip?: () => void;
}

export const BusinessPhoneVerification: React.FC<Props> = ({
    initialPhone = '',
    onVerified,
    onSkip
}) => {
    const { user } = useAuthStore();
    // Normalize initial phone (strip spaces/dashes)
    const [phoneNumber, setPhoneNumber] = useState(initialPhone);
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);

    // Timer for resend cooldown
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (cooldown > 0) {
            timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [cooldown]);

    const validatePhone = (phone: string) => {
        // Basic validation for 10 digits
        const digits = phone.replace(/[^0-9]/g, '');
        return digits.length === 10;
    };

    const handleSendOtp = async () => {
        setError(null);
        if (!validatePhone(phoneNumber)) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        setLoading(true);
        // Format to E.164 (+91 followed by 10 digits)
        const formattedPhone = `+91${phoneNumber.replace(/[^0-9]/g, '').slice(-10)}`;

        try {
            let error;
            if (user) {
                // If user is logged in, update their profile (links phone to account)
                const res = await supabase.auth.updateUser({
                    phone: formattedPhone,
                });
                error = res.error;
            } else {
                // Determine if we need to sign up or sign in
                const res = await supabase.auth.signInWithOtp({
                    phone: formattedPhone,
                });
                error = res.error;
            }

            if (error) throw error;

            setStep('otp');
            setCooldown(60); // 60s cooldown
            toast.success('OTP sent successfully!');
        } catch (err: any) {
            console.error('Error sending OTP:', err);
            setError(err.message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setError(null);
        if (otp.length !== 6) {
            setError('Please enter the 6-digit code');
            return;
        }

        setLoading(true);
        const formattedPhone = `+91${phoneNumber.replace(/[^0-9]/g, '').slice(-10)}`;

        try {
            let data, error;

            if (user) {
                // Verify the phone change OTP
                const res = await supabase.auth.verifyOtp({
                    phone: formattedPhone,
                    token: otp,
                    type: 'phone_change'
                });
                data = res.data;
                error = res.error;
            } else {
                // Verify login OTP
                const res = await supabase.auth.verifyOtp({
                    phone: formattedPhone,
                    token: otp,
                    type: 'sms'
                });
                data = res.data;
                error = res.error;
            }

            if (error) throw error;

            if (error) throw error;

            // data.user handles the case for updateUser (phone_change)
            // data.session handles the case for signInWithOtp
            if (data.session || data.user) {
                toast.success('Phone verified successfully!');
                onVerified(true);
            } else {
                throw new Error('Verification failed. Invalid code?');
            }
        } catch (err: any) {
            console.error('Error verifying OTP:', err);
            setError(err.message || 'Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const currentStepTitle = step === 'phone' ? 'Verify your phone number' : 'Enter verification code';
    const currentStepDesc = step === 'phone'
        ? 'We will send a 6-digit code to verify your business ownership.'
        : `Code sent to +91 ${phoneNumber}`;

    return (
        <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Phone className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{currentStepTitle}</h3>
                <p className="text-sm text-gray-500 mt-1">{currentStepDesc}</p>
            </div>

            <div className="bg-white border rounded-lg p-6 shadow-sm">
                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {step === 'phone' ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mobile Number
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                                    +91
                                </span>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg tracking-wide"
                                    placeholder="99999 99999"
                                    maxLength={10}
                                    disabled={loading}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Use <span className="font-mono bg-gray-100 px-1 rounded">9999999999</span> for testing.
                            </p>
                        </div>

                        <button
                            onClick={handleSendOtp}
                            disabled={loading || phoneNumber.length < 10}
                            className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                            {loading ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Send Verification Code
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <OtpInput
                                value={otp}
                                onChange={setOtp}
                                length={6}
                                disabled={loading}
                            />
                        </div>

                        <button
                            onClick={handleVerifyOtp}
                            disabled={loading || otp.length < 6}
                            className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                            {loading ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Verify & Continue
                                    <Check className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </button>

                        <div className="flex items-center justify-between text-sm">
                            <button
                                onClick={() => {
                                    setStep('phone');
                                    setOtp('');
                                    setError(null);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                Change Number
                            </button>

                            <button
                                onClick={handleSendOtp}
                                disabled={cooldown > 0 || loading}
                                className={`font-medium ${cooldown > 0
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-indigo-600 hover:text-indigo-700'
                                    }`}
                            >
                                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {onSkip && (
                <div className="mt-6 text-center">
                    <button
                        onClick={onSkip}
                        className="text-gray-500 hover:text-gray-700 text-sm underline"
                    >
                        Skip verification for now (Admin review required)
                    </button>
                </div>
            )}
        </div>
    );
};
