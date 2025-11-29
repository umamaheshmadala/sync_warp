/**
 * Unit Tests for FriendPickerModal Component
 * Story 9.8.3: Component Tests - Friends UI
 * 
 * Simplified comprehensive tests covering essential functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FriendPickerModal } from '../../Sharing/FriendPickerModal';
import { renderWithProviders, createMockFriends } from '../../../__tests__/utils/componentTestHelpers';

// Mock hooks
vi.mock('../../hooks/useOptimizedSearch', () => ({
    useOptimizedSearch: () => ({
        searchQuery: '',
        setSearchQuery: vi.fn(),
        debouncedQuery: '',
    }),
}));

vi.mock('../../hooks/friends/useFriends', () => ({
    useFriends: () => ({
        data: createMockFriends(3),
        isLoading: false,
    }),
}));

describe('FriendPickerModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('Rendering', () => {
        it('should render modal when open', () => {
            renderWithProviders(
                <FriendPickerModal
                    dealId="deal-123"
                    isOpen={true}
                    onClose={mockOnClose}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(screen.getByText(/share deal/i)).toBeInTheDocument();
        });

        it('should not render when closed', () => {
            renderWithProviders(
                <FriendPickerModal
                    dealId="deal-123"
                    isOpen={false}
                    onClose={mockOnClose}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(screen.queryByText(/share deal/i)).not.toBeInTheDocument();
        });

        it('should render search input', () => {
            renderWithProviders(
                <FriendPickerModal
                    dealId="deal-123"
                    isOpen={true}
                    onClose={mockOnClose}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(screen.getByPlaceholderText(/search friends/i)).toBeInTheDocument();
        });
    });

    describe('Friend Selection', () => {
        it('should allow selecting friends', async () => {
            const user = userEvent.setup();
            renderWithProviders(
                <FriendPickerModal
                    dealId="deal-123"
                    isOpen={true}
                    onClose={mockOnClose}
                    onSuccess={mockOnSuccess}
                />
            );

            const friendCheckboxes = screen.getAllByRole('checkbox');
            if (friendCheckboxes.length > 0) {
                await user.click(friendCheckboxes[0]);
                expect(friendCheckboxes[0]).toBeChecked();
            }
        });
    });

    describe('Share Actions', () => {
        it('should show share button', () => {
            renderWithProviders(
                <FriendPickerModal
                    dealId="deal-123"
                    isOpen={true}
                    onClose={mockOnClose}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(screen.getByText(/share/i)).toBeInTheDocument();
        });

        it('should call onClose when cancel is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(
                <FriendPickerModal
                    dealId="deal-123"
                    isOpen={true}
                    onClose={mockOnClose}
                    onSuccess={mockOnSuccess}
                />
            );

            const cancelButton = screen.getByText(/cancel/i);
            await user.click(cancelButton);

            expect(mockOnClose).toHaveBeenCalled();
        });
    });
});
