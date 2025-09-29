// src/components/business/BusinessQRCodePage.tsx
// QR Code generation page for business check-ins

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Share2,
  QrCode,
  Copy,
  Palette,
  Settings,
  Eye,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Target,
  Camera,
  Printer,
  Save,
  Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import QRCode from 'qrcode';

interface Business {
  id: string;
  business_name: string;
  business_type: string;
  address: string;
  logo_url?: string;
  status: string;
}

interface QROptions {
  size: number;
  margin: number;
  colorDark: string;
  colorLight: string;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  includeBusinessInfo: boolean;
  includeLogo: boolean;
}

const BusinessQRCodePage: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const { user } = useAuthStore();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [canvasError, setCanvasError] = useState<string>('');
  const [bypassCanvas, setBypassCanvas] = useState<boolean>(false); // Emergency bypass
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [qrOptions, setQrOptions] = useState<QROptions>({
    size: 400,
    margin: 4,
    colorDark: '#000000',
    colorLight: '#FFFFFF',
    errorCorrectionLevel: 'M',
    includeBusinessInfo: true,
    includeLogo: false,
  });

  // Load business data
  useEffect(() => {
    const fetchBusiness = async () => {
      if (!businessId || !user?.id) return;

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('businesses')
          .select('id, business_name, business_type, address, logo_url, status')
          .eq('id', businessId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        setBusiness(data);
      } catch (error) {
        console.error('Error fetching business:', error);
        toast.error('Failed to load business information');
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [businessId, user?.id]);

  // Generate QR code when business loads
  useEffect(() => {
    if (business) {
      generateQRCode();
    }
  }, [business]);
  
  // Regenerate when options change (but only if we already have a business loaded)
  useEffect(() => {
    if (business && qrDataUrl) { // Only if we already have generated a QR code
      console.log('QR options changed, regenerating...');
      generateQRCode();
    }
  }, [qrOptions.size, qrOptions.colorDark, qrOptions.colorLight, qrOptions.errorCorrectionLevel, qrOptions.includeBusinessInfo, qrOptions.includeLogo]);

  const generateQRCode = async () => {
    if (!business) {
      console.warn('generateQRCode called but no business data available');
      return;
    }

    console.log('Generating QR code with options:', qrOptions);

    try {
      setGenerating(true);
      setCanvasError(''); // Clear any previous errors

      // Create the check-in URL
      const checkInUrl = `${window.location.origin}/checkins?business=${business.id}`;

      // Always generate simple QR code first
      const qrCodeOptions = {
        width: qrOptions.size,
        margin: qrOptions.margin,
        color: {
          dark: qrOptions.colorDark,
          light: qrOptions.colorLight,
        },
        errorCorrectionLevel: qrOptions.errorCorrectionLevel,
      };

      const dataUrl = await QRCode.toDataURL(checkInUrl, qrCodeOptions);
      setQrDataUrl(dataUrl);
      
      console.log('Basic QR code generated successfully');

      // Only try canvas enhancement if business info is enabled AND not bypassed
      if (!bypassCanvas && (qrOptions.includeBusinessInfo || (qrOptions.includeLogo && business.logo_url))) {
        console.log('Attempting enhanced QR code with canvas');
        try {
          await drawEnhancedQRCode(dataUrl);
          console.log('Enhanced QR code completed');
        } catch (canvasErr) {
          console.warn('Enhanced QR code rendering failed, enabling bypass mode:', canvasErr);
          setCanvasError(canvasErr instanceof Error ? canvasErr.message : 'Canvas rendering failed');
          setBypassCanvas(true); // Auto-enable bypass on error
          
          // Show the simple QR code fallback
          const fallback = document.getElementById('simple-qr-fallback') as HTMLImageElement;
          if (fallback) {
            console.log('Showing simple QR fallback');
            fallback.style.display = 'block';
          }
          
          // Hide the canvas
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.style.display = 'none';
          }
        }
      } else if (bypassCanvas) {
        console.log('Canvas bypassed, using simple QR code only');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
      setQrDataUrl(''); // Clear QR code on error
    } finally {
      setGenerating(false);
    }
  };

  const drawEnhancedQRCode = async (baseQRUrl: string) => {
    return new Promise<void>((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas || !business) {
        console.error('Canvas or business not available for enhanced QR code');
        reject(new Error('Canvas or business not available'));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get canvas context');
        reject(new Error('Could not get canvas context'));
        return;
      }

      try {
        // Set canvas size
        const canvasSize = qrOptions.size + 200; // Extra space for business info
        canvas.width = canvasSize;
        canvas.height = canvasSize;

        // Clear canvas with background color
        ctx.fillStyle = qrOptions.colorLight;
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        
        console.log('Canvas cleared, loading QR image...');

        // Load and draw the QR code
        const qrImg = new Image();
        qrImg.onload = () => {
          try {
            console.log('QR image loaded, drawing on canvas...');
            
            // Draw QR code centered
            const qrX = (canvasSize - qrOptions.size) / 2;
            const qrY = qrOptions.includeBusinessInfo ? 80 : (canvasSize - qrOptions.size) / 2;
            ctx.drawImage(qrImg, qrX, qrY, qrOptions.size, qrOptions.size);

            // Draw business info at top if enabled
            if (qrOptions.includeBusinessInfo && business) {
              console.log('Drawing business info...');
              ctx.fillStyle = qrOptions.colorDark;
              ctx.font = 'bold 24px Arial, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(business.business_name, canvasSize / 2, 40);

              ctx.font = '16px Arial, sans-serif';
              ctx.fillText(`Scan to check in • ${business.business_type}`, canvasSize / 2, 65);
            }
            
            console.log('Canvas drawing completed successfully');
            
            // Ensure canvas is visible and fallback is hidden
            const fallback = document.getElementById('simple-qr-fallback') as HTMLImageElement;
            if (fallback) {
              fallback.style.display = 'none';
            }
            
            resolve();
          } catch (error) {
            console.error('Error drawing on canvas:', error);
            reject(error);
          }
        };
        
        qrImg.onerror = (error) => {
          console.error('Error loading QR image:', error);
          reject(new Error('Failed to load QR image'));
        };
        
        // Start loading the image
        qrImg.src = baseQRUrl;
        
      } catch (error) {
        console.error('Error setting up canvas:', error);
        reject(error);
      }
    });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    
    if (qrOptions.includeBusinessInfo || (qrOptions.includeLogo && business?.logo_url)) {
      // Download enhanced version from canvas
      const canvas = canvasRef.current;
      if (canvas) {
        link.download = `${business?.business_name || 'business'}-qr-code.png`;
        link.href = canvas.toDataURL();
      }
    } else {
      // Download simple QR code
      link.download = `${business?.business_name || 'business'}-qr-code.png`;
      link.href = qrDataUrl;
    }
    
    link.click();
    toast.success('QR code downloaded successfully!');
  };

  const handleCopyUrl = async () => {
    if (!business) return;
    
    const checkInUrl = `${window.location.origin}/checkins?business=${business.id}`;
    try {
      await navigator.clipboard.writeText(checkInUrl);
      toast.success('Check-in URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      toast.error('Failed to copy URL');
    }
  };

  const handleManualRegenerate = async () => {
    console.log('=== MANUAL REGENERATE TRIGGERED ===');
    console.log('Current QR options:', qrOptions);
    console.log('Business data:', business);
    
    // Clear ALL existing state
    setGenerating(false);
    setQrDataUrl('');
    setCanvasError('');
    
    // Clear and reset canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
      }
      console.log('Canvas cleared');
    }
    
    // Show simple fallback if it exists
    const fallback = document.getElementById('simple-qr-fallback') as HTMLImageElement;
    if (fallback) {
      fallback.style.display = 'none';
    }
    
    console.log('State cleared, starting fresh generation...');
    
    // Force regeneration with a small delay to ensure state is cleared
    setTimeout(() => {
      generateQRCode();
    }, 100);
  };

  const presetColors = [
    { name: 'Classic', dark: '#000000', light: '#FFFFFF' },
    { name: 'Blue', dark: '#1E40AF', light: '#FFFFFF' },
    { name: 'Green', dark: '#059669', light: '#FFFFFF' },
    { name: 'Purple', dark: '#7C3AED', light: '#FFFFFF' },
    { name: 'Red', dark: '#DC2626', light: '#FFFFFF' },
    { name: 'Dark Mode', dark: '#FFFFFF', light: '#111827' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading business information...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Not Found</h2>
          <p className="text-gray-600 mb-4">
            The business you're looking for doesn't exist or you don't have permission to access it.
          </p>
          <Link
            to="/business/dashboard"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/business/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Dashboard
          </Link>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {business.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={business.business_name}
                    className="w-12 h-12 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{business.business_name}</h1>
                  <p className="text-gray-600">QR Code Generator</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleManualRegenerate}
                  disabled={generating}
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* QR Code Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                QR Code Preview
              </h3>

              <div className="flex flex-col items-center">
                {generating ? (
                  <div className="flex items-center justify-center w-96 h-96 bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Generating QR code...</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {!qrDataUrl ? (
                      <div className="flex items-center justify-center w-96 h-96 bg-gray-100 rounded-lg">
                        <div className="text-center">
                          <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">QR code will appear here</p>
                          <p className="text-sm text-gray-400 mt-1">Customize options and generate</p>
                        </div>
                      </div>
                    ) : (!bypassCanvas && (qrOptions.includeBusinessInfo || (qrOptions.includeLogo && business.logo_url))) ? (
                      <>
                        {/* Enhanced QR Code with Canvas */}
                        <canvas
                          ref={canvasRef}
                          className="border rounded-lg shadow-sm"
                          style={{ maxWidth: '400px', maxHeight: '400px' }}
                        />
                        {/* Always show simple QR code as backup - hidden by default */}
                        <img
                          src={qrDataUrl}
                          alt="QR Code Simple"
                          className="border rounded-lg shadow-sm"
                          style={{ maxWidth: '400px', maxHeight: '400px', display: 'none' }}
                          id="simple-qr-fallback"
                        />
                      </>
                    ) : (
                      <img
                        src={qrDataUrl}
                        alt="QR Code"
                        className="border rounded-lg shadow-sm"
                        style={{ maxWidth: '400px', maxHeight: '400px' }}
                      />
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center space-x-4 mt-6">
                  <button
                    onClick={handleDownload}
                    disabled={generating || !qrDataUrl}
                    className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>

                  <button
                    onClick={handleCopyUrl}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy URL
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </button>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Customers can scan this QR code to check in to your business instantly!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Customization Panel */}
          <div className="space-y-6">
            {/* Size Options */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Size & Quality
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size: {qrOptions.size}px
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="800"
                    step="50"
                    value={qrOptions.size}
                    onChange={(e) => setQrOptions(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Error Correction</label>
                  <select
                    value={qrOptions.errorCorrectionLevel}
                    onChange={(e) => setQrOptions(prev => ({ 
                      ...prev, 
                      errorCorrectionLevel: e.target.value as 'L' | 'M' | 'Q' | 'H' 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="L">Low (7%)</option>
                    <option value="M">Medium (15%)</option>
                    <option value="Q">Quartile (25%)</option>
                    <option value="H">High (30%)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Color Options */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Palette className="w-5 h-5 mr-2" />
                Colors
              </h3>

              <div className="space-y-4">
                {/* Preset colors */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Presets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {presetColors.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => setQrOptions(prev => ({
                          ...prev,
                          colorDark: preset.dark,
                          colorLight: preset.light
                        }))}
                        className={`p-2 border rounded-lg text-sm font-medium transition-colors ${
                          qrOptions.colorDark === preset.dark && qrOptions.colorLight === preset.light
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Foreground</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={qrOptions.colorDark}
                        onChange={(e) => setQrOptions(prev => ({ ...prev, colorDark: e.target.value }))}
                        className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={qrOptions.colorDark}
                        onChange={(e) => setQrOptions(prev => ({ ...prev, colorDark: e.target.value }))}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Background</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={qrOptions.colorLight}
                        onChange={(e) => setQrOptions(prev => ({ ...prev, colorLight: e.target.value }))}
                        className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={qrOptions.colorLight}
                        onChange={(e) => setQrOptions(prev => ({ ...prev, colorLight: e.target.value }))}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhancement Options */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Enhancements
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Include Business Info</p>
                    <p className="text-xs text-gray-500">Show business name above QR code</p>
                  </div>
                  <button
                    onClick={() => setQrOptions(prev => ({ ...prev, includeBusinessInfo: !prev.includeBusinessInfo }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                      qrOptions.includeBusinessInfo ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        qrOptions.includeBusinessInfo ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {business.logo_url && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Include Logo</p>
                      <p className="text-xs text-gray-500">Embed logo in center of QR code</p>
                    </div>
                    <button
                      onClick={() => setQrOptions(prev => ({ ...prev, includeLogo: !prev.includeLogo }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                        qrOptions.includeLogo ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          qrOptions.includeLogo ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Debug Info (Development Mode) */}
            {(canvasError || bypassCanvas) && (
              <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
                <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Debug Information
                </h4>
                <div className="text-sm text-yellow-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Canvas Bypass Mode:</span>
                    <span className={`font-medium ${bypassCanvas ? 'text-red-600' : 'text-green-600'}`}>
                      {bypassCanvas ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  {canvasError && (
                    <div>
                      <span className="font-medium">Last Error:</span>
                      <p className="text-xs mt-1 bg-yellow-100 p-2 rounded border">{canvasError}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-yellow-300">
                    <button
                      onClick={() => {
                        setBypassCanvas(!bypassCanvas);
                        setCanvasError('');
                        setTimeout(() => generateQRCode(), 100);
                      }}
                      className="text-xs bg-yellow-200 hover:bg-yellow-300 px-2 py-1 rounded border border-yellow-400 transition-colors"
                    >
                      {bypassCanvas ? 'Enable Canvas' : 'Force Simple Mode'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Tips */}
            <div className="bg-green-50 rounded-lg border border-green-200 p-6">
              <h4 className="font-medium text-green-900 mb-2">💡 Tips for Best Results</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Use high contrast colors for better scanning</li>
                <li>• Medium error correction is recommended</li>
                <li>• Test scanning before printing at small sizes</li>
                <li>• Place QR codes at customer eye level</li>
                {bypassCanvas && (
                  <li>• <strong>Canvas bypass active:</strong> Enhanced features disabled</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessQRCodePage;