# Story 9.8.3: Component Tests - Friends UI

**Epic:** [EPIC 9.8: Testing, Performance & QA](../epics/EPIC_9.8_Testing_Performance_QA.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 2 days  
**MCP Usage:** 🧠 Context7 MCP (Medium)  
**Dependencies:** Story 9.8.1, Story 9.8.2, Epics 9.1-9.7  
**Status:** 📋 Planning

---

## 📋 Story Description

Create comprehensive component tests for all Friends Module UI components using React Testing Library. Test user interactions, accessibility, responsive behavior, and visual states.

---

## ✅ Acceptance Criteria

### Component Tests
- [ ] 70%+ coverage for `src/components/friends/FriendsList.tsx`
- [ ] 70%+ coverage for `src/components/friends/FriendRequestCard.tsx`
- [ ] 70%+ coverage for `src/components/friends/FriendProfileModal.tsx`
- [ ] 70%+ coverage for `src/components/friends/PYMKCard.tsx`
- [ ] 70%+ coverage for `src/components/sharing/FriendPickerModal.tsx`
- [ ] 70%+ coverage for `src/components/friends/FriendLeaderboard.tsx`

### Interaction Tests
- [ ] Test button clicks and form submissions
- [ ] Test input changes and validations
- [ ] Test modal open/close behavior
- [ ] Test dropdown and select interactions
- [ ] Test infinite scroll and pagination

### Accessibility Tests
- [ ] Test with jest-axe for ARIA violations
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Test focus management
- [ ] Test color contrast

### Responsive Tests
- [ ] Test mobile layouts (320px, 375px, 414px)
- [ ] Test tablet layouts (768px, 1024px)
- [ ] Test desktop layouts (1280px, 1920px)
- [ ] Test orientation changes

---

## 🎨 Implementation

### Test File Structure

```
src/components/__tests__/
├── friends/
│   ├── FriendsList.test.tsx
│   ├── FriendRequestCard.test.tsx
│   ├── FriendProfileModal.test.tsx
│   ├── PYMKCard.test.tsx
│   └── FriendLeaderboard.test.tsx
└── sharing/
    └── FriendPickerModal.test.tsx
```

### Example Test: FriendsList.test.tsx

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FriendsList } from '@/components/friends/FriendsList';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('FriendsList', () => {
  const mockFriends = [
    { id: '1', full_name: 'John Doe', avatar_url: 'url1', is_online: true },
    { id: '2', full_name: 'Jane Smith', avatar_url: 'url2', is_online: false },
  ];

  it('should render friends list', () => {
    render(<FriendsList friends={mockFriends} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should show online status', () => {
    render(<FriendsList friends={mockFriends} />);

    const onlineIndicator = screen.getAllByTestId('online-indicator')[0];
    expect(onlineIndicator).toHaveClass('bg-green-500');
  });

  it('should handle friend click', () => {
    const onFriendClick = vi.fn();
    render(<FriendsList friends={mockFriends} onFriendClick={onFriendClick} />);

    fireEvent.click(screen.getByText('John Doe'));

    expect(onFriendClick).toHaveBeenCalledWith('1');
  });

  it('should show empty state when no friends', () => {
    render(<FriendsList friends={[]} />);

    expect(screen.getByText(/no friends yet/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<FriendsList friends={[]} isLoading={true} />);

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<FriendsList friends={mockFriends} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should support keyboard navigation', () => {
    const onFriendClick = vi.fn();
    render(<FriendsList friends={mockFriends} onFriendClick={onFriendClick} />);

    const firstFriend = screen.getByText('John Doe').closest('button');
    firstFriend?.focus();

    fireEvent.keyDown(firstFriend!, { key: 'Enter' });

    expect(onFriendClick).toHaveBeenCalledWith('1');
  });

  it('should render correctly on mobile', () => {
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));

    render(<FriendsList friends={mockFriends} />);

    const list = screen.getByRole('list');
    expect(list).toHaveClass('grid-cols-1');
  });

  it('should render correctly on desktop', () => {
    global.innerWidth = 1280;
    global.dispatchEvent(new Event('resize'));

    render(<FriendsList friends={mockFriends} />);

    const list = screen.getByRole('list');
    expect(list).toHaveClass('grid-cols-3');
  });
});
```

### Example Test: FriendPickerModal.test.tsx

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FriendPickerModal } from '@/components/sharing/FriendPickerModal';

describe('FriendPickerModal', () => {
  const mockFriends = [
    { userId: '1', fullName: 'John Doe', avatarUrl: 'url1' },
    { userId: '2', fullName: 'Jane Smith', avatarUrl: 'url2' },
  ];

  it('should open modal', () => {
    render(
      <FriendPickerModal
        dealId="deal-123"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Share Deal')).toBeInTheDocument();
  });

  it('should close modal on X button click', () => {
    const onClose = vi.fn();
    render(
      <FriendPickerModal
        dealId="deal-123"
        isOpen={true}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('should search friends', async () => {
    render(
      <FriendPickerModal
        dealId="deal-123"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search friends...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('should select multiple friends', () => {
    render(
      <FriendPickerModal
        dealId="deal-123"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('John Doe'));
    fireEvent.click(screen.getByText('Jane Smith'));

    expect(screen.getByText('2 friends selected')).toBeInTheDocument();
  });

  it('should share with selected friends', async () => {
    const onSuccess = vi.fn();
    render(
      <FriendPickerModal
        dealId="deal-123"
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    fireEvent.click(screen.getByText('John Doe'));
    fireEvent.click(screen.getByText(/share with 1 friend/i));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(['1']);
    });
  });

  it('should show recently shared with', () => {
    localStorage.setItem('recently_shared_with', JSON.stringify(['1', '2']));

    render(
      <FriendPickerModal
        dealId="deal-123"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Recently Shared With')).toBeInTheDocument();
  });

  it('should add custom message', () => {
    render(
      <FriendPickerModal
        dealId="deal-123"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Add a message (optional)'));

    const messageInput = screen.getByPlaceholderText('Say something about this deal...');
    fireEvent.change(messageInput, { target: { value: 'Check this out!' } });

    expect(messageInput).toHaveValue('Check this out!');
  });
});
```

---

## 🎯 MCP Integration

### Context7 MCP Commands

```bash
# Find all components
warp mcp run context7 "list all components in src/components/friends/"

# Analyze component complexity
warp mcp run context7 "analyze component complexity for FriendsList"

# Find untested components
warp mcp run context7 "find untested components in src/components/"
```

---

## 📦 Deliverables

1. **Component Test Files:**
   - `src/components/__tests__/friends/FriendsList.test.tsx`
   - `src/components/__tests__/friends/FriendRequestCard.test.tsx`
   - `src/components/__tests__/friends/FriendProfileModal.test.tsx`
   - `src/components/__tests__/friends/PYMKCard.test.tsx`
   - `src/components/__tests__/friends/FriendLeaderboard.test.tsx`
   - `src/components/__tests__/sharing/FriendPickerModal.test.tsx`

2. **Test Utilities:**
   - `src/__tests__/utils/renderWithProviders.tsx`
   - `src/__tests__/utils/mockRouter.ts`

---

## 📈 Success Metrics

- **Code Coverage:** > 70% for all components
- **Test Count:** > 60 component tests
- **Accessibility:** Zero violations
- **All Tests Passing:** 100% pass rate

---

**Next Story:** [STORY 9.8.4: Integration Tests - Friend Request Flow](./STORY_9.8.4_Integration_Tests.md)
