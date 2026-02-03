# Story 12.4: Mobile Two-Step Creation Flow

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: 📋 Ready for Development  
**Priority**: P0  
**Estimate**: 8 points  

---

## User Story

**As a** business owner on mobile  
**I want to** create products in a two-step flow (images first, then details)  
**So that** the experience matches Instagram and feels intuitive  

---

## Scope

### In Scope
- Step 1: Image selection, cropping, reordering
- Step 2: Product name, description, tags
- Native image picker (Capacitor)
- Auto-save draft between steps
- Back navigation preserves data
- Publish or Save as Draft

### Out of Scope
- Web creation flow (single form)
- Resume interrupted uploads (Phase 2)

---

## UI/UX Specifications

### Step 1: Image Selection

```
┌─────────────────────────────────┐
│  ✕ Cancel           Next →     │
├─────────────────────────────────┤
│                                 │
│  New Product                    │
│  Select up to 5 images          │
│                                 │
├─────────────────────────────────┤
│                                 │
│  ┌─────┐  ┌─────┐  ┌─────┐     │
│  │  1  │  │  2  │  │  3  │     │
│  │ 📷  │  │ 📷  │  │ 📷  │     │
│  │[✏️][🗑️]│  │[✏️][🗑️]│  │[✏️][🗑️]│     │
│  └─────┘  └─────┘  └─────┘     │
│                                 │
│  ┌─────┐  ┌─────┐              │
│  │  +  │  │     │              │
│  │ Add │  │     │              │
│  └─────┘  └─────┘              │
│                                 │
│  ↔️ Hold and drag to reorder    │
│                                 │
├─────────────────────────────────┤
│  3/5 images selected            │
└─────────────────────────────────┘
```

### Cropping Modal (Native Feel)

```
┌─────────────────────────────────┐
│  Cancel         Crop    Done   │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │    ┌───────────────┐    │   │
│  │    │               │    │   │
│  │    │  CROP AREA    │    │   │
│  │    │   (4:5)       │    │   │
│  │    │               │    │   │
│  │    │  ┼─────┼─────┼│    │   │
│  │    │  │     │     ││    │   │
│  │    │  ┼─────┼─────┼│    │   │
│  │    │               │    │   │
│  │    └───────────────┘    │   │
│  └─────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│    [🔄 Rotate]    [📐 Grid]    │
└─────────────────────────────────┘
```

### Step 2: Product Details

```
┌─────────────────────────────────┐
│  ← Back                Publish  │
├─────────────────────────────────┤
│                                 │
│  ┌───┐ ┌───┐ ┌───┐             │
│  │ 1 │ │ 2 │ │ 3 │  Preview    │
│  └───┘ └───┘ └───┘             │
│                                 │
├─────────────────────────────────┤
│                                 │
│  Product Name *                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  └───────────────────────────┘  │
│                           0/100 │
│                                 │
│  Description                    │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │                           │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                           0/300 │
│                                 │
├─────────────────────────────────┤
│                                 │
│  Status Tags (up to 3)          │
│                                 │
│  ╭──────────╮ ╭──────────╮     │
│  │🟢Available│ │⭐Featured│     │
│  ╰──────────╯ ╰──────────╯     │
│  ╭──────────╮ ╭──────────╮     │
│  │ 🔥 Hot   │ │🆕New Arr.│     │
│  ╰──────────╯ ╰──────────╯     │
│  ... (more tags)                │
│                                 │
├─────────────────────────────────┤
│  🔔 Enable notifications  [ON]  │
├─────────────────────────────────┤
│                                 │
│     [Save as Draft]             │
│                                 │
└─────────────────────────────────┘
```

---

## Technical Specifications

### Native Image Picker

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const pickImages = async () => {
  // For single image
  const photo = await Camera.getPhoto({
    source: CameraSource.Photos,
    resultType: CameraResultType.Uri,
    quality: 90
  });
  
  // For multiple images - use different approach
  // Capacitor doesn't support multi-select natively
  // Use @capawesome/capacitor-photo-picker plugin
};
```

### Multi-Image Picker

```typescript
import { PhotoPicker } from '@capawesome/capacitor-photo-picker';

const pickMultipleImages = async () => {
  const result = await PhotoPicker.pickImages({
    limit: 5 - currentImages.length, // Remaining slots
  });
  return result.images; // Array of image URIs
};
```

### Draft Auto-Save

```typescript
const DRAFT_KEY = 'product_draft';

interface ProductDraft {
  images: { uri: string; cropped: boolean; order: number }[];
  name: string;
  description: string;
  tags: string[];
  notifications_enabled: boolean;
  updated_at: string;
}

// Save draft on any change
const saveDraft = async (draft: ProductDraft) => {
  await Preferences.set({
    key: DRAFT_KEY,
    value: JSON.stringify(draft)
  });
};

// Load draft on screen open
const loadDraft = async (): Promise<ProductDraft | null> => {
  const { value } = await Preferences.get({ key: DRAFT_KEY });
  return value ? JSON.parse(value) : null;
};

// Clear draft after publish
const clearDraft = async () => {
  await Preferences.remove({ key: DRAFT_KEY });
};
```

---

## Acceptance Criteria

### Step 1: Image Selection
- [ ] "Add" button opens native image picker
- [ ] Can select multiple images (up to 5 total)
- [ ] Selected images show thumbnails
- [ ] ✏️ button opens cropping modal
- [ ] 🗑️ button removes image (with confirmation)
- [ ] Long-press + drag reorders images
- [ ] First image is marked as "Cover"
- [ ] "Next" disabled if 0 images
- [ ] Counter shows "X/5 images selected"

### Cropping Modal
- [ ] Locked to 4:5 aspect ratio
- [ ] Pinch to zoom works
- [ ] Drag to reposition
- [ ] Rotate button rotates 90°
- [ ] Grid toggle shows/hides overlay
- [ ] "Done" applies crop
- [ ] "Cancel" discards changes

### Step 2: Product Details
- [ ] Image thumbnails preview at top
- [ ] Back button returns to Step 1 (preserves data)
- [ ] Product name required (max 100 chars)
- [ ] Description optional (max 300 chars)
- [ ] Character counters shown
- [ ] Tag pills selectable (max 3)
- [ ] Notification toggle defaults to ON
- [ ] "Publish" creates product with status='published'
- [ ] "Save as Draft" creates with status='draft'

### Auto-Save Draft
- [ ] Draft saved on every change
- [ ] Leaving app and returning restores draft
- [ ] Back from Step 2 to Step 1 preserves Step 1 data
- [ ] After publish, draft is cleared
- [ ] Prompt on cancel if draft exists: "Discard changes?"

### Validation
- [ ] Name required error shown inline
- [ ] At least 1 image required
- [ ] Max 5 images enforced
- [ ] Max 3 tags enforced

### Navigation
- [ ] "Cancel" on Step 1 → confirmation if images selected
- [ ] Back on Step 2 → return to Step 1
- [ ] Publish → success toast → navigate to product

---

## Component Structure

```
src/components/products/creation/
├── MobileProductCreation.tsx       # Two-step container
├── ImageSelectionStep.tsx          # Step 1 main component
├── ImageThumbnail.tsx              # Single image with actions
├── ImageCropModal.tsx              # Cropping interface
├── ProductDetailsStep.tsx          # Step 2 main component
├── ProductNameInput.tsx            # Name with counter
├── ProductDescriptionInput.tsx     # Description with counter
├── ProductTagSelector.tsx          # Pill buttons
├── DraftPromptModal.tsx            # "Discard changes?" dialog
└── hooks/
    ├── useProductCreation.ts       # State management
    ├── useImagePicker.ts           # Native picker logic
    └── useProductDraft.ts          # Draft persistence
```

---

## Testing Checklist

- [ ] Open creation flow
- [ ] Select 1-5 images
- [ ] Try to select 6th image (blocked)
- [ ] Crop an image
- [ ] Rotate during crop
- [ ] Reorder images via drag
- [ ] Delete an image
- [ ] Navigate to Step 2
- [ ] Fill in product name
- [ ] Fill in description
- [ ] Select tags
- [ ] Navigate back to Step 1 (data preserved)
- [ ] Background app and return (draft restored)
- [ ] Publish product
- [ ] Save as draft
- [ ] Cancel with confirmation
- [ ] Validation errors display correctly

---

## Dependencies

- [ ] Story 12.1 (Image Upload) for compression/upload
- [ ] Story 12.9 (Tags) for tag selector
- [ ] @capacitor/camera plugin
- [ ] @capawesome/capacitor-photo-picker plugin
- [ ] @capacitor/preferences for draft storage
- [ ] React Native Reanimated (for drag-to-reorder)
