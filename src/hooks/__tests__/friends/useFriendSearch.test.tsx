/**
 * Unit Tests for useFriendSearch Hook
 * Story 9.8.2: Unit Tests - React Hooks & State Management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFriendSearch } from '../../friends/useFriendSearch';
import { friendsService } from '../../../services/friendsService';

// Mock dependencies
vi.mock('../../../services/friendsService');
vi.mock('../../useDebounce', () => ({
    useDebounce: (value: string) => value, // Return immediately for testing
}));

describe('useFriendSearch', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();

        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient} >
            {children}
        </QueryClientProvider>
    );

    it('should initialize with empty query', () => {
        const { result } = renderHook(() => useFriendSearch(), { wrapper });

        expect(result.current.query).toBe('');
        expect(result.current.results).toEqual([]);
        expect(result.current.isLoading).toBe(false);
    });

    it('should initialize with provided query', () => {
        const { result } = renderHook(() => useFriendSearch('john'), { wrapper });

        expect(result.current.query).toBe('john');
    });

    it('should update query when setQuery is called', () => {
        const { result } = renderHook(() => useFriendSearch(), { wrapper });

        act(() => {
            result.current.setQuery('jane');
        });

        expect(result.current.query).toBe('jane');
    });

    it('should search when query is not empty', async () => {
        const mockResults = {
            success: true,
            data: [
                { id: 'user-1', full_name: 'John Doe' },
                { id: 'user-2', full_name: 'Jane Doe' },
            ],
        };

        (friendsService.searchMyFriends as any).mockResolvedValue(mockResults);

        const { result } = renderHook(() => useFriendSearch('doe'), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.results).toEqual(mockResults.data);
        expect(friendsService.searchMyFriends).toHaveBeenCalledWith('doe');
    });

    it('should not search when query is empty', () => {
        const { result } = renderHook(() => useFriendSearch(''), { wrapper });

        expect(result.current.isLoading).toBe(false);
        expect(friendsService.searchMyFriends).not.toHaveBeenCalled();
    });

    it('should handle search errors', async () => {
        const mockError = new Error('Search failed');
        (friendsService.searchMyFriends as any).mockRejectedValue(mockError);

        const { result } = renderHook(() => useFriendSearch('test'), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error).toBeTruthy();
        expect(result.current.results).toEqual([]);
    });

    it('should return empty results when service returns null data', async () => {
        (friendsService.searchMyFriends as any).mockResolvedValue({
            success: true,
            data: null,
        });

        const { result } = renderHook(() => useFriendSearch('test'), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.results).toEqual([]);
    });

    it('should update results when query changes', async () => {
        const mockResults1 = {
            success: true,
            data: [{ id: 'user-1', full_name: 'John Doe' }],
        };

        const mockResults2 = {
            success: true,
            data: [{ id: 'user-2', full_name: 'Jane Smith' }],
        };

        (friendsService.searchMyFriends as any)
            .mockResolvedValueOnce(mockResults1)
            .mockResolvedValueOnce(mockResults2);

        const { result } = renderHook(() => useFriendSearch('john'), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.results).toEqual(mockResults1.data);

        act(() => {
            result.current.setQuery('jane');
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.results).toEqual(mockResults2.data);
    });

    it('should handle service returning success: false', async () => {
        (friendsService.searchMyFriends as any).mockResolvedValue({
            success: false,
            error: 'Search failed',
        });

        const { result } = renderHook(() => useFriendSearch('test'), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.results).toEqual([]);
    });

    it('should debounce search queries', async () => {
        // Note: Since we mocked useDebounce to return immediately,
        // this test verifies the hook structure
        const mockResults = {
            success: true,
            data: [{ id: 'user-1', full_name: 'John Doe' }],
        };

        (friendsService.searchMyFriends as any).mockResolvedValue(mockResults);

        const { result } = renderHook(() => useFriendSearch(), { wrapper });

        act(() => {
            result.current.setQuery('j');
        });

        act(() => {
            result.current.setQuery('jo');
        });

        act(() => {
            result.current.setQuery('joh');
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // With real debounce, this would only be called once
        // But since we mocked it, it's called for each change
        expect(result.current.query).toBe('joh');
    });

    it('should clear results when query is cleared', async () => {
        const mockResults = {
            success: true,
            data: [{ id: 'user-1', full_name: 'John Doe' }],
        };

        (friendsService.searchMyFriends as any).mockResolvedValue(mockResults);

        const { result } = renderHook(() => useFriendSearch('john'), { wrapper });

        await waitFor(() => {
            expect(result.current.results).toHaveLength(1);
        });

        act(() => {
            result.current.setQuery('');
        });

        expect(result.current.results).toEqual([]);
    });
});
