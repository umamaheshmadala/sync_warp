/**
 * Unit Tests for FriendLeaderboard Component
 * Story 9.8.3: Component Tests - Friends UI
 * 
 * Simplified comprehensive tests covering essential functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { FriendLeaderboard } from '../../friends/FriendLeaderboard';
import { renderWithProviders } from '../../../__tests__/utils/componentTestHelpers';

// Mock hooks
vi.mock('../../hooks/friends/useFriendLeaderboard', () => ({
    useFriendLeaderboard: () => ({
        data: [
            { id: '1', full_name: 'User 1', points: 100, rank: 1 },
            { id: '2', full_name: 'User 2', points: 90, rank: 2 },
            { id: '3', full_name: 'User 3', points: 80, rank: 3 },
        ],
        isLoading: false,
        error: null,
    }),
}));

describe('FriendLeaderboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render leaderboard title', () => {
            renderWithProviders(<FriendLeaderboard />);

            expect(screen.getByText(/leaderboard/i)).toBeInTheDocument();
        });

        it('should render all friends in leaderboard', () => {
            renderWithProviders(<FriendLeaderboard />);

            expect(screen.getByText('User 1')).toBeInTheDocument();
            expect(screen.getByText('User 2')).toBeInTheDocument();
            expect(screen.getByText('User 3')).toBeInTheDocument();
        });

        it('should display ranks', () => {
            renderWithProviders(<FriendLeaderboard />);

            expect(screen.getByText('1')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument();
        });

        it('should display points', () => {
            renderWithProviders(<FriendLeaderboard />);

            expect(screen.getByText(/100/)).toBeInTheDocument();
            expect(screen.getByText(/90/)).toBeInTheDocument();
            expect(screen.getByText(/80/)).toBeInTheDocument();
        });
    });

    describe('Loading State', () => {
        it('should show loading state', () => {
            vi.mocked(require('../../hooks/friends/useFriendLeaderboard').useFriendLeaderboard).mockReturnValue({
                data: [],
                isLoading: true,
                error: null,
            });

            renderWithProviders(<FriendLeaderboard />);

            expect(screen.getByText(/loading/i)).toBeInTheDocument();
        });
    });

    describe('Empty State', () => {
        it('should show empty state when no data', () => {
            vi.mocked(require('../../hooks/friends/useFriendLeaderboard').useFriendLeaderboard).mockReturnValue({
                data: [],
                isLoading: false,
                error: null,
            });

            renderWithProviders(<FriendLeaderboard />);

            expect(screen.getByText(/no friends/i)).toBeInTheDocument();
        });
    });
});
