import { get, set, del } from 'idb-keyval'

/**
 * Async Storage implementation using IndexedDB via idb-keyval.
 * Matches the interface required by @tanstack/query-async-storage-persister.
 */
export const asyncStorage = {
    getItem: async (key: string): Promise<string | null> => {
        try {
            const value = await get(key)
            return value ?? null
        } catch (error) {
            console.error('Error reading from async storage:', error)
            return null
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        try {
            await set(key, value)
        } catch (error) {
            console.error('Error writing to async storage:', error)
        }
    },
    removeItem: async (key: string): Promise<void> => {
        try {
            await del(key)
        } catch (error) {
            console.error('Error removing from async storage:', error)
        }
    },
}
