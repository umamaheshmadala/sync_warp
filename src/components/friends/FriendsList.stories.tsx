import type { Meta, StoryObj } from '@storybook/react';
import { FriendsList } from './FriendsList';
import type { Friend } from '../../types/friends';

const meta: Meta<typeof FriendsList> = {
  title: 'Friends/FriendsList',
  component: FriendsList,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FriendsList>;

const mockFriends: Friend[] = Array.from({ length: 10 }, (_, i) => ({
  id: `user-${i}`,
  full_name: `Friend ${i + 1}`,
  username: `friend${i + 1}`,
  email: `friend${i + 1}@example.com`,
  avatar_url: `https://i.pravatar.cc/150?u=friend${i + 1}`,
  is_online: i % 2 === 0,
  last_active: new Date(Date.now() - i * 3600000).toISOString(),
  mutual_friends_count: Math.floor(Math.random() * 20),
}));

export const Default: Story = {
  args: {
    friends: mockFriends,
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    friends: [],
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    friends: [],
    isLoading: false,
  },
};

export const Error: Story = {
  args: {
    friends: [],
    isLoading: false,
    error: new Error('Failed to load friends'),
  },
};
