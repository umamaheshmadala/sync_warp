/**
 * Unit Tests for FriendRequestCard Component
 * Story 9.8.3: Component Tests - Friends UI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FriendRequestCard } from '../../friends/FriendRequestCard';
import { renderWithProviders, createMockFriendRequest } from '../../../__tests__/utils/componentTestHelpers';
import { testAccessibility } from '../../../__tests__/utils/accessibilityHelpers';

// Mock hooks and components
const mockAcceptRequest = vi.fn();
const mockRejectRequest = vi.fn();
const mockCancelRequest = vi.fn();

vi.mock('../../../hooks/friends/useRequestActions', () => ({
    useRequestActions: () => ({
        acceptRequest: mockAcceptRequest,
        rejectRequest: mockRejectRequest,
        cancelRequest: mockCancelRequest,
        isLoading: false,
    }),
}));

vi.mock('../ui/ConfirmDialog', () => ({
    ConfirmDialog: ({ isOpen, onClose, onConfirm, title, message }: any) =>
        isOpen ? (
            <div data-testid="confirm-dialog">
                <h3>{title}</h3>
                <p>{message}</p>
                <button onClick={onClose}>Cancel</button>
                <button onClick={onConfirm}>Confirm</button>
            </div>
        ) : null,
}));

describe('FriendRequestCard', () => {
    const mockRequest = createMockFriendRequest();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering - Received Request', () => {
        it('should render sender name for received request', () => {
            renderWithProviders(<FriendRequestCard request={mockRequest} type="received" />);

            expect(screen.getByText(mockRequest.sender.full_name)).toBeInTheDocument();
        });

        it('should render sender avatar when avatar_url is provided', () => {
            renderWithProviders(<FriendRequestCard request={mockRequest} type="received" />);

            const avatar = screen.getByAltText(mockRequest.sender.full_name);
            expect(avatar).toBeInTheDocument();
        });

        it('should render initials when no avatar_url', () => {
            const requestWithoutAvatar = createMockFriendRequest({
                sender: { ...mockRequest.sender, avatar_url: undefined },
            });
            renderWithProviders(<FriendRequestCard request={requestWithoutAvatar} type="received" />);

            expect(screen.getByText('U4')).toBeInTheDocument(); // User 456 -> U4
        });

        it('should render mutual friends count when provided', () => {
            const requestWithMutual = createMockFriendRequest({ mutual_friends_count: 3 });
            renderWithProviders(<FriendRequestCard request={requestWithMutual} type="received" />);

            expect(screen.getByText(/3 mutual friends/i)).toBeInTheDocument();
        });

        it('should render request message when provided', () => {
            renderWithProviders(<FriendRequestCard request={mockRequest} type="received" />);

            expect(screen.getByText(`"${mockRequest.message}"`)).toBeInTheDocument();
        });

        it('should render timestamp', () => {
            renderWithProviders(<FriendRequestCard request={mockRequest} type="received" />);

            expect(screen.getByText(/ago/i)).toBeInTheDocument();
        });
    });

    describe('Rendering - Sent Request', () => {
        it('should render receiver name for sent request', () => {
            renderWithProviders(<FriendRequestCard request={mockRequest} type="sent" />);

            expect(screen.getByText(mockRequest.receiver.full_name)).toBeInTheDocument();
        });
    });

    describe('Actions - Received Request', () => {
        it('should show accept and reject buttons for received request', () => {
            renderWithProviders(<FriendRequestCard request={mockRequest} type="received" />);

            expect(screen.getByText('Accept')).toBeInTheDocument();
            expect(screen.getByText('Reject')).toBeInTheDocument();
        });

        it('should call acceptRequest when accept button is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FriendRequestCard request={mockRequest} type="received" />);

            const acceptButton = screen.getByText('Accept');
            await user.click(acceptButton);

            expect(mockAcceptRequest).toHaveBeenCalledWith(mockRequest.id);
        });

        it('should show reject confirmation dialog when reject is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FriendRequestCard request={mockRequest} type="received" />);

            const rejectButton = screen.getByText('Reject');
            await user.click(rejectButton);

            expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
            expect(screen.getByText('Reject Friend Request?')).toBeInTheDocument();
        });

        it('should call rejectRequest when confirmed', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FriendRequestCard request={mockRequest} type="received" />);

            // Open dialog
            const rejectButton = screen.getByText('Reject');
            await user.click(rejectButton);

            // Confirm
            const confirmButton = screen.getByText('Confirm');
            await user.click(confirmButton);

            expect(mockRejectRequest).toHaveBeenCalledWith(mockRequest.id);
        });

        it('should close dialog when cancel is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FriendRequestCard request={mockRequest} type="received" />);

            // Open dialog
            const rejectButton = screen.getByText('Reject');
            await user.click(rejectButton);

            // Cancel
            const cancelButton = screen.getByText('Cancel');
            await user.click(cancelButton);

            await waitFor(() => {
                expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
            });
        });
    });

    describe('Actions - Sent Request', () => {
        it('should show cancel button for sent request', () => {
            renderWithProviders(<FriendRequestCard request={mockRequest} type="sent" />);

            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        it('should call cancelRequest when cancel button is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FriendRequestCard request={mockRequest} type="sent" />);

            const cancelButton = screen.getByText('Cancel');
            await user.click(cancelButton);

            expect(mockCancelRequest).toHaveBeenCalledWith(mockRequest.id);
        });
    });

    describe('Edge Cases', () => {
        it('should return null when otherUser is not defined', () => {
            const invalidRequest = { ...mockRequest, sender: null } as any;
            const { container } = renderWithProviders(
                <FriendRequestCard request={invalidRequest} type="received" />
            );

            expect(container.firstChild).toBeNull();
        });
    });

    describe('Accessibility', () => {
        it('should have no accessibility violations', async () => {
            const { container } = renderWithProviders(
                <FriendRequestCard request={mockRequest} type="received" />
            );

            await testAccessibility(container);
        });
    });
});
