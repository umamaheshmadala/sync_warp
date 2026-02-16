# 📖 STORY 8.12.5: Media Placeholders & Zero Layout Shift

**Status:** 📋 Planned  
**Epic:** [EPIC 8.12: Chat Scroll UX](../epics/EPIC_8.12_Chat_Scroll_UX.md)  
**Priority:** 🟡 Medium (Polish — eliminates jarring visual shifts from media loading)  
**Depends On:** Epic 8.3 ✅ (Media & Rich Content)

---

## 🙋‍♂️ **User Story**

**As a** SynC user scrolling through a conversation containing images and videos,  
**I want** media to load without causing the messages I'm reading to shift or jump,  
**So that** I can read conversations with media-heavy content as smoothly as text-only ones.

---

## ⚠️ **Pre-Implementation Audit (MANDATORY)**

> [!IMPORTANT]
> Epic 8.3 (Media & Rich Content) is already complete. Media upload, compression, and display components already exist. This story is about adding **placeholder skeletons** to the existing media rendering pipeline, not rebuilding media handling.

### **Files to Audit:**

| File | What to Check |
| :--- | :--- |
| `src/components/messaging/MessageBubble.tsx` | Check how media (images, videos) is currently rendered inside message bubbles. Look for `<img>` tags, whether `width` and `height` attributes are set, and if there's any loading state. |
| `src/components/messaging/MediaDisplay.tsx` | If this component exists (from Story 8.3.5), check if it already handles aspect ratio preservation or placeholder rendering. |
| `src/services/messagingService.ts` | Check if `thumbnail_url` and media dimensions (width/height) are stored in the message data. If the database already tracks aspect ratios, we can use them for placeholders. |
| `src/types/messaging.ts` | Check the `Message` type definition — look for `media_urls`, `thumbnail_url`, `media_width`, `media_height`, or similar fields that would provide dimension data. |
| `src/services/imageCompressionService.ts` | Check if image upload already captures and stores dimensions/aspect ratio metadata. If so, this data is available for placeholders. |
| `src/services/mediaUploadService.ts` | **Confirmed to exist.** Check if media upload flow stores `width`/`height` metadata alongside the uploaded file URL. |
| `src/services/offlineMediaService.ts` | **Confirmed to exist.** Check if offline media queuing preserves dimension metadata for deferred uploads. |
| `src/types/media.ts` | **Confirmed to exist.** Check the `Media` type definition for `width`, `height`, `aspectRatio`, `thumbnail_url`, or similar fields. |

### **Reuse Recommendations:**
- **DO** reuse existing media display components from Epic 8.3 — only add placeholder wrappers around them.
- **DO** reuse `thumbnail_url` if the database already stores low-resolution previews (blurhash-like).
- **DO** reuse aspect ratio data if it's already captured during upload (Story 8.3.1).
- **DO NOT** re-fetch media metadata — use what's already in the message payload.
- **DO NOT** modify the upload pipeline — this story is purely about the **display/rendering** side.

---

## 🎯 **Acceptance Criteria**

### **1. Fixed-Dimension Placeholder**
- **GIVEN** a message contains an image or video
- **WHEN** the media is still loading (network fetch in progress)
- **THEN** a placeholder element MUST render with the **exact same dimensions** the final media will occupy
- **AND** the placeholder MUST use either:
  - A blurhash/solid color derived from `thumbnail_url`, OR
  - A neutral skeleton gradient (shimmer animation)

### **2. Zero Cumulative Layout Shift (CLS)**
- **GIVEN** the placeholder is rendered
- **WHEN** the actual media finishes loading and replaces the placeholder
- **THEN** the surrounding messages MUST NOT shift position by even 1 pixel
- **AND** this MUST be verified using Chrome Lighthouse CLS metric (target: 0).

### **3. Aspect Ratio Preservation**
- **GIVEN** a media item with known dimensions (e.g., 1920x1080)
- **WHEN** rendered in the message bubble
- **THEN** the placeholder MUST maintain the correct aspect ratio (16:9 in this example)
- **AND** the width MUST be constrained to the message bubble's max-width (e.g., 280px)
- **AND** the height MUST be calculated proportionally.

### **4. Fallback for Unknown Dimensions**
- **GIVEN** a media item where dimensions are NOT available (legacy messages, external links)
- **WHEN** rendered
- **THEN** a default placeholder size MUST be used (e.g., 280px × 200px, roughly 4:3)
- **AND** when the actual media loads, any size difference MUST be handled gracefully (fade transition).

### **5. Thumbnail Progressive Loading**
- **GIVEN** a message has a `thumbnail_url` (low-res preview)
- **WHEN** the full-resolution media is still loading
- **THEN** the thumbnail MUST display immediately as a blurred background
- **AND** the full-resolution image MUST "sharpen" into view (blur → clear transition, ~300ms).

---

## 🛠️ **Technical Implementation Plan**

### **1. Component: `MediaPlaceholder`**

Create or modify `src/components/messaging/MediaPlaceholder.tsx`:

```typescript
interface MediaPlaceholderProps {
  width: number;
  height: number;
  thumbnailUrl?: string;
  isLoading: boolean;
  children: React.ReactNode; // The actual <img> or <video>
}

export function MediaPlaceholder({ 
  width, height, thumbnailUrl, isLoading, children 
}: MediaPlaceholderProps) {
  const maxWidth = 280;
  const aspectRatio = width / height;
  const displayWidth = Math.min(width, maxWidth);
  const displayHeight = displayWidth / aspectRatio;

  return (
    <div 
      className="media-placeholder relative overflow-hidden rounded-lg"
      style={{ width: displayWidth, height: displayHeight }}
    >
      {/* Thumbnail background (blurred) */}
      {thumbnailUrl && isLoading && (
        <img 
          src={thumbnailUrl} 
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
          alt=""
        />
      )}
      
      {/* Skeleton shimmer when no thumbnail */}
      {!thumbnailUrl && isLoading && (
        <div className="absolute inset-0 skeleton-shimmer" />
      )}
      
      {/* Actual media */}
      {children}
    </div>
  );
}
```

### **2. CSS for Skeleton Shimmer**

Add to `src/index.css` or a component-level CSS:

```css
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### **3. Integration in `MessageBubble.tsx`**

Wrap existing media rendering with `MediaPlaceholder`:

```typescript
{message.type === 'image' && (
  <MediaPlaceholder
    width={message.media_width || 280}
    height={message.media_height || 200}
    thumbnailUrl={message.thumbnail_url}
    isLoading={!imageLoaded}
  >
    <img
      src={message.media_urls[0]}
      onLoad={() => setImageLoaded(true)}
      className={`transition-all duration-300 ${imageLoaded ? 'opacity-100 blur-0' : 'opacity-0'}`}
      alt="Shared image"
    />
  </MediaPlaceholder>
)}
```

### **4. Database Check**

If `media_width` and `media_height` are not in the `messages` table schema, a migration will be needed:

```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_width INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_height INTEGER;
```

And the upload flow in `messagingService.sendMessage()` must be updated to include dimensions.

---

## 🧪 **Verification**

```bash
# Manual: Send an image in a conversation → verify placeholder appears with correct aspect ratio
# Manual: On slow network (Chrome throttle to Slow 3G) → verify placeholder shows before image loads
# Manual: Scroll past a loading image → verify no content shift when the image finally renders
# Lighthouse: Run audit on chat page → CLS must be 0
# Manual: Test with legacy messages (no dimensions) → verify fallback placeholder renders
```

---

## 🛑 **Risks & Mitigation**

| Risk | Mitigation |
| :--- | :--- |
| Legacy messages don't have width/height data | Use a sensible default (280x200) and handle CLS on those gracefully |
| Blurhash library adds bundle size | Use simple thumbnail blur (`blur-lg` CSS) instead of a dedicated blurhash decoder |
| Video dimensions harder to extract pre-upload | Use `HTMLVideoElement.videoWidth/videoHeight` during upload to capture dimensions |
