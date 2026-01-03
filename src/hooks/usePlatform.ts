import { useState } from 'react';
import { Capacitor } from '@capacitor/core';

export interface PlatformInfo {
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  isMobile: boolean;
  platform: 'ios' | 'android' | 'web';
}

export const usePlatform = (): PlatformInfo => {
  const [platformInfo] = useState<PlatformInfo>(() => {
    const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
    return {
      isNative: Capacitor.isNativePlatform(),
      isIOS: platform === 'ios',
      isAndroid: platform === 'android',
      isWeb: platform === 'web',
      isMobile: platform === 'ios' || platform === 'android',
      platform
    };
  });

  return platformInfo;
};

// Helper function for one-off checks
export const isPlatform = (platform: 'ios' | 'android' | 'web' | 'native'): boolean => {
  if (platform === 'native') {
    return Capacitor.isNativePlatform();
  }
  return Capacitor.getPlatform() === platform;
};

// Get platform-specific styles
export const getPlatformStyles = () => {
  const platform = Capacitor.getPlatform();
  return {
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWeb: platform === 'web',
    // Platform-specific spacing
    statusBarHeight: platform === 'ios' ? '44px' : platform === 'android' ? '24px' : '0px',
    // Safe area insets
    safeAreaTop: platform === 'ios' ? 'env(safe-area-inset-top)' : '0px',
    safeAreaBottom: platform === 'ios' ? 'env(safe-area-inset-bottom)' : '0px'
  };
};
