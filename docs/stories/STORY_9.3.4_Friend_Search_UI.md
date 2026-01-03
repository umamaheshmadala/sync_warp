# 📋 STORY 9.3.4: Friend Search UI

**Epic:** [EPIC 9.3: Friends UI Components](../epics/EPIC_9.3_Friends_UI_Components.md)  
**Story Owner:** Frontend Engineering  
**Story Points:** 3  
**Priority:** Medium  
**Status:** 📋 Ready for Development

---

## 📝 **Story Description**

As a **user**, I want to **search for friends with filters** so that I can **quickly find specific people in my network**.

---

## 🎯 **Acceptance Criteria**

1. ✅ Search bar with 300ms debounce
2. ✅ Filter chips: Location, Mutual Friends, Online Status
3. ✅ Search results with infinite scroll
4. ✅ Empty state: "No results found" with suggestions
5. ✅ Recent searches (last 10, stored locally)
6. ✅ Clear search button (X icon)
7. ✅ Search highlights matching terms in results
8. ✅ Mobile: Full-screen search overlay
9. ✅ Desktop: Inline search with dropdown results

---

## 🎨 **MCP Integration**

### **Shadcn MCP:**
```bash
warp mcp run shadcn "create search bar with filter chips and results dropdown"
```

### **Chrome DevTools:** Test search performance and responsiveness
### **Puppeteer MCP:** E2E test search flow with filters

---

## 📦 **Implementation**

```typescript
export function FriendSearchBar() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const { results, isSearching } = useOptimizedSearch(query, filters);

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search friends..."
        className="w-full pl-10 pr-4 py-2 border rounded-lg"
      />
      
      {/* Filter Chips */}
      <FilterChips filters={filters} onChange={setFilters} />
      
      {/* Results Dropdown */}
      {query && (
        <SearchResults results={results} isLoading={isSearching} />
      )}
    </div>
  );
}
```

---

## 🧪 **Testing**

### **E2E:**
```javascript
test('Search with filters', async () => {
  await page.type('[data-testid="search-input"]', 'John');
  await page.waitForTimeout(300); // Debounce
  await page.click('[data-testid="filter-location"]');
  await page.click('[data-testid="location-option-nyc"]');
  
  const results = await page.$$('[data-testid="search-result"]');
  expect(results.length).toBeGreaterThan(0);
});
```

---

**Next Story:** [STORY 9.3.5: People You May Know Cards](./STORY_9.3.5_PYMK_Cards.md)
