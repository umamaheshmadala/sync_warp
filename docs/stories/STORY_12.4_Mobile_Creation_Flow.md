# Story 12.4: Instagram-Style Product Creation Wizard

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: 📋 Ready for Development  
**Priority**: P0  
**Estimate**: 13 points  

---

## User Story

**As a** business owner  
**I want to** create products through a clean, 3-step wizard (like Instagram's post creation)  
**So that** the experience feels modern, intuitive, and image-first  

---

## Scope

### In Scope
- 3-step wizard modal (replaces old page + modal)
- Step 1: Media Selection (drag-drop or select from device)
- Step 2: Edit & Arrange (reorder, crop, rotate)
- Step 3: Details (name, description, tags, notifications)
- Mobile: Full-screen wizard with swipe navigation
- Web: Centered modal (~600px) with step indicator
- Draft management tab in Products section
- Resume draft functionality
- Deprecate old creation page and modal

### Out of Scope
- Image filters (Clarendon, Juno, etc.) — Phase 2
- Brightness/contrast adjustments — Phase 2
- Video uploads — Phase 2

---

## UI/UX Specifications

### Entry Point

```
Products Tab Header
┌────────────────────────────────────────────────────┐
│  Products (24)    [Drafts (3)]    [+ Add Product]  │
└────────────────────────────────────────────────────┘
                                          ↓
                            Opens Instagram-style wizard modal
```

### Step 1: Media Selection

**Web Modal:**
```
┌─────────────────────────────────────────────────────┐
│                                              [✕]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│                Create new product                   │
│                                                     │
│         ┌─────────────────────────────────┐         │
│         │                                 │         │
│         │    🖼️ 🎬                        │         │
│         │                                 │         │
│         │  Drag photos and videos here    │         │
│         │                                 │         │
│         │  ┌─────────────────────────┐    │         │
│         │  │  Select from computer   │    │         │
│         │  └─────────────────────────┘    │         │
│         │                                 │         │
│         └─────────────────────────────────┘         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Mobile Full-Screen:**
```
┌─────────────────────────┐
│  ✕ Cancel               │
├─────────────────────────┤
│                         │
│    New Product          │
│    Select up to 5 images│
│                         │
│  ┌─────────────────────┐│
│  │                     ││
│  │   Tap to select     ││
│  │   or drag here      ││
│  │                     ││
│  └─────────────────────┘│
│                         │
│  ┌─────────────────────┐│
│  │📷 Take Photo        ││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │🖼️ Choose from Gallery││
│  └─────────────────────┘│
│                         │
└─────────────────────────┘
```

### Step 2: Edit & Arrange

```
┌─────────────────────────────────────────────────────┐
│  ← Back              Edit              Next →       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │              MAIN IMAGE PREVIEW             │   │
│  │              (4:5 aspect ratio)             │   │
│  │                                             │   │
│  │                                             │   │
│  │                    ◀  ▶                     │   │
│  │                                             │   │
│  │                  ● ● ○ ○                    │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │  1  │ │  2  │ │  3  │ │  4  │ │ + │          │
│  │ 📷  │ │ 📷  │ │ 📷  │ │     │ │Add │          │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
│  ↔️ Hold and drag to reorder                       │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [✂️ Crop]  [🔄 Rotate]  [🗑️ Remove]               │
└─────────────────────────────────────────────────────┘
```

### Step 3: Details

```
┌─────────────────────────────────────────────────────┐
│  ← Back         Create new product         [Share] │
├───────────────────────────┬─────────────────────────┤
│                           │  👤 Business Name       │
│                           │  ─────────────────────  │
│   IMAGE PREVIEW           │  Product Name *         │
│   (carousel dots)         │  ┌───────────────────┐  │
│                           │  │                   │  │
│   ● ● ○                   │  └───────────────────┘  │
│                           │                   0/100 │
│                           │                         │
│                           │  Description            │
│                           │  ┌───────────────────┐  │
│                           │  │                   │  │
│                           │  │                   │  │
│                           │  └───────────────────┘  │
│                           │                   0/300 │
│                           │                         │
│                           │  Status Tags (max 3)    │
│                           │  ╭──────╮ ╭──────╮     │
│                           │  │🟢Avail│ │⭐Feat│     │
│                           │  ╰──────╯ ╰──────╯     │
│                           │                         │
│                           │  🔔 Notifications [ON]  │
├───────────────────────────┴─────────────────────────┤
│              [Save as Draft]                        │
└─────────────────────────────────────────────────────┘
```

### Drafts Tab

```
Products Tab with Drafts Toggle
┌─────────────────────────────────────────────────────┐
│  [📦 Products (24)]  [📝 Drafts (3)]  [+ Add]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  When "Drafts" is selected:                         │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  DRAFT   │  │  DRAFT   │  │  DRAFT   │          │
│  │  📷 img  │  │  📷 img  │  │  📷 img  │          │
│  │          │  │          │  │          │          │
│  ├──────────┤  ├──────────┤  ├──────────┤          │
│  │ Untitled │  │ Product A│  │ Sneakers │          │
│  │ 2 images │  │ 3 images │  │ 1 image  │          │
│  │ Updated: │  │ Updated: │  │ Updated: │          │
│  │ 2h ago   │  │ Yesterday│  │ 3 days   │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  Tap a draft to resume editing                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Technical Specifications

### Component Structure

```
src/components/products/creation/
├── ProductCreationWizard.tsx       # Main modal/full-screen container
├── steps/
│   ├── MediaSelectionStep.tsx      # Step 1
│   ├── EditArrangeStep.tsx         # Step 2
│   └── ProductDetailsStep.tsx      # Step 3
├── MediaUploadZone.tsx             # Drag-drop / click-to-select
├── ImageThumbnailStrip.tsx         # Reorderable thumbnail row
├── ImageEditor.tsx                 # Crop/Rotate interface
├── DraftPromptModal.tsx            # "Save as Draft?" dialog
└── hooks/
    ├── useProductWizard.ts         # Wizard state machine
    ├── useImagePicker.ts           # Native/web file picker
    └── useProductDraft.ts          # Draft persistence
    
src/components/products/
├── DraftsTab.tsx                   # Drafts list view
├── DraftCard.tsx                   # Individual draft card
└── ProductsTabHeader.tsx           # Toggle: Products | Drafts | +Add
```

### Wizard State Machine

```typescript
type WizardStep = 'media' | 'edit' | 'details';
type WizardAction = 
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'ADD_IMAGES'; images: ImageFile[] }
  | { type: 'REMOVE_IMAGE'; index: number }
  | { type: 'REORDER_IMAGES'; from: number; to: number }
  | { type: 'UPDATE_CROP'; index: number; crop: CropData }
  | { type: 'UPDATE_DETAILS'; name: string; description: string; tags: string[] }
  | { type: 'SAVE_DRAFT' }
  | { type: 'PUBLISH' };

interface WizardState {
  step: WizardStep;
  images: ProductImage[];
  name: string;
  description: string;
  tags: string[];
  notificationsEnabled: boolean;
  isDraftSaved: boolean;
  draftId?: string;
}
```

### Draft Storage (Database)

```sql
-- Products with status='draft' are drafts
-- No separate table needed; use existing products table

-- Query for drafts
SELECT * FROM products 
WHERE business_id = :business_id 
  AND status = 'draft' 
ORDER BY updated_at DESC;

-- Draft fields populated incrementally:
-- - images: JSONB array (can be partial)
-- - name: TEXT (can be empty for drafts)
-- - description: TEXT
-- - tags: TEXT[]
```

---

## Acceptance Criteria

### Step 1: Media Selection
- [ ] Wizard opens as modal (web) or full-screen (mobile)
- [ ] Drag-and-drop zone accepts images
- [ ] "Select from computer/gallery" button works
- [ ] Mobile: Native image picker via Capacitor
- [ ] Mobile: Option to take photo with camera
- [ ] Can select up to 5 images
- [ ] Shows "X/5 images" counter
- [ ] "Next" button disabled if 0 images
- [ ] Unsupported formats show error
- [ ] Files >10MB show error

### Step 2: Edit & Arrange
- [ ] Preview shows first image large
- [ ] Carousel dots indicate image count
- [ ] Arrow buttons navigate images
- [ ] Thumbnail strip shows all images
- [ ] Long-press + drag reorders thumbnails
- [ ] First image marked as "Cover"
- [ ] "Crop" button opens 4:5 cropper
- [ ] "Rotate" rotates selected image 90°
- [ ] "Remove" deletes image (with confirmation if only 1 left)
- [ ] "+" button adds more images (if < 5)
- [ ] "Back" returns to Step 1 (preserves images)
- [ ] "Next" proceeds to Step 3

### Step 3: Details
- [ ] Image preview carousel at left (web) or top (mobile)
- [ ] Product Name field (required, max 100 chars)
- [ ] Description field (optional, max 300 chars)
- [ ] Character counters shown
- [ ] Tag selector (pill buttons, max 3)
- [ ] Notification toggle (default: ON)
- [ ] "Share" button publishes product (status='published')
- [ ] "Save as Draft" saves with status='draft'
- [ ] Validation errors shown inline

### Close/Exit Behavior
- [ ] ✕ button prompts: "Save as Draft?" / "Discard"
- [ ] Back button on Step 1 prompts if images exist
- [ ] Mobile: App backgrounded → auto-save draft silently
- [ ] Return to wizard → prompt to resume draft

### Drafts Tab
- [ ] "Drafts (N)" tab visible in Products section (owner only)
- [ ] Drafts NOT shown in main Products grid
- [ ] Drafts show: thumbnail, name (or "Untitled"), image count, last updated
- [ ] Tap draft → opens wizard at appropriate step
- [ ] Swipe to delete draft (with confirmation)
- [ ] Empty state: "No drafts yet"

### Legacy Deprecation
- [ ] Old `/business/products/create` page removed
- [ ] Old AddProductModal component deleted
- [ ] All "Add Product" buttons now open new wizard

---

## Mobile Specific

| Feature | Implementation |
|---------|----------------|
| Image Picker | `@capawesome/capacitor-photo-picker` |
| Camera | `@capacitor/camera` |
| Draft Persistence | `@capacitor/preferences` + DB sync |
| Swipe Navigation | React Native Gesture Handler or CSS touch |

---

## Web Specific

| Feature | Implementation |
|---------|----------------|
| Modal | React Portal with overlay |
| Drag-Drop | react-dropzone |
| Cropping | react-easy-crop |
| Keyboard | ESC closes (with prompt), Tab navigation |

---

## Testing Checklist

### Wizard Flow
- [ ] Open wizard from "+ Add" button
- [ ] Select 1-5 images
- [ ] Try selecting 6+ (blocked)
- [ ] Reorder images via drag
- [ ] Crop an image
- [ ] Rotate an image
- [ ] Remove an image
- [ ] Fill in product details
- [ ] Publish product → appears in grid
- [ ] Save as draft → appears in Drafts tab

### Drafts
- [ ] Save as draft mid-wizard
- [ ] Close wizard with prompt → save draft
- [ ] Open Drafts tab
- [ ] Tap draft to resume
- [ ] Delete draft via swipe/action
- [ ] Verify drafts NOT in main Products grid

### Edge Cases
- [ ] Close wizard at Step 1 with 3 images → prompt
- [ ] Close wizard at Step 3 with all fields filled → prompt
- [ ] Mobile: Background app at Step 2 → auto-save
- [ ] Resume draft with 5 images → cannot add more
- [ ] Publish with empty name → validation error

---

## Dependencies

- Story 12.1 (Image Upload & Cropping) — for cropper component
- Story 12.9 (Tags System) — for tag selector
- @capacitor/camera
- @capawesome/capacitor-photo-picker
- @capacitor/preferences
- react-dropzone (web)
- react-easy-crop (web)
- framer-motion or react-beautiful-dnd (reordering)

---

## Files to Delete (Post-Implementation)

```
src/pages/ProductCreationPage.tsx    # Old separate page
src/components/products/AddProductModal.tsx  # Old modal (if exists)
# Remove route: /business/products/create
```
