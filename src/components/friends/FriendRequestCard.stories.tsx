import type { Meta, StoryObj } from '@storybook/react';
import { FriendRequestCard } from './FriendRequestCard';
import type { FriendRequest } from '../../types/friends';

const meta: Meta<typeof FriendRequestCard> = {
  title: 'Friends/FriendRequestCard',
  component: FriendRequestCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FriendRequestCard>;

const baseRequest: FriendRequest = {
  id: '1',
  sender_id: 'user-123',
  receiver_id: 'user-456',
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  sender: {
    id: 'user-123',
    full_name: 'Jane Smith',
    username: 'janesmith',
    email: 'jane@example.com',
    avatar_url: 'https://i.pravatar.cc/150?u=janesmith',
  },
};

export const ReceivedPending: Story = {
  args: {
    request: baseRequest,
    type: 'received',
  },
};

export const SentPending: Story = {
  args: {
    request: baseRequest,
    type: 'sent',
  },
};

export const Loading: Story = {
  args: {
    request: baseRequest,
    type: 'received',
    isLoading: true,
  },
};

export const WithMutualFriends: Story = {
  args: {
    request: {
      ...baseRequest,
      sender: {
        ...baseRequest.sender!,
        mutual_friends_count: 12,
      },
    },
    type: 'received',
  },
};
