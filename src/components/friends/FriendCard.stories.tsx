import type { Meta, StoryObj } from '@storybook/react';
import { FriendCard } from './FriendCard';
import type { Friend } from '../../types/friends';

const meta: Meta<typeof FriendCard> = {
  title: 'Friends/FriendCard',
  component: FriendCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'card clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof FriendCard>;

const baseFriend: Friend = {
  id: '1',
  full_name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
  avatar_url: 'https://i.pravatar.cc/150?u=johndoe',
  is_online: true,
  last_active: new Date().toISOString(),
  mutual_friends_count: 5,
};

export const Default: Story = {
  args: {
    friend: baseFriend,
  },
};

export const Offline: Story = {
  args: {
    friend: {
      ...baseFriend,
      is_online: false,
      last_active: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
  },
};

export const NoAvatar: Story = {
  args: {
    friend: {
      ...baseFriend,
      avatar_url: null,
    },
  },
};

export const LongName: Story = {
  args: {
    friend: {
      ...baseFriend,
      full_name: 'Alexander Christopher Montgomery III',
    },
  },
};
