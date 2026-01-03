# 📋 STORY 9.3.5: People You May Know Cards

**Epic:** [EPIC 9.3: Friends UI Components](../epics/EPIC_9.3_Friends_UI_Components.md)  
**Story Points:** 3  
**Priority:** Medium  
**Status:** 📋 Ready for Development

---

## 📝 **Story Description**

As a **user**, I want to **see suggested friends based on mutual connections** so that I can **expand my network**.

---

## 🎯 **Acceptance Criteria**

1. ✅ Card shows: Avatar, name, reason ("5 mutual friends", "Works at Company X")
2. ✅ "Add Friend" button sends request
3. ✅ "Dismiss" button (X) hides suggestion permanently
4. ✅ Horizontal scrollable carousel on mobile
5. ✅ Grid layout on desktop (3-4 columns)
6. ✅ Mutual friends avatars preview (3 faces)
7. ✅ Loading skeleton for suggestions
8. ✅ Empty state: "No suggestions right now"
9. ✅ Refresh suggestions button
10. ✅ Analytics: Track dismissals, add friend clicks

---

## 🎨 **MCP Integration**

```bash
# Shadcn: Scaffold PYMK card component
warp mcp run shadcn "create people you may know card with avatar, reason, and action buttons"

# Puppeteer: Test PYMK interactions
warp mcp run puppeteer "test PYMK: add friend, dismiss suggestion, verify updates"
```

---

## 📦 **Implementation**

```typescript
export function PeopleYouMayKnowCarousel() {
  const { suggestions, isLoading } = usePYMKSuggestions();
  const { addFriend, dismiss } = usePYMKActions();

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">People You May Know</h2>
        <button className="text-sm text-blue-600">See All</button>
      </div>

      {/* Mobile: Horizontal Scroll */}
      <div className="md:hidden flex gap-3 overflow-x-auto pb-3">
        {suggestions.map(person => (
          <PYMKCard
            key={person.id}
            person={person}
            onAddFriend={() => addFriend(person.id)}
            onDismiss={() => dismiss(person.id)}
          />
        ))}
      </div>

      {/* Desktop: Grid */}
      <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 gap-4">
        {suggestions.map(person => (
          <PYMKCard
            key={person.id}
            person={person}
            onAddFriend={() => addFriend(person.id)}
            onDismiss={() => dismiss(person.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function PYMKCard({ person, onAddFriend, onDismiss }: PYMKCardProps) {
  return (
    <div className="relative bg-white rounded-lg border p-4 w-64 md:w-auto">
      {/* Dismiss X */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Avatar */}
      <Avatar src={person.avatar_url} className="w-16 h-16 mx-auto" />
      
      {/* Name */}
      <h3 className="text-center font-semibold mt-2">{person.full_name}</h3>
      
      {/* Reason */}
      <p className="text-sm text-gray-600 text-center">
        {person.mutual_friends_count} mutual friends
      </p>
      
      {/* Mutual Friends Avatars */}
      <div className="flex justify-center -space-x-2 mt-2">
        {person.mutual_friends.slice(0, 3).map(friend => (
          <Avatar key={friend.id} src={friend.avatar_url} className="w-6 h-6 border-2 border-white" />
        ))}
      </div>
      
      {/* Add Friend Button */}
      <button
        onClick={onAddFriend}
        className="w-full mt-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Add Friend
      </button>
    </div>
  );
}
```

---

## 🧪 **Testing**

```javascript
test('PYMK carousel interactions', async () => {
  await page.goto('http://localhost:5173/friends');
  
  // Add friend
  await page.click('[data-testid="pymk-add-friend"]:first-child');
  await page.waitForSelector('.toast-success');
  
  // Dismiss suggestion
  await page.click('[data-testid="pymk-dismiss"]:first-child');
  
  // Verify card removed
  const cards = await page.$$('[data-testid="pymk-card"]');
  expect(cards.length).toBeLessThan(initialCount);
});
```

---

**Next Story:** [STORY 9.3.6: Contact Sync Permission Flow](./STORY_9.3.6_Contact_Sync.md)
