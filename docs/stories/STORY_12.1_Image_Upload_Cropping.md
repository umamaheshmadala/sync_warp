# Story 12.1: Product Image Upload & Cropping

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ✅ Done  
**Priority**: P0  
**Estimate**: 8 points  

---

## User Story

**As a** business owner  
**I want to** upload and crop product images to a 4:5 portrait aspect ratio  
**So that** all products have a consistent, professional appearance like Instagram  

---

## Scope

### In Scope
- Image selection (up to 5 images)
- Cropping tool with 4:5 aspect ratio lock
- Zoom (pinch to zoom)
- 90° rotation
- Rule of thirds grid overlay
- Image reordering (drag and drop)
- Client-side compression (~1MB target)
- Upload progress indicator
- Error handling with retry
- Letterboxing for landscape images (dark gray #1a1a1a)
- Mobile: Native image picker via Capacitor
- Web: File input with drag-and-drop zone

### Out of Scope
- Free-form aspect ratios
- Image filters/effects
- AI-powered cropping suggestions

---

## Technical Specifications

### Image Requirements
| Spec | Value |
|------|-------|
| Aspect Ratio | 4:5 (portrait) |
| Resolution | 1080×1350px recommended |
| Max File Size | 10 MB per image |
| Formats | JPEG, PNG, HEIC, WebP |
| Max Count | 5 images per product |
| Min Count | 1 image required |

### Compression Settings
```typescript
const compressionOptions = {
  maxWidthOrHeight: 1080,
  maxSizeMB: 1,
  useWebWorker: true,
  fileType: 'image/jpeg',
  quality: 0.85
};
```

### Cropping Tool Features
| Feature | Implementation |
|---------|----------------|
| Zoom | Touch: pinch; Mouse: scroll wheel |
| Rotation | 90° clockwise button |
| Grid | 3x3 rule-of-thirds overlay (toggleable) |
| Aspect Lock | Always 4:5, cannot be changed |
| Preview | Real-time crop preview |

---

## UI/UX Specifications

### Web Cropping Modal
```
┌─────────────────────────────────────────────┐
│  Crop Image                           [X]   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │     ┌───────────────────────┐       │   │
│  │     │                       │       │   │
│  │     │    CROP AREA          │       │   │
│  │     │    (4:5 overlay)      │       │   │
│  │     │                       │       │   │
│  │     │    ┼───────┼───────┼  │       │   │
│  │     │    │       │       │  │       │   │
│  │     │    ┼───────┼───────┼  │       │   │
│  │     │    │       │       │  │       │   │
│  │     │    ┼───────┼───────┼  │       │   │
│  │     │                       │       │   │
│  │     └───────────────────────┘       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [🔄 Rotate]  [📐 Grid: ON]   [─ Zoom +]   │
│                                             │
│        [Cancel]          [Apply]            │
└─────────────────────────────────────────────┘
```

### Image Selection Panel
```
┌──────────────────────────────────────────────┐
│  Product Images (3/5)                        │
├──────────────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐│
│  │  1  │  │  2  │  │  3  │  │ + │  │     ││
│  │ 📷  │  │ 📷  │  │ 📷  │  │ Add │  │     ││
│  │ [✏️][🗑️]│  │ [✏️][🗑️]│  │ [✏️][🗑️]│  └─────┘  └─────┘│
│  └─────┘  └─────┘  └─────┘                   │
│  ↔️ Drag to reorder                          │
└──────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### Image Selection
- [ ] User can select up to 5 images from device
- [ ] User cannot proceed with 0 images
- [ ] Show clear error if max exceeded: "Maximum 5 images allowed"
- [ ] Support JPEG, PNG, HEIC, WebP formats
- [ ] Show error for unsupported formats
- [ ] Show error if file exceeds 10MB: "Image too large. Max 10MB"

### Cropping Tool
- [ ] Cropping area is locked to 4:5 aspect ratio
- [ ] User can pinch/scroll to zoom in/out
- [ ] User can drag image to reposition within crop area
- [ ] 90° rotation button rotates clockwise
- [ ] Grid overlay can be toggled on/off (default: on)
- [ ] Real-time preview of crop result
- [ ] "Apply" saves crop; "Cancel" discards changes

### Image Reordering
- [ ] Images can be reordered via drag-and-drop
- [ ] First image is the primary/cover image
- [ ] Visual indicator shows drag handle
- [ ] Order persists after save

### Compression & Upload
- [ ] Images compressed to ~1MB before upload
- [ ] Upload progress shown (percentage or bar)
- [ ] If upload fails, show error with "Retry" button
- [ ] Successful upload shows checkmark

### Letterboxing Fallback
- [ ] If image is landscape and user doesn't crop:
  - Fit image within 4:5 frame
  - Add dark gray (#1a1a1a) padding top/bottom
- [ ] User can still crop to avoid letterboxing

### Mobile Native (Capacitor)
- [ ] Use native image picker (not web file input)
- [ ] Cropping uses native or high-quality web component
- [ ] HEIC format from iPhone handled correctly

### Accessibility
- [ ] Alt text field available for each image
- [ ] Default alt text = product name
- [ ] Keyboard accessible (tab, arrow keys)

---

## API Endpoints

### Upload Image
```
POST /storage/v1/object/product-images/{business_id}/{product_id}/{image_id}
Headers: Authorization: Bearer {token}
Body: FormData with file

Response: { url: string }
```

### Update Product Images
```
PATCH /rest/v1/products?id=eq.{product_id}
Body: {
  images: [
    { url: "...", order: 0, alt_text: "Product front view" },
    { url: "...", order: 1, alt_text: "Product side view" }
  ]
}
```

---

## Storage Structure

```
product-images/
└── {business_id}/
    └── {product_id}/
        ├── original/
        │   └── {uuid}.{ext}
        └── processed/
            ├── {uuid}_thumb.jpg   (150x188)
            ├── {uuid}_medium.jpg  (540x675)
            └── {uuid}_full.jpg    (1080x1350)
```

---

## Dependencies

- [ ] Image compression library (browser-image-compression)
- [ ] Cropping library (react-image-crop or react-easy-crop)
- [ ] Capacitor Camera plugin (mobile)
- [ ] Supabase Storage bucket: `product-images`

---

## Testing Checklist

- [ ] Upload single image
- [ ] Upload 5 images (max)
- [ ] Try to upload 6 images (should error)
- [ ] Crop image with zoom and rotation
- [ ] Toggle grid overlay
- [ ] Reorder images via drag-and-drop
- [ ] Upload large file (>10MB, should error)
- [ ] Upload HEIC from iPhone
- [ ] Test on slow network (progress indicator)
- [ ] Test upload failure and retry
- [ ] Landscape image letterboxing
- [ ] Accessibility with keyboard only
