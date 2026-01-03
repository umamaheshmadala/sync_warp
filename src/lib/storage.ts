import localforage from 'localforage';
import { Capacitor } from '@capacitor/core';

/**
 * Configure localforage for optimal mobile storage
 * Uses IndexedDB on web, native storage on mobile
 */

const isNative = Capacitor.isNativePlatform();

// Configure localforage
localforage.config({
  name: 'SyncWarpApp',
  storeName: 'app_state',
  description: 'SyncWarp App State Storage',
  driver: isNative 
    ? [localforage.LOCALSTORAGE] // Mobile: Use localStorage (backed by native)
    : [localforage.INDEXEDDB, localforage.LOCALSTORAGE] // Web: Prefer IndexedDB
});

export default localforage;
