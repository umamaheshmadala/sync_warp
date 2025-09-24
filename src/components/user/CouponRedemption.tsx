import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  CheckCircle,
  X,
  Clock,
  Gift,
  Store,
  MapPin,
  Phone,
  AlertTriangle,
  Copy,
  Share2,
  Download,
  Zap,
  ShieldCheck,
  Info,
  RefreshCcw,
  Eye,
  EyeOff,
  Star,
  Calendar,
  Tag,
  Percent
} from 'lucide-react';
import { Coupon, UserCouponCollection } from '../../types/coupon';
import { couponService } from '../../services/couponService';
import { toast } from 'react-hot-toast';

// QR Code generation utility (you'll need to install 'qrcode' package)
// npm install qrcode @types/qrcode
import QRCode from 'qrcode';

interface CouponRedemptionProps {
  coupon: Coupon;
  collection: UserCouponCollection;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onRedemptionComplete?: (coupon: Coupon) => void;
}

interface RedemptionData {
  couponId: string;
  userId: string;
  businessId: string;
  collectionId: string;
  timestamp: number;
  verificationCode: string;
}

const CouponRedemption: React.FC<CouponRedemptionProps> = ({
  coupon,
  collection,
  userId,
  isOpen,
  onClose,
  onRedemptionComplete
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [redemptionData, setRedemptionData] = useState<RedemptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [showQrCode, setShowQrCode] = useState(true);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);
  const [showVerificationCode, setShowVerificationCode] = useState(false);
  
  const qrRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  // Generate QR code and redemption data
  useEffect(() => {
    if (isOpen && coupon && collection) {
      generateRedemptionQR();
      startExpiryTimer();
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen, coupon, collection]);

  // Generate QR code for redemption
  const generateRedemptionQR = async () => {
    try {
      setLoading(true);
      
      // Generate verification code
      const verificationCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      
      // Create redemption data
      const redemptionPayload: RedemptionData = {
        couponId: coupon.id,
        userId,
        businessId: collection.business_id,
        collectionId: collection.id,
        timestamp: Date.now(),
        verificationCode
      };

      setRedemptionData(redemptionPayload);

      // Generate QR code containing the redemption data
      const qrData = JSON.stringify(redemptionPayload);
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1f2937', // Dark gray
          light: '#ffffff' // White background
        },
        errorCorrectionLevel: 'H'
      });

      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  // Start expiry timer
  const startExpiryTimer = () => {
    if (coupon.expires_at) {
      const updateTimer = () => {
        const now = Date.now();
        const expiryTime = new Date(coupon.expires_at!).getTime();
        const timeLeft = expiryTime - now;
        
        if (timeLeft <= 0) {
          setTimeUntilExpiry(0);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        } else {
          setTimeUntilExpiry(timeLeft);
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    }
  };

  // Format time remaining
  const formatTimeRemaining = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Handle manual redemption (for testing/fallback)
  const handleManualRedemption = async () => {
    if (!redemptionData) return;

    setRedeeming(true);
    try {
      await couponService.redeemCoupon(
        redemptionData.couponId, 
        redemptionData.userId, 
        redemptionData.businessId
      );
      
      setRedeemed(true);
      toast.success('Coupon redeemed successfully!');
      onRedemptionComplete?.(coupon);
      
      // Auto-close after a delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error redeeming coupon:', error);
      toast.error('Failed to redeem coupon');
    } finally {
      setRedeeming(false);
    }
  };

  // Copy verification code
  const copyVerificationCode = () => {
    if (redemptionData?.verificationCode) {
      navigator.clipboard.writeText(redemptionData.verificationCode);
      toast.success('Verification code copied!');
    }
  };

  // Share QR code
  const shareQRCode = async () => {
    if (qrCodeUrl) {
      try {
        // Convert data URL to blob
        const response = await fetch(qrCodeUrl);
        const blob = await response.blob();
        const file = new File([blob], 'coupon-qr.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${coupon.title} - QR Code`,
            text: `Redeem this coupon at ${coupon.business_name}`,
            files: [file]
          });
        } else {
          // Fallback: download QR code
          const link = document.createElement('a');
          link.download = 'coupon-qr-code.png';
          link.href = qrCodeUrl;
          link.click();
          toast.success('QR code downloaded!');
        }
      } catch (error) {
        console.error('Error sharing QR code:', error);
        toast.error('Failed to share QR code');
      }
    }
  };

  // Calculate savings
  const calculateSavings = (): string => {
    if (coupon.type === 'percentage' && coupon.minimum_purchase) {
      const maxSaving = Math.min(
        (coupon.value / 100) * coupon.minimum_purchase,
        coupon.maximum_discount || Infinity
      );
      return `Save up to ₹${Math.round(maxSaving)}`;
    }
    return `Save ₹${coupon.value}`;
  };

  // Format discount display
  const formatDiscount = (): string => {
    if (coupon.type === 'percentage') {
      return `${coupon.value}% OFF`;
    }
    return `₹${coupon.value} OFF`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-1">Ready to Redeem</h2>
            <p className="text-sm opacity-90">Show this QR code to the merchant</p>
          </div>
          
          {/* Expiry Timer */}
          {timeUntilExpiry !== null && (
            <div className="mt-4 text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                timeUntilExpiry < 300000 // 5 minutes
                  ? 'bg-red-500 bg-opacity-20 text-red-100'
                  : 'bg-white bg-opacity-20 text-white'
              }`}>
                <Clock className="w-4 h-4 mr-1" />
                {timeUntilExpiry > 0 ? formatTimeRemaining(timeUntilExpiry) : 'Expired'}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Coupon Details */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{coupon.title}</h3>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {formatDiscount()}
            </div>
            <p className="text-sm text-gray-600 mb-3">{calculateSavings()}</p>
            
            {/* Business Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-center text-sm text-gray-700 mb-2">
                <Store className="w-4 h-4 mr-2" />
                <span className="font-medium">{coupon.business_name}</span>
              </div>
              {coupon.business_address && (
                <div className="flex items-center justify-center text-xs text-gray-500">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span>{coupon.business_address}</span>
                </div>
              )}
            </div>
          </div>

          {redeemed ? (
            /* Redemption Success */
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-600 mb-2">Redeemed Successfully!</h3>
              <p className="text-gray-600">Enjoy your savings!</p>
            </motion.div>
          ) : loading ? (
            /* Loading State */
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating QR code...</p>
            </div>
          ) : (
            /* QR Code Display */
            <div className="space-y-4">
              {showQrCode && qrCodeUrl ? (
                <div className="text-center">
                  <div 
                    ref={qrRef}
                    className="inline-block p-4 bg-white border-2 border-gray-200 rounded-xl shadow-inner"
                  >
                    <img
                      src={qrCodeUrl}
                      alt="Redemption QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Scan this code at the store to redeem your coupon
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <EyeOff className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 mb-4">QR code is hidden for privacy</p>
                  <button
                    onClick={() => setShowQrCode(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="w-4 h-4 inline mr-2" />
                    Show QR Code
                  </button>
                </div>
              )}

              {/* Verification Code */}
              {redemptionData && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Verification Code</span>
                    <button
                      onClick={() => setShowVerificationCode(!showVerificationCode)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {showVerificationCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="text-lg font-mono font-bold text-gray-900">
                      {showVerificationCode ? redemptionData.verificationCode : '••••••••'}
                    </code>
                    <button
                      onClick={copyVerificationCode}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Share this code with the merchant if needed
                  </p>
                </div>
              )}

              {/* Terms & Conditions */}
              <div className="space-y-2 text-xs text-gray-600">
                {coupon.minimum_purchase && (
                  <div className="flex items-center">
                    <Info className="w-3 h-3 mr-2" />
                    <span>Minimum purchase: ₹{coupon.minimum_purchase}</span>
                  </div>
                )}
                {coupon.maximum_discount && coupon.type === 'percentage' && (
                  <div className="flex items-center">
                    <Tag className="w-3 h-3 mr-2" />
                    <span>Maximum discount: ₹{coupon.maximum_discount}</span>
                  </div>
                )}
                {coupon.terms_conditions && (
                  <div className="flex items-start">
                    <AlertTriangle className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{coupon.terms_conditions}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={shareQRCode}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </button>
                
                <button
                  onClick={handleManualRedemption}
                  disabled={redeeming || timeUntilExpiry === 0}
                  className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {redeeming ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Redeeming...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Redeem Now
                    </>
                  )}
                </button>
              </div>

              {/* Security Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start">
                  <ShieldCheck className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium mb-1">Secure Redemption</p>
                    <p>This QR code is unique and can only be used once. Don't share it publicly.</p>
                  </div>
                </div>
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setShowQrCode(!showQrCode)}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showQrCode ? (
                    <>
                      <EyeOff className="w-4 h-4 inline mr-1" />
                      Hide QR Code
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 inline mr-1" />
                      Show QR Code
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CouponRedemption;