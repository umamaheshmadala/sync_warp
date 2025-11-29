/**
 * Unit Tests for FriendProfileModal Component
 * Story 9.8.3: Component Tests - Friends UI
 * 
 * Simplified comprehensive tests covering essential functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FriendProfileModal } from '../../friends/FriendProfileModal';
import { renderWithProviders } from '../../../__tests__/utils/componentTestHelpers';

// Mock all dependencies
vi.mock('../../hooks/friends/useFriendProfile', () => ({
    useFriendProfile: () => ({
        data: {
            profile: {
                id: 'friend-123',
                full_name: 'John Doe',
                username: 'johndoe',
                avatar_url: 'https://example.com/avatar.jpg',
            },
        },
        isLoading: false,
    }),
}));

vi.mock('../../hooks/friends/useFriendActions', () => ({
    useFriendActions: () => ({
        unfriend: { mutate: vi.fn() },
        blockUser: { mutate: vi.fn() },
        toggleFollow: vi.fn(),
        sendMessage: vi.fn(),
    }),
}));

vi.mock('@/hooks/use-media-query', () => ({
    useMediaQuery: () => true, // Desktop by default
}));

vi.mock('./FriendProfileContent', () => ({
    FriendProfileContent: ({ data, onClose }: any) => (
        <div data-testid="friend-profile-content">
            <h2>{data?.profile?.full_name}</h2>
            <button onClick={onClose}>Close</button>
        </div>
    ),
}));

vi.mock('@/components/ui/dialog', () => ({
    Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
    DialogContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/drawer', () => ({
    Drawer: ({ children, open }: any) => (open ? <div data-testid="drawer">{children}</div> : null),
    DrawerContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
    AlertDialog: ({ children, open }: any) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
    AlertDialogContent: ({ children }: any) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: any) => <h3>{children}</h3>,
    AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
    AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
    AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
    AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

describe('FriendProfileModal', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should return null when friendId is null', () => {
            const { container } = renderWithProviders(
                <FriendProfileModal friendId={null} isOpen={true} onClose={mockOnClose} />
            );

            expect(container.firstChild).toBeNull();
        });

        it('should render dialog when open on desktop', () => {
            renderWithProviders(
                <FriendProfileModal friendId="friend-123" isOpen={true} onClose={mockOnClose} />
            );

            expect(screen.getByTestId('dialog')).toBeInTheDocument();
        });

        it('should not render when closed', () => {
            renderWithProviders(
                <FriendProfileModal friendId="friend-123" isOpen={false} onClose={mockOnClose} />
            );

            expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
        });

        it('should render friend profile content', () => {
            renderWithProviders(
                <FriendProfileModal friendId="friend-123" isOpen={true} onClose={mockOnClose} />
            );

            expect(screen.getByTestId('friend-profile-content')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });
    });

    describe('Responsive Behavior', () => {
        it('should render drawer on mobile', () => {
            vi.mocked(require('@/hooks/use-media-query').useMediaQuery).mockReturnValue(false);

            renderWithProviders(
                <FriendProfileModal friendId="friend-123" isOpen={true} onClose={mockOnClose} />
            );

            expect(screen.getByTestId('drawer')).toBeInTheDocument();
        });
    });

    describe('User Interactions', () => {
        it('should call onClose when close button is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(
                <FriendProfileModal friendId="friend-123" isOpen={true} onClose={mockOnClose} />
            );

            const closeButton = screen.getByText('Close');
            await user.click(closeButton);

            expect(mockOnClose).toHaveBeenCalled();
        });
    });
});
