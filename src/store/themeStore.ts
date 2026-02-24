import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
    mode: ThemeMode;             // User's preference: light, dark, or system
    resolvedTheme: 'light' | 'dark'; // Actual applied theme
    setMode: (mode: ThemeMode) => void;
    setResolvedTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            mode: 'system',            // Default: follow OS preference
            resolvedTheme: 'light',    // Default until system detection runs
            setMode: (mode) => set({ mode }),
            setResolvedTheme: (theme) => set({ resolvedTheme: theme }),
        }),
        {
            name: 'sync-theme',       // localStorage key
            partialize: (state) => ({ mode: state.mode }), // Only persist mode, not resolvedTheme
        }
    )
);
