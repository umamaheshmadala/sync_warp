# STORY 15.6 — Apply List Virtualization to Top 4 Lists; Wire Up or Replace `VirtualProductGrid`

**EPIC:** [EPIC 15 — Rendering Performance & State Management](../epics/EPIC_15_Rendering_Performance_State_Management.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 3 points  
**Dependencies:** None (independent)  
**Audit Finding:** 1.3 — `react-window` installed but unused; dead `VirtualProductGrid.tsx`

---

## 🎯 User Story

> As a user with many conversations, products, or friends, I want lists to scroll smoothly even with 500+ items so that the app feels responsive regardless of data size.

---

## 📍 Problem

`react-window` and `react-virtualized-auto-sizer` are installed in `package.json` but no list in the app actually uses them. A `VirtualProductGrid.tsx` component exists and is fully implemented (76 lines) but is **never imported or rendered anywhere** — it is dead code.

Without virtualization, rendering 500+ items means 500+ DOM nodes, each with complex sub-trees (avatars, badges, timestamps). This causes:
- Slow initial render (blocking main thread for 200ms+)
- Janky scrolling on mobile
- Excessive memory usage

---

## 🔍 Codebase Research

### `VirtualProductGrid.tsx` (76 lines — Dead Code, Fully Implemented)
- **Location:** `src/components/products/VirtualProductGrid.tsx`
- **Imports:** `react-window` via `FixedSizeGrid`
- **Features:** Responsive column calculation, gap handling, viewport-aware sizing
- **Props:** `products: Product[]`, `renderCard`, `columnCount`, `cardHeight`, `cardWidth`, `gap`
- **NOT imported anywhere** — grep confirms zero imports
- **Status:** Fully functional component, just needs to be wired up

### Dependencies Already Installed ✅
```json
// package.json
"react-window": "^1.8.10",
"react-virtualized-auto-sizer": "^1.0.20",
```

### Top 4 Lists to Virtualize (by data volume)

| # | List | Component | Items | Current Pattern | Virtualize With |
|---|------|-----------|-------|----------------|----------------|
| 1 | Conversation list | `ConversationListPage.tsx` or sidebar | 50-200+ | `.map()` → DOM nodes | `FixedSizeList` |
| 2 | Message list | `MessageList.tsx` | 50-500+ | `.map()` → DOM nodes | `VariableSizeList` (messages vary in height) |
| 3 | Product grid | Product listing pages | 20-100+ | `.map()` → grid | `VirtualProductGrid` (already implemented!) |
| 4 | Friends/contacts list | `FriendRequests.tsx`, `ContactsSidebar` | 10-100+ | `.map()` → DOM nodes | `FixedSizeList` |

### Why `VariableSizeList` for Messages
Messages have variable heights (text-only vs. image vs. video vs. link preview). `FixedSizeList` would force all messages to a fixed height, causing visual issues. `VariableSizeList` supports per-item height, but requires a height estimation function.

---

## ✅ Implementation Plan

### Phase 1: Wire up `VirtualProductGrid` (Quick Win)

The component already exists! Just import and use it wherever products are displayed in a grid:

1. Find the product grid renderer:
```bash
grep -rn "products.map\|products?.map" src/ --include="*.tsx"
```
2. Identify the main product grid component (likely `BusinessProductsTab.tsx` or a product listing page)
3. Replace the `.map()` with `<VirtualProductGrid>`:
```diff
-{products.map((product, i) => (
-  <ProductCard key={product.id} product={product} />
-))}
+<VirtualProductGrid
+  products={products}
+  renderCard={(product, index) => <ProductCard key={product.id} product={product} />}
+  columnCount={3}
+/>
```

### Phase 2: Virtualize Conversation List

Create a virtualized conversation list using `FixedSizeList`:

```typescript
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// In conversation list component:
<AutoSizer>
  {({ height, width }) => (
    <List
      height={height}
      itemCount={conversations.length}
      itemSize={72} // Standard conversation card height
      width={width}
      overscanCount={10}
    >
      {({ index, style }) => (
        <div style={style}>
          <ConversationCard conversation={conversations[index]} />
        </div>
      )}
    </List>
  )}
</AutoSizer>
```

### Phase 3: Virtualize Message List (Most Complex)

Messages have variable heights. Use `VariableSizeList`:

```typescript
import { VariableSizeList as List } from 'react-window';

// Estimate row height based on message type:
const getItemSize = (index: number) => {
  const msg = messages[index];
  if (msg.type === 'image') return 300;
  if (msg.type === 'video') return 320;
  if (msg.media_urls?.length > 0) return 280;
  // Text: estimate based on content length
  const lineCount = Math.ceil(msg.content.length / 40);
  return 48 + lineCount * 20; // base + lines
};
```

> **Note:** Message list virtualization is the most complex due to variable heights, sticky date separators, and scroll-to-bottom behavior. Consider using `react-virtuoso` as an alternative that handles these cases better.

### Phase 4: Virtualize Friends/Contacts List

Similar to conversation list, use `FixedSizeList` with a fixed item height (typically 64-72px for contact cards).

---

## ⚠️ Considerations

- **Scroll position restoration:** Virtualized lists reset scroll on re-render. Ensure scroll restoration on back navigation.
- **Dynamic content:** If items change height (e.g., expanding a message), the list must be notified via `resetAfterIndex`.
- **Search/filter:** Filtering changes the list — `itemCount` must update and the list should scroll to top.
- **"Scroll to bottom" in messages:** Must use `scrollToItem(messages.length - 1)` instead of DOM scroll methods.

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| Product grid with 100 items | Smooth scroll, only ~10 DOM nodes |
| Conversation list with 200 items | Smooth scroll |
| Message list scroll | Smooth 60fps |
| Chrome DevTools → Elements panel | Only visible items in DOM (not all 500) |
| `npm run build` | Build succeeds |
| Dead `VirtualProductGrid` grep | Now imported and used (or deleted if replaced) |

---

## ✅ Acceptance Criteria

- [ ] `VirtualProductGrid.tsx` wired up in product listing (or replaced with equivalent)
- [ ] Conversation list virtualized with `react-window`
- [ ] Message list virtualized (or identified as separate story if too complex)
- [ ] Friends/contacts list virtualized
- [ ] DOM node count reduced to visible items only
- [ ] Build passes

---

## ✅ Definition of Done

- [ ] Top 4 lists virtualized
- [ ] Dead code resolved
- [ ] Smooth scrolling confirmed on mobile
- [ ] Build passes
