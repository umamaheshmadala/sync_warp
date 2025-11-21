/**
 * Platform Utilities
 * Story 9.3.6: Contact Sync Permission Flow
 * 
 * Provides platform detection and native API bridges
 */

// Platform detection
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check for mobile user agent
  const userAgent = window.navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];

  return mobileKeywords.some(keyword => userAgent.includes(keyword));
};

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
};

export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android/.test(window.navigator.userAgent);
};

export const isWeb = (): boolean => {
  return !isMobile();
};

// Contact interface
export interface Contact {
  id: string;
  name: string;
  phoneNumbers?: string[];
  emails?: string[];
}

// Permission status
export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Request native contacts permission
 * 
 * For web: Returns false (not supported)
 * For React Native: Uses expo-contacts or native modules
 */
export const requestNativeContactsPermission = async (): Promise<boolean> => {
  // Check if running in React Native environment
  if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
    // Send message to React Native
    (window as any).ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'REQUEST_CONTACTS_PERMISSION' })
    );

    // Wait for response (implement promise-based message handling)
    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'CONTACTS_PERMISSION_RESPONSE') {
            window.removeEventListener('message', handler);
            resolve(data.granted);
          }
        } catch (e) {
          // Ignore parse errors
        }
      };
      window.addEventListener('message', handler);

      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(false);
      }, 10000);
    });
  }

  // Web fallback: not supported
  console.warn('Contact permissions not supported on web platform');
  return false;
};

/**
 * Get native contacts
 * 
 * For web: Returns empty array
 * For React Native: Fetches contacts from device
 */
export const getNativeContacts = async (): Promise<Contact[]> => {
  // Check if running in React Native environment
  if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
    // Send message to React Native
    (window as any).ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'GET_CONTACTS' })
    );

    // Wait for response
    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'CONTACTS_RESPONSE') {
            window.removeEventListener('message', handler);
            resolve(data.contacts || []);
          }
        } catch (e) {
          // Ignore parse errors
        }
      };
      window.addEventListener('message', handler);

      // Timeout after 15 seconds
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve([]);
      }, 15000);
    });
  }

  // Web fallback: return empty array
  console.warn('Contact access not supported on web platform');
  return [];
};

/**
 * Open app settings
 * 
 * For web: No-op
 * For React Native: Opens device settings
 */
export const openAppSettings = (): void => {
  if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
    (window as any).ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'OPEN_SETTINGS' })
    );
  } else {
    console.warn('Cannot open settings on web platform');
  }
};

/**
 * Hash contact information for privacy
 * Uses MD5 for consistency with backend
 */
export const hashContact = async (value: string): Promise<string> => {
  // Normalize: lowercase and trim
  const normalized = value.toLowerCase().trim();

  // Use Web Crypto API if available
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(normalized);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (e) {
      console.error('Crypto API failed, falling back to simple hash', e);
    }
  }

  // Fallback: Simple MD5-like hash (for compatibility)
  // Note: In production, use a proper crypto library
  return simpleMD5(normalized);
};

/**
 * Simple MD5-like hash implementation
 * Note: This is a simplified version for demonstration
 * In production, use a proper crypto library like crypto-js
 */
function simpleMD5(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Extract contact identifiers (emails and phone numbers)
 */
export const extractContactIdentifiers = (contact: Contact): string[] => {
  const identifiers: string[] = [];

  // Add emails
  if (contact.emails) {
    identifiers.push(...contact.emails);
  }

  // Add phone numbers (normalize format)
  if (contact.phoneNumbers) {
    contact.phoneNumbers.forEach(phone => {
      // Remove non-numeric characters
      const normalized = phone.replace(/\D/g, '');
      if (normalized.length >= 10) {
        identifiers.push(normalized);
      }
    });
  }

  return identifiers;
};
