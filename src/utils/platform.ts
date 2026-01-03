import { Capacitor } from '@capacitor/core';

export class Platform {
  static get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  static get isIOS(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  static get isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  static get isWeb(): boolean {
    return Capacitor.getPlatform() === 'web';
  }

  static get name(): string {
    return Capacitor.getPlatform();
  }

  // Check if specific plugin is available
  static isPluginAvailable(pluginName: string): boolean {
    return Capacitor.isPluginAvailable(pluginName);
  }

  // Get device info
  static getDeviceInfo() {
    return {
      platform: this.name,
      isNative: this.isNative,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    };
  }

  // Check if running in mobile browser (not native app)
  static get isMobileBrowser(): boolean {
    return !this.isNative && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
}
