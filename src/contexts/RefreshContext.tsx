// src/contexts/RefreshContext.tsx
// Context for triggering page data refresh without full remount
import React, { createContext, useContext, useState, useCallback } from 'react';

interface RefreshContextType {
    refreshKey: number;
    triggerRefresh: () => void;
    isRefreshing: boolean;
    setIsRefreshing: (value: boolean) => void;
}

const RefreshContext = createContext<RefreshContextType | null>(null);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const triggerRefresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    return (
        <RefreshContext.Provider value={{ refreshKey, triggerRefresh, isRefreshing, setIsRefreshing }}>
            {children}
        </RefreshContext.Provider>
    );
}

export function useRefresh() {
    const context = useContext(RefreshContext);
    if (!context) {
        // Return a default if not wrapped in provider
        return {
            refreshKey: 0,
            triggerRefresh: () => { },
            isRefreshing: false,
            setIsRefreshing: () => { },
        };
    }
    return context;
}
