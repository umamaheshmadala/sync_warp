/**
 * Unit Tests for FriendCard Component
 * Story 9.8.3: Component Tests - Friends UI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FriendCard } from '../../friends/FriendCard';
import { renderWithProviders, createMockFriend } from '../../../__tests__/utils/componentTestHelpers';
import { testAccessibility } from '../../../__tests__/utils/accessibilityHelpers';

// Mock hooks and components
vi.mock('../../../hooks/friends/useFriendActions', () => ({
    useFriendActions: () => ({
        unfriend: { mutate: vi.fn() },
        sendMessage: vi.fn(),
    }),
}));

vi.mock('../status/OnlineStatusBadge', () => ({
    OnlineStatusBadge: ({ userId }: any) => <div data-testid="online-status-badge">{userId}</div>,
    OnlineStatusDot: ({ userId }: any) => <div data-testid="online-status-dot">{userId}</div>,
}));

describe('FriendCard', () => {
    const mockFriend = createMockFriend();
    const mockOnClick = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render friend name', () => {
            renderWithProviders(<FriendCard friend={mockFriend} onClick={mockOnClick} />);

            expect(screen.getByText(mockFriend.full_name)).toBeInTheDocument();
        });

        it('should render friend avatar when avatar_url is provided', () => {
            renderWithProviders(<FriendCard friend={mockFriend} onClick={mockOnClick} />);

            const avatar = screen.getByAltText(mockFriend.full_name);
            expect(avatar).toBeInTheDocument();
            expect(avatar).toHaveAttribute('src', mockFriend.avatar_url);
        });

        it('should render initials when no avatar_url', () => {
            const friendWithoutAvatar = createMockFriend({ avatar_url: undefined });
            renderWithProviders(<FriendCard friend={friendWithoutAvatar} onClick={mockOnClick} />);

            expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe -> JD
        });

        it('should render online status badge', () => {
            renderWithProviders(<FriendCard friend={mockFriend} onClick={mockOnClick} />);

            expect(screen.getByTestId('online-status-badge')).toBeInTheDocument();
        });

        it('should render online status dot when is_online is defined', () => {
            renderWithProviders(<FriendCard friend={mockFriend} onClick={mockOnClick} />);

            expect(screen.getByTestId('online-status-dot')).toBeInTheDocument();
        });
    });

    describe('User Interactions', () => {
        it('should call onClick when card is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FriendCard friend={mockFriend} onClick={mockOnClick} />);

            const card = screen.getByTestId('friend-card');
            await user.click(card);

            expect(mockOnClick).toHaveBeenCalledTimes(1);
        });

        it('should show message button', () => {
            renderWithProviders(<FriendCard friend={mockFriend} onClick={mockOnClick} />);

            const messageButton = screen.getByLabelText('Send message');
            expect(messageButton).toBeInTheDocument();
        });

        it('should show unfriend button', () => {
            renderWithProviders(<FriendCard friend={mockFriend} onClick={mockOnClick} />);

            const unfriendButton = screen.getByLabelText('Unfriend');
            expect(unfriendButton).toBeInTheDocument();
        });

        it('should open confirmation dialog when unfriend is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FriendCard friend={mockFriend} onClick={mockOnClick} />);

            const unfriendButton = screen.getByLabelText('Unfriend');
            await user.click(unfriendButton);

            expect(screen.getByText(`Unfriend ${mockFriend.full_name}?`)).toBeInTheDocument();
        });

        it('should not trigger card onClick when action buttons are clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FriendCard friend={mockFriend} onClick={mockOnClick} />);

            const messageButton = screen.getByLabelText('Send message');
            await user.click(messageButton);

            expect(mockOnClick).not.toHaveBeenCalled();
        });
    });

    describe('Unfriend Confirmation Dialog', () => {
        it('should close dialog when cancel is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FriendCard friend={mockFriend} onClick={mockOnClick} />);

            // Open dialog
            const unfriendButton = screen.getByLabelText('Unfriend');
            await user.click(unfriendButton);

            // Close dialog
            const cancelButton = screen.getByText('Cancel');
            await user.click(cancelButton);

            await waitFor(() => {
                expect(screen.queryByText(`Unfriend ${mockFriend.full_name}?`)).not.toBeInTheDocument();
            });
        });

        it('should show confirmation message in dialog', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FriendCard friend={mockFriend} onClick={mockOnClick} />);

            const unfriendButton = screen.getByLabelText('Unfriend');
            await user.click(unfriendButton);

            expect(screen.getByText(/are you sure you want to remove this person/i)).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have accessible button labels', () => {
            renderWithProviders(<FriendCard friend={mockFriend} onClick={mockOnClick} />);

            expect(screen.getByLabelText('Send message')).toBeInTheDocument();
            expect(screen.getByLabelText('Unfriend')).toBeInTheDocument();
        });

        it('should have no accessibility violations', async () => {
            const { container } = renderWithProviders(
                <FriendCard friend={mockFriend} onClick={mockOnClick} />
            );

            await testAccessibility(container);
        });
    });
});
