import { useEffect, useCallback } from 'react';
import { useThemeStore, ThemeMode } from '../store/themeStore';

export function useTheme() {
    const { mode, resolvedTheme, setMode, setResolvedTheme } = useThemeStore();

    // Apply theme to DOM
    const applyTheme = useCallback((theme: 'light' | 'dark') => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Update theme-color meta tag for mobile browser chrome
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#1f2937' : '#6366f1');
        }

        setResolvedTheme(theme);
    }, [setResolvedTheme]);

    // Resolve system theme
    const resolveSystemTheme = useCallback((): 'light' | 'dark' => {
        if (typeof window === 'undefined') return 'light';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }, []);

    // Listen for OS theme changes
    useEffect(() => {
        if (mode === 'system') {
            applyTheme(resolveSystemTheme());

            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e: MediaQueryListEvent) => {
                applyTheme(e.matches ? 'dark' : 'light');
            };

            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        } else {
            applyTheme(mode);
        }
    }, [mode, applyTheme, resolveSystemTheme]);

    return {
        mode,                      // 'light' | 'dark' | 'system'
        resolvedTheme,             // 'light' | 'dark' (actual applied theme)
        isDark: resolvedTheme === 'dark',
        setMode,                   // Set preference
        toggleTheme: () => {
            const newMode: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
            setMode(newMode);
        },
    };
}
