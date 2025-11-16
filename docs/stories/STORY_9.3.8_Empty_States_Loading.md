# 📋 STORY 9.3.8: Empty States & Loading

**Epic:** [EPIC 9.3: Friends UI Components](../epics/EPIC_9.3_Friends_UI_Components.md)  
**Story Points:** 2  
**Priority:** Medium  
**Status:** 📋 Ready for Development

---

## 📝 **Story Description**

As a **user**, I want to **see helpful empty states and smooth loading indicators** so that I **understand what's happening and know what to do next**.

---

## 🎯 **Acceptance Criteria**

### **Empty States:**
1. ✅ No friends: "Find friends to get started" + "Find Friends" CTA button
2. ✅ No friend requests: "No new requests" + illustration
3. ✅ Search no results: "Try different keywords" + suggestions
4. ✅ No PYMK suggestions: "Check back later for suggestions"
5. ✅ Each empty state has relevant icon/illustration
6. ✅ Consistent styling across all empty states

### **Loading States:**
7. ✅ Skeleton loaders (no spinners) for all lists
8. ✅ Friend card skeleton: Avatar circle + 2 text lines
9. ✅ PYMK card skeleton: Avatar + name + button placeholder
10. ✅ Profile modal skeleton: Header + sections
11. ✅ Smooth shimmer animation effect
12. ✅ Loading states match actual content dimensions

---

## 🎨 **MCP Integration**

```bash
# Shadcn: Skeleton components
warp mcp run shadcn "create loading skeleton components for friend cards and lists"
```

---

## 📦 **Implementation**

```typescript
// EmptyState.tsx - Generic empty state component
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-24 h-24 mb-4 text-gray-300">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Specific empty states
export function NoFriendsEmptyState() {
  const navigate = useNavigate();
  
  return (
    <EmptyState
      icon={<Users className="w-full h-full" />}
      title="No Friends Yet"
      description="Start building your network by finding and adding friends"
      action={{
        label: "Find Friends",
        onClick: () => navigate('/friends/search')
      }}
    />
  );
}

export function NoRequestsEmptyState() {
  return (
    <EmptyState
      icon={<UserPlus className="w-full h-full" />}
      title="No New Requests"
      description="You're all caught up! New friend requests will appear here"
    />
  );
}

export function SearchNoResultsEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<SearchX className="w-full h-full" />}
      title="No Results Found"
      description={`We couldn't find anyone matching "${query}". Try different keywords or check spelling.`}
    />
  );
}

// FriendCardSkeleton.tsx
export function FriendCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      {/* Avatar skeleton */}
      <div className="w-12 h-12 bg-gray-200 rounded-full" />
      
      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
      
      {/* Actions skeleton */}
      <div className="flex gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded" />
        <div className="w-8 h-8 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

// FriendsListSkeleton.tsx
export function FriendsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <FriendCardSkeleton key={i} />
      ))}
    </div>
  );
}

// PYMKCardSkeleton.tsx
export function PYMKCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-4 w-64 animate-pulse">
      {/* Avatar */}
      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto" />
      
      {/* Name */}
      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mt-3" />
      
      {/* Reason */}
      <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto mt-2" />
      
      {/* Mutual friends avatars */}
      <div className="flex justify-center -space-x-2 mt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-6 h-6 bg-gray-200 rounded-full border-2 border-white" />
        ))}
      </div>
      
      {/* Button */}
      <div className="h-10 bg-gray-200 rounded-lg mt-3" />
    </div>
  );
}

// ProfileModalSkeleton.tsx
export function ProfileModalSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
      
      {/* Mutual friends */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-10 h-10 bg-gray-200 rounded-full" />
          ))}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-3">
        <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
        <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

// Enhanced shimmer animation (add to Tailwind config)
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
      },
    },
  },
};

// Apply shimmer to skeletons:
// className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer bg-[length:1000px_100%]"
```

---

## 🧪 **Testing**

### **Visual Tests:**
- [ ] Empty states render correctly for each scenario
- [ ] Skeleton dimensions match actual content
- [ ] Shimmer animation is smooth
- [ ] CTA buttons in empty states are clickable

### **Unit Tests:**
```typescript
describe('EmptyState', () => {
  it('renders with icon, title, and description', () => {});
  it('shows action button when provided', () => {});
  it('calls onClick when action button clicked', () => {});
});

describe('FriendCardSkeleton', () => {
  it('renders avatar, text lines, and action placeholders', () => {});
});
```

---

## 🚀 **Deployment Checklist**

- [ ] EmptyState generic component created
- [ ] All specific empty states implemented:
  - [ ] NoFriendsEmptyState
  - [ ] NoRequestsEmptyState
  - [ ] SearchNoResultsEmptyState
  - [ ] NoPYMKEmptyState
- [ ] All skeleton loaders created:
  - [ ] FriendCardSkeleton
  - [ ] FriendsListSkeleton
  - [ ] PYMKCardSkeleton
  - [ ] ProfileModalSkeleton
- [ ] Shimmer animation implemented
- [ ] Empty states have appropriate CTAs
- [ ] Visual consistency across all states
- [ ] Unit tests pass
- [ ] Storybook stories created
- [ ] Accessibility tested (ARIA labels)

---

**Epic Complete!** All 8 stories for Epic 9.3 are now defined.

**Next Epic:** [EPIC 9.4: Friends Service Layer](../epics/EPIC_9.4_Friends_Service_Layer.md)
