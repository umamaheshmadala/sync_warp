/**
 * Unit Tests for FriendsList Component
 * Story 9.8.3: Component Tests - Friends UI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FriendsList } from '../../friends/FriendsList';
import { renderWithProviders, createMockFriends } from '../../../__tests__/utils/componentTestHelpers';
import { testAccessibility } from '../../../__tests__/utils/accessibilityHelpers';
import * as useFriendsListHook from '../../../hooks/friends/useFriendsList';
import * as useRealtimeFriendsHook from '../../../hooks/friends/useRealtimeFriends';

// Mock hooks
vi.mock('../../../hooks/friends/useFriendsList');
vi.mock('../../../hooks/friends/useRealtimeFriends');
vi.mock('../../friends/FriendProfileModal', () => ({
    FriendProfileModal: ({ isOpen, onClose }: any) =>
        isOpen ? <div data-testid="friend-profile-modal" onClick={onClose}>Modal</div> : null,
}));
vi.mock('../ui/skeletons/FriendsListSkeleton', () => ({
    FriendsListSkeleton: () => <div data-testid="loading-skeleton">Loading...</div>,
}));
vi.mock('./EmptyStates', () => ({
    NoFriendsEmptyState: () => <div data-testid="no-friends-empty">No friends yet</div>,
    SearchNoResultsEmptyState: ({ query }: any) => (
        <div data-testid="search-no-results">No results for "{query}"</div>
    ),
}));

describe('FriendsList', () => {
    const mockFriends = createMockFriends(5);

    beforeEach(() => {
        vi.clearAllMocks();
        (useRealtimeFriendsHook.useRealtimeFriends as any).mockImplementation(() => {});
    });

    describe('Loading State', () => {
        it('should show loading skeleton when loading', () => {
            (useFriendsListHook.useFriendsList as any).mockReturnValue({
                friends: [],
                isLoading: true,
                isFetchingNextPage: false,
                hasNextPage: false,
                fetchNextPage: vi.fn(),
                error: null,
            });

            renderWithProviders(<FriendsList />);

            expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
        });
    });

    describe('Error State', () => {
        it('should show error message when there is an error', () => {
            (useFriendsListHook.useFriendsList as any).mockReturnValue({
                friends: [],
                isLoading: false,
                isFetchingNextPage: false,
                hasNextPage: false,
                fetchNextPage: vi.fn(),
                error: new Error('Failed to load'),
            });

            renderWithProviders(<FriendsList />);

            expect(screen.getByText(/error loading friends/i)).toBeInTheDocument();
        });
    });

    describe('Empty State', () => {
        it('should show empty state when no friends', () => {
            (useFriendsListHook.useFriendsList as any).mockReturnValue({
                friends: [],
                isLoading: false,
                isFetchingNextPage: false,
                hasNextPage: false,
                fetchNextPage: vi.fn(),
                error: null,
            });

            renderWithProviders(<FriendsList />);

            expect(screen.getByTestId('no-friends-empty')).toBeInTheDocument();
        });
    });

    describe('Friends List Rendering', () => {
        beforeEach(() => {
            (useFriendsListHook.useFriendsList as any).mockReturnValue({
                friends: mockFriends,
                isLoading: false,
                isFetchingNextPage: false,
                hasNextPage: false,
                fetchNextPage: vi.fn(),
                error: null,
            });
        });

        it('should render all friends', () => {
            renderWithProviders(<FriendsList />);

            mockFriends.forEach((friend) => {
                expect(screen.getByText(friend.full_name)).toBeInTheDocument();
            });
        });

        it('should render friend cards', () => {
            renderWithProviders(<FriendsList />);

            const friendCards = screen.getAllByTestId('friend-card');
            expect(friendCards).toHaveLength(mockFriends.length);
        });
    });

    describe('Search Functionality', () => {
        beforeEach(() => {
            (useFriendsListHook.useFriendsList as any).mockReturnValue({
                friends: mockFriends,
                isLoading: false,
                isFetchingNextPage: false,
                hasNextPage: false,
                fetchNextPage: vi.fn(),
                error: null,
            });
        });

        it('should filter friends by search query', () => {
            renderWithProviders(<FriendsList searchQuery="User 1" />);

            expect(screen.getByText('User 1')).toBeInTheDocument();
            expect(screen.queryByText('User 2')).not.toBeInTheDocument();
        });

        it('should show results count when searching', () => {
            renderWithProviders(<FriendsList searchQuery="User" />);

            expect(screen.getByText(/showing 5 of 5 friends/i)).toBeInTheDocument();
        });

        it('should show no results state when search has no matches', () => {
            renderWithProviders(<FriendsList searchQuery="NonExistent" />);

            expect(screen.getByTestId('search-no-results')).toBeInTheDocument();
            expect(screen.getByText(/no results for "NonExistent"/i)).toBeInTheDocument();
        });

        it('should show all friends when search query is empty', () => {
            renderWithProviders(<FriendsList searchQuery="" />);

            const friendCards = screen.getAllByTestId('friend-card');
            expect(friendCards).toHaveLength(mockFriends.length);
        });
    });

    describe('Infinite Scroll', () => {
        it('should show loading indicator when fetching next page', () => {
            (useFriendsListHook.useFriendsList as any).mockReturnValue({
                friends: mockFriends,
                isLoading: false,
                isFetchingNextPage: true,
                hasNextPage: true,
                fetchNextPage: vi.fn(),
                error: null,
            });

            renderWithProviders(<FriendsList />);

            expect(screen.getByText(/loading more/i)).toBeInTheDocument();
        });

        it('should not show infinite scroll trigger when searching', () => {
            (useFriendsListHook.useFriendsList as any).mockReturnValue({
                friends: mockFriends,
                isLoading: false,
                isFetchingNextPage: false,
                hasNextPage: true,
                fetchNextPage: vi.fn(),
                error: null,
            });

            const { container } = renderWithProviders(<FriendsList searchQuery="User" />);

            // Infinite scroll trigger should not be present when searching
            const scrollTrigger = container.querySelector('.h-4');
            expect(scrollTrigger).not.toBeInTheDocument();
        });
    });

    describe('Friend Profile Modal', () => {
        beforeEach(() => {
            (useFriendsListHook.useFriendsList as any).mockReturnValue({
                friends: mockFriends,
                isLoading: false,
                isFetchingNextPage: false,
                hasNextPage: false,
                fetchNextPage: vi.fn(),
                error: null,
            });
        });

        it('should open profile modal when friend card is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FriendsList />);

            const firstFriendCard = screen.getAllByTestId('friend-card')[0];
            await user.click(firstFriendCard);

            expect(screen.getByTestId('friend-profile-modal')).toBeInTheDocument();
        });

        it('should close profile modal when modal is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FriendsList />);

            // Open modal
            const firstFriendCard = screen.getAllByTestId('friend-card')[0];
            await user.click(firstFriendCard);

            expect(screen.getByTestId('friend-profile-modal')).toBeInTheDocument();

            // Close modal
            await user.click(screen.getByTestId('friend-profile-modal'));

            await waitFor(() => {
                expect(screen.queryByTestId('friend-profile-modal')).not.toBeInTheDocument();
            });
        });
    });

    describe('Realtime Integration', () => {
        it('should initialize realtime friends hook', () => {
            (useFriendsListHook.useFriendsList as any).mockReturnValue({
                friends: mockFriends,
                isLoading: false,
                isFetchingNextPage: false,
                hasNextPage: false,
                fetchNextPage: vi.fn(),
                error: null,
            });

            renderWithProviders(<FriendsList />);

            expect(useRealtimeFriendsHook.useRealtimeFriends).toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        it('should have no accessibility violations', async () => {
            (useFriendsListHook.useFriendsList as any).mockReturnValue({
                friends: mockFriends,
                isLoading: false,
                isFetchingNextPage: false,
                hasNextPage: false,
                fetchNextPage: vi.fn(),
                error: null,
            });

            const { container } = renderWithProviders(<FriendsList />);

            await testAccessibility(container);
        });
    });
});
