// FavoritesContext.tsx
// Global context for sharing favorites state across all components
// Story 4.13 - Ensures state persistence and consistency

import React, { createContext, useContext } from 'react';
import { useOfferProductFavorites } from '../hooks/useOfferProductFavorites';

const FavoritesContext = createContext<ReturnType<typeof useOfferProductFavorites> | null>(null);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const favorites = useOfferProductFavorites({ autoLoad: true });

    return (
        <FavoritesContext.Provider value={favorites}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavoritesContext = () => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavoritesContext must be used within FavoritesProvider');
    }
    return context;
};
