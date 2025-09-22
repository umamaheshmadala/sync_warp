# Friend Management System

A comprehensive friend management system built for React with real-time updates, interactive components, and social features.

## Overview

This friend management system provides a complete social networking experience with features for adding friends, managing friend requests, sharing deals, viewing friend activities, and real-time status updates.

## Components

### Core Components

#### 1. `useFriends` Hook (`../hooks/useFriends.ts`)
The central hook that manages all friend-related state and operations:

- **State Management**: Friends list, friend requests, activities, online status
- **Actions**: Add/remove friends, accept/reject requests, share activities
- **Real-time Updates**: Supabase subscriptions for live data
- **Haptic Feedback**: Integration with device haptic feedback

```typescript
const {
  friends,
  friendRequests,
  friendActivities,
  totalFriends,
  onlineCount,
  loading,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  shareActivity,
  refreshActivities
} = useFriends();
```

#### 2. `ContactsSidebar` Component
Enhanced sidebar displaying the user's friends list:

**Features:**
- Real-time friend list with online status indicators
- Search and filter functionality (online friends only)
- Friend counts and request notifications
- Quick actions (share deals, message, remove friends)
- Animated presence indicators
- Modal integration for adding friends and managing requests

**Usage:**
```tsx
<ContactsSidebar 
  isOpen={isContactsOpen} 
  onClose={() => setIsContactsOpen(false)} 
/>
```

#### 3. `AddFriend` Component
Modal for discovering and adding new friends:

**Features:**
- Debounced search by name or email
- Real-time search results
- Friend request sending with feedback
- Duplicate request prevention
- Loading states and error handling

**Usage:**
```tsx
<AddFriend 
  isOpen={showAddFriend} 
  onClose={() => setShowAddFriend(false)} 
/>
```

#### 4. `FriendRequests` Component
Modal for managing incoming friend requests:

**Features:**
- Incoming friend requests list
- Accept/reject actions with haptic feedback
- Time-ago formatting for request dates
- Processing states and notifications
- Bulk actions support

**Usage:**
```tsx
<FriendRequests 
  isOpen={showRequests} 
  onClose={() => setShowRequests(false)} 
/>
```

#### 5. `ShareDeal` Component
Modal for sharing deals with specific friends:

**Features:**
- Deal selection with search functionality
- Personalized message attachment
- Deal preview with pricing and expiration
- Share success feedback
- Integration with friend activity system

**Usage:**
```tsx
<ShareDeal
  friendId={selectedFriendId}
  dealId={optionalDealId}
  isOpen={true}
  onClose={() => setShowShareDeal(null)}
/>
```

#### 6. `FriendActivityFeed` Component
Real-time feed of friend activities:

**Features:**
- Multiple activity types (saves, shares, purchases, social)
- Filterable activity feed
- Real-time activity updates
- Rich activity descriptions with metadata
- Color-coded activity types
- Refresh functionality

**Activity Types:**
- `deal_save`: Friend saved a deal
- `deal_share`: Friend shared a deal
- `deal_purchase`: Friend purchased a deal
- `deal_view`: Friend viewed a deal
- `friend_add`: Friend joined network
- `profile_update`: Friend updated profile

**Usage:**
```tsx
<FriendActivityFeed 
  className="w-full" 
  limit={20}
  showFilters={true}
/>
```

#### 7. `FriendManagement` Component
Comprehensive dashboard integrating all friend features:

**Features:**
- Friend statistics dashboard
- Quick action buttons for all friend operations
- Integrated activity feed
- Modal management for all friend components
- Responsive design with hover animations

**Usage:**
```tsx
<FriendManagement className="p-6" />
```

## Database Schema

### Tables Required

1. **friendships**
   ```sql
   CREATE TABLE friendships (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id),
     friend_id UUID REFERENCES auth.users(id),
     status VARCHAR CHECK (status IN ('pending', 'accepted', 'rejected')),
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(user_id, friend_id)
   );
   ```

2. **friend_activities**
   ```sql
   CREATE TABLE friend_activities (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id),
     type VARCHAR NOT NULL,
     deal_id UUID REFERENCES deals(id),
     deal_title VARCHAR,
     message TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **profiles** (extended)
   ```sql
   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW();
   ```

## Features

### Real-time Updates
- Live friend status updates
- Real-time activity feed
- Online presence indicators
- Friend request notifications

### Social Interactions
- Friend discovery and requests
- Deal sharing with personalized messages
- Activity tracking and feed
- Friend removal and management

### User Experience
- Haptic feedback on interactions
- Smooth animations with Framer Motion
- Responsive design for all screen sizes
- Loading states and error handling
- Search and filtering capabilities

### Performance
- Debounced search inputs
- Optimized re-renders with React hooks
- Efficient Supabase subscriptions
- Lazy loading and pagination support

## Dependencies

```json
{
  "@headlessui/react": "^1.7.x",
  "@supabase/supabase-js": "^2.x",
  "date-fns": "^2.x",
  "framer-motion": "^10.x",
  "lucide-react": "^0.x",
  "react": "^18.x"
}
```

## Installation

1. Install required dependencies:
```bash
npm install @headlessui/react @supabase/supabase-js date-fns framer-motion lucide-react
```

2. Set up database tables using the provided SQL schema

3. Configure Supabase client in your app

4. Import and use components as needed

## Usage Examples

### Basic Integration
```tsx
import { FriendManagement } from '../components';

function App() {
  return (
    <div className="container mx-auto p-6">
      <FriendManagement />
    </div>
  );
}
```

### Custom Integration
```tsx
import { 
  ContactsSidebar, 
  AddFriend, 
  FriendActivityFeed 
} from '../components';

function CustomFriendInterface() {
  const [showSidebar, setShowSidebar] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowSidebar(true)}>
        View Friends
      </button>
      
      <FriendActivityFeed limit={10} />
      
      <ContactsSidebar 
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
      />
    </>
  );
}
```

## Customization

### Styling
All components use Tailwind CSS classes and can be customized by:
- Modifying className props
- Overriding CSS classes
- Using Tailwind configuration

### Behavior
Components accept various props for customization:
- Activity feed limits and filters
- Search behavior and debounce timing
- Animation preferences
- Haptic feedback settings

## Best Practices

1. **State Management**: Use the `useFriends` hook as the single source of truth
2. **Performance**: Implement proper loading states and error boundaries
3. **Accessibility**: Ensure proper ARIA labels and keyboard navigation
4. **Real-time**: Handle connection states and subscription cleanup
5. **Security**: Validate friend operations server-side
6. **UX**: Provide clear feedback for all user actions

## Contributing

When extending the friend management system:

1. Follow the established component structure
2. Use TypeScript for type safety
3. Implement proper error handling
4. Add loading states for async operations
5. Include haptic feedback for interactions
6. Maintain responsive design principles
7. Add comprehensive documentation

## Support

For issues or feature requests, please refer to the main project documentation or create an issue in the project repository.