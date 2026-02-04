# Story 12.10: Description & Read More

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ✅ Done Pending  
**Priority**: P1  
**Estimate**: 2 points  

---

## User Story

**As a** user  
**I want to** read full product descriptions with clickable links  
**So that** I can learn about the product and visit related URLs  

---

## Scope

### In Scope
- Description field (300 char max)
- Truncation at 100 chars with "Read more"
- Expand/collapse toggle
- Auto-linking URLs in description
- URL click tracking (optional)

### Out of Scope
- Rich text formatting (bold, italic)
- @mentions and #hashtags (Phase 2)
- Markdown support

---

## Technical Specifications

### Character Limits

| Field | Max Length | Validation |
|-------|------------|------------|
| Description | 300 chars | Client + server |
| Truncation | 100 chars | Display only |

### URL Auto-linking

```typescript
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const linkifyDescription = (text: string): JSX.Element[] => {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {truncateUrl(part)}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

// Display friendly URL
const truncateUrl = (url: string): string => {
  try {
    const { hostname, pathname } = new URL(url);
    const path = pathname.length > 15 ? pathname.slice(0, 15) + '...' : pathname;
    return hostname + path;
  } catch {
    return url.slice(0, 30) + '...';
  }
};
```

---

## UI/UX Specifications

### Collapsed State (< 100 chars shown)

```
Description text here that can span multiple 
lines but we only show the first 100...  [Read more]
```

### Expanded State

```
Description text here that can span multiple 
lines but we only show the first 100 characters 
initially. Here is the rest of the description 
that was hidden. Visit https://example.com for 
more info.
[Show less]
```

### URL Display

- URLs become clickable blue links
- Long URLs truncated: `example.com/path...`
- Opens in new tab
- Shows external link indicator on hover

---

## Acceptance Criteria

### Display
- [ ] Description shown below product name
- [ ] If >100 chars, truncated with "..."
- [ ] "Read more" link shown when truncated
- [ ] Clicking "Read more" shows full text
- [ ] "Show less" collapses back
- [ ] If ≤100 chars, no truncation, no toggle

### URL Auto-linking
- [ ] URLs (http/https) become clickable
- [ ] Links styled in blue
- [ ] Links open in new tab
- [ ] Long URLs display truncated
- [ ] Invalid URLs shown as plain text

### Input (Creation/Edit)
- [ ] Character counter shows X/300
- [ ] Counter turns red at 280+
- [ ] Cannot exceed 300 characters
- [ ] Paste truncates at 300

---

## Component Structure

```
src/components/products/
├── ProductDescription.tsx      # Display with read more
├── ProductDescriptionInput.tsx # Textarea with counter
└── utils/
    └── linkifyText.ts          # URL detection and linking
```

---

## Testing Checklist

- [ ] Short description (no truncation)
- [ ] Long description (truncated)
- [ ] Read more expands text
- [ ] Show less collapses text
- [ ] URL in description is clickable
- [ ] URL opens new tab
- [ ] Character counter accurate
- [ ] Cannot exceed 300 chars
- [ ] Paste long text handles limit

---

## Dependencies

- [ ] Products table `description` column (existing)
