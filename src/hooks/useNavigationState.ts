// src/hooks/useNavigationState.ts
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationEntry {
  path: string;
  timestamp: number;
  params?: Record<string, string>;
}

interface NavigationState {
  navigationHistory: NavigationEntry[];
  currentIndex: number;
  previousPath: string | null;
  addToHistory: (path: string, params?: Record<string, string>) => void;
  goBack: () => string | null;
  goForward: () => string | null;
  canGoBack: boolean;
  canGoForward: boolean;
  clearHistory: () => void;
  getRecentPaths: (limit?: number) => string[];
}

const STORAGE_KEY = 'sync_navigation_history';
const MAX_HISTORY_SIZE = 50;

/**
 * Custom hook for managing navigation state and history
 * Provides browser-like navigation with persistence
 */
export const useNavigationState = (): NavigationState => {
  const location = useLocation();
  const [navigationHistory, setNavigationHistory] = useState<NavigationEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [previousPath, setPreviousPath] = useState<string | null>(null);

  // Load navigation history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedHistory = JSON.parse(saved);
        setNavigationHistory(parsedHistory.history || []);
        setCurrentIndex(parsedHistory.currentIndex || -1);
      }
    } catch (error) {
      console.debug('Failed to load navigation history:', error);
    }
  }, []);

  // Save navigation history to localStorage whenever it changes
  useEffect(() => {
    try {
      const dataToSave = {
        history: navigationHistory,
        currentIndex
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.debug('Failed to save navigation history:', error);
    }
  }, [navigationHistory, currentIndex]);

  // Track location changes
  useEffect(() => {
    if (navigationHistory.length > 0) {
      const lastEntry = navigationHistory[navigationHistory.length - 1];
      if (lastEntry && lastEntry.path !== location.pathname) {
        setPreviousPath(lastEntry.path);
      }
    }
  }, [location.pathname, navigationHistory]);

  /**
   * Add a new entry to navigation history
   */
  const addToHistory = useCallback((path: string, params?: Record<string, string>) => {
    const newEntry: NavigationEntry = {
      path,
      timestamp: Date.now(),
      params
    };

    setNavigationHistory(prev => {
      // Don't add duplicate consecutive entries
      if (prev.length > 0 && prev[prev.length - 1].path === path) {
        return prev;
      }

      const newHistory = [...prev, newEntry];

      // Trim history if it gets too long
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.splice(0, newHistory.length - MAX_HISTORY_SIZE);
      }

      return newHistory;
    });

    setCurrentIndex(prev => {
      const newIndex = Math.min(prev + 1, MAX_HISTORY_SIZE - 1);
      return newIndex;
    });
  }, []);

  /**
   * Navigate back in history
   */
  const goBack = useCallback((): string | null => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      return navigationHistory[newIndex]?.path || null;
    }
    return null;
  }, [currentIndex, navigationHistory]);

  /**
   * Navigate forward in history
   */
  const goForward = useCallback((): string | null => {
    if (currentIndex < navigationHistory.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      return navigationHistory[newIndex]?.path || null;
    }
    return null;
  }, [currentIndex, navigationHistory]);

  /**
   * Check if we can navigate back
   */
  const canGoBack = currentIndex > 0;

  /**
   * Check if we can navigate forward
   */
  const canGoForward = currentIndex < navigationHistory.length - 1;

  /**
   * Clear navigation history
   */
  const clearHistory = useCallback(() => {
    setNavigationHistory([]);
    setCurrentIndex(-1);
    setPreviousPath(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  /**
   * Get recent navigation paths
   */
  const getRecentPaths = useCallback((limit = 10): string[] => {
    return navigationHistory
      .slice(-limit)
      .map(entry => entry.path)
      .filter((path, index, array) => array.indexOf(path) === index) // Remove duplicates
      .reverse(); // Most recent first
  }, [navigationHistory]);

  return {
    navigationHistory,
    currentIndex,
    previousPath,
    addToHistory,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    clearHistory,
    getRecentPaths
  };
};

/**
 * Hook for managing navigation preferences
 */
export const useNavigationPreferences = () => {
  const PREFERENCES_KEY = 'sync_navigation_preferences';

  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(PREFERENCES_KEY);
      if (saved) {
        return {
          enableHapticFeedback: true,
          swipeGesturesEnabled: false,
          showNavigationBadges: true,
          navigationBarPosition: 'bottom' as 'top' | 'bottom',
          ...JSON.parse(saved)
        };
      }
    } catch (error) {
      console.debug('Failed to load navigation preferences:', error);
    }
    return {
      enableHapticFeedback: true,
      swipeGesturesEnabled: false, // Disabled by default to prevent text selection issues
      showNavigationBadges: true,
      navigationBarPosition: 'bottom' as 'top' | 'bottom'
    };
  });

  // Save preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.debug('Failed to save navigation preferences:', error);
    }
  }, [preferences]);

  const updatePreference = useCallback((key: keyof typeof preferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  return {
    preferences,
    updatePreference
  };
};

export default useNavigationState;