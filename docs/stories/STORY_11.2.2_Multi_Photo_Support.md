# Story 11.2.2: Multi-Photo Support (Up to 5 Photos)

**Epic:** [EPIC 11.2 - Reviews Content Enhancement](../epics/EPIC_11.2_Reviews_Content_Enhancement.md)  
**Priority:** 🟡 P1 - MEDIUM  
**Effort:** 3 days  
**Dependencies:** None  
**Status:** 📋 Ready for Implementation

---

## Overview

Upgrade from single photo to multi-photo support in reviews. Users can upload up to 5 photos per review, each under 1MB. Photos can be uploaded one-by-one with drag-to-reorder functionality. No captions for individual photos.

---

## Problem Statement

### Current State
- Reviews support **single photo** only
- Database stores `photo_url TEXT` (single string)
- `ReviewPhotoUpload.tsx` handles one image
- Users cannot showcase multiple aspects of their visit

### Desired State
- Reviews support **up to 5 photos**
- Database stores `photo_urls TEXT[]` (array)
- Upload one-by-one with drag-to-reorder
- Each photo max 1MB
- No captions required

---

## User Stories

### US-11.2.2.1: Upload Multiple Photos
**As a** user writing a review  
**I want to** upload up to 5 photos  
**So that** I can show different aspects of my experience

**Acceptance Criteria:**
- [ ] "Add Photo" button always visible when under 5 photos
- [ ] Photos uploaded one at a time (not bulk select)
- [ ] Each upload shows progress indicator
- [ ] Counter shows: "2/5 photos"
- [ ] Button disabled/hidden when 5 photos reached

---

### US-11.2.2.2: Drag to Reorder Photos
**As a** user with multiple photos  
**I want to** drag photos to reorder them  
**So that** I can control which photo appears first

**Acceptance Criteria:**
- [ ] Photos displayed in a row/grid
- [ ] Long press (mobile) or click-drag (desktop) to grab
- [ ] Visual feedback during drag (elevated, shadow)
- [ ] Drop zone indicators
- [ ] First photo becomes the "cover" in review display
- [ ] Order saved as array order

---

### US-11.2.2.3: Photo Size Validation
**As a** platform  
**I want to** limit each photo to 1MB  
**So that** storage costs are controlled

**Acceptance Criteria:**
- [ ] Validate file size before upload
- [ ] Reject files over 1MB with message: "Photo must be under 1MB"
- [ ] Show file size during selection if over limit
- [ ] Suggest compression if file too large
- [ ] Client-side compression optional (auto-resize large images)

---

### US-11.2.2.4: Remove Individual Photos
**As a** user reviewing photos  
**I want to** remove individual photos  
**So that** I can fix mistakes

**Acceptance Criteria:**
- [ ] Each photo thumbnail has X/remove button
- [ ] Confirmation for remove: "Remove this photo?"
- [ ] Photo removed from array immediately
- [ ] Counter updated after removal
- [ ] Can add new photo after removing one

---

### US-11.2.2.5: Photo Gallery Display
**As a** user viewing a review with photos  
**I want to** see all photos in a gallery  
**So that** I can view each one

**Acceptance Criteria:**
- [ ] First photo shown larger (cover)
- [ ] Additional photos shown as smaller thumbnails
- [ ] "+X more" indicator if many photos
- [ ] Click opens full-screen gallery/lightbox
- [ ] Swipe through photos in lightbox
- [ ] Close button and gestures (swipe down)

---

## Technical Requirements

### Database Migration

**File:** `supabase/migrations/YYYYMMDD_multi_photo_reviews.sql`

```sql
-- ============================================
-- MIGRATION: Multi-Photo Support for Reviews
-- Story: 11.2.2
-- ============================================

-- Step 1: Add photo_urls array column
ALTER TABLE business_reviews
ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- Step 2: Migrate existing single photo_url to array
UPDATE business_reviews
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL 
  AND photo_url != ''
  AND (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL);

-- Step 3: Add constraint for max 5 photos
ALTER TABLE business_reviews
ADD CONSTRAINT check_photo_count CHECK (
  array_length(photo_urls, 1) IS NULL 
  OR array_length(photo_urls, 1) <= 5
);

-- Step 4: Drop old photo_url column (optional - can keep for backward compatibility)
-- ALTER TABLE business_reviews DROP COLUMN IF EXISTS photo_url;
-- Or keep it as an alias that points to first element:
CREATE OR REPLACE FUNCTION get_primary_photo(urls TEXT[])
RETURNS TEXT AS $$
BEGIN
  RETURN urls[1];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Add index for reviews with photos
CREATE INDEX IF NOT EXISTS idx_reviews_with_photos
ON business_reviews (business_id)
WHERE array_length(photo_urls, 1) > 0;
```

---

### Update Storage Configuration

#### Verify `storage-policies.sql`
```sql
-- Ensure reviews bucket allows multiple files per review
-- Bucket structure: reviews/{reviewId}/{filename}

-- Check bucket size limits
UPDATE storage.buckets
SET file_size_limit = 1048576  -- 1MB in bytes
WHERE name = 'reviews';
```

---

### Update Photo Upload Component

#### Rewrite `ReviewPhotoUpload.tsx`
**Location:** `src/components/reviews/ReviewPhotoUpload.tsx`

```tsx
import { useState, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Plus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadReviewPhoto } from '@/services/reviewService';
import { toast } from 'sonner';

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

interface ReviewPhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  reviewId?: string; // For existing reviews
}

export function ReviewPhotoUpload({ photos, onPhotosChange, reviewId }: ReviewPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset input for re-selection of same file
    e.target.value = '';
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Photo must be under 1MB (yours is ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Check max photos
    if (photos.length >= MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const url = await uploadReviewPhoto(file, reviewId, (progress) => {
        setUploadProgress(progress);
      });
      
      onPhotosChange([...photos, url]);
      toast.success('Photo uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };
  
  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = photos.indexOf(active.id as string);
      const newIndex = photos.indexOf(over.id as string);
      
      onPhotosChange(arrayMove(photos, oldIndex, newIndex));
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Photos <span className="text-muted-foreground">(optional)</span>
        </label>
        <span className="text-sm text-muted-foreground">
          {photos.length}/{MAX_PHOTOS} photos
        </span>
      </div>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={photos} 
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex flex-wrap gap-2">
            {photos.map((url, index) => (
              <SortablePhoto 
                key={url} 
                id={url}
                url={url} 
                index={index}
                onRemove={() => handleRemovePhoto(index)}
              />
            ))}
            
            {/* Add Photo Button */}
            {photos.length < MAX_PHOTOS && (
              <label className={`
                relative flex items-center justify-center
                w-20 h-20 rounded-lg border-2 border-dashed
                cursor-pointer transition-colors
                ${uploading 
                  ? 'border-muted bg-muted cursor-wait' 
                  : 'border-muted-foreground/25 hover:border-primary hover:bg-accent'
                }
              `}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="sr-only"
                />
                
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-xs text-primary font-medium mt-1">
                      {uploadProgress}%
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Plus className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Add</span>
                  </div>
                )}
              </label>
            )}
          </div>
        </SortableContext>
      </DndContext>
      
      <p className="text-xs text-muted-foreground">
        {photos.length === 0 
          ? 'Add up to 5 photos (max 1MB each). Drag to reorder.'
          : 'Drag to reorder. First photo appears as cover.'}
      </p>
    </div>
  );
}

// Sortable Photo Component
interface SortablePhotoProps {
  id: string;
  url: string;
  index: number;
  onRemove: () => void;
}

function SortablePhoto({ id, url, index, onRemove }: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.8 : 1,
  };
  
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`
        relative w-20 h-20 rounded-lg overflow-hidden group
        ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}
      `}
      {...attributes}
      {...listeners}
    >
      <img 
        src={url} 
        alt={`Photo ${index + 1}`}
        className="w-full h-full object-cover"
      />
      
      {/* Cover badge for first photo */}
      {index === 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">
          Cover
        </div>
      )}
      
      {/* Remove button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="
          absolute top-1 right-1 p-1 rounded-full
          bg-black/60 text-white
          opacity-0 group-hover:opacity-100
          transition-opacity
        "
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
```

---

### Update Photo Gallery Display

#### Create `ReviewPhotoGallery.tsx`
**Location:** `src/components/reviews/ReviewPhotoGallery.tsx`

```tsx
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ReviewPhotoGalleryProps {
  photos: string[];
}

export function ReviewPhotoGallery({ photos }: ReviewPhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!photos || photos.length === 0) return null;
  
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };
  
  const handleNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };
  
  return (
    <>
      {/* Thumbnail Grid */}
      <div className="mt-3">
        {photos.length === 1 ? (
          // Single photo - larger display
          <img
            src={photos[0]}
            alt="Review photo"
            className="w-full max-h-64 object-cover rounded-lg cursor-zoom-in"
            onClick={() => { setCurrentIndex(0); setLightboxOpen(true); }}
          />
        ) : (
          // Multiple photos - grid
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.slice(0, 4).map((url, index) => (
              <div 
                key={url}
                className="relative flex-shrink-0 w-20 h-20 cursor-pointer"
                onClick={() => { setCurrentIndex(index); setLightboxOpen(true); }}
              >
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                
                {/* "+X more" overlay on 4th photo */}
                {index === 3 && photos.length > 4 && (
                  <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                    <span className="text-white font-medium">
                      +{photos.length - 4}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 bg-black">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 text-white p-2 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Counter */}
            <div className="absolute top-4 left-4 text-white text-sm">
              {currentIndex + 1} / {photos.length}
            </div>
            
            {/* Main image */}
            <img
              src={photos[currentIndex]}
              alt={`Photo ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Navigation arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-4 text-white p-2 bg-black/50 rounded-full"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 text-white p-2 bg-black/50 rounded-full"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

### Update Review Card

#### Modify `ReviewCard.tsx`
**Location:** `src/components/reviews/ReviewCard.tsx`

```tsx
import { ReviewPhotoGallery } from './ReviewPhotoGallery';

// In the render:
{review.photo_urls && review.photo_urls.length > 0 && (
  <ReviewPhotoGallery photos={review.photo_urls} />
)}

// Remove old single photo handling:
// {review.photo_url && <img src={review.photo_url} ... />}
```

---

### Update Service Layer

#### Modify `reviewService.ts`
```typescript
/**
 * Upload a review photo to storage
 */
export async function uploadReviewPhoto(
  file: File,
  reviewId?: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
  const filePath = reviewId 
    ? `${reviewId}/${fileName}` 
    : `temp/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('reviews')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('reviews')
    .getPublicUrl(data.path);
  
  return publicUrl;
}

/**
 * Submit review with photo_urls
 */
export async function submitReview(data: ReviewSubmission): Promise<Review> {
  // Validate photo count
  if (data.photo_urls && data.photo_urls.length > 5) {
    throw new ReviewValidationError(
      'TOO_MANY_PHOTOS',
      'Maximum 5 photos allowed per review'
    );
  }
  
  // ... rest of submission logic
  
  const { data: review, error } = await supabase
    .from('business_reviews')
    .insert({
      business_id: data.business_id,
      user_id: user.id,
      recommendation: data.recommendation,
      text: data.text,
      tags: data.tags || [],
      photo_urls: data.photo_urls || [],  // Store as array
      // ...
    })
    .select()
    .single();
  
  // ...
}
```

---

## Dependencies

Add drag-and-drop library:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Testing Plan

### Unit Tests
```typescript
describe('ReviewPhotoUpload', () => {
  it('limits to 5 photos', () => {
    const { getByText } = render(
      <ReviewPhotoUpload photos={Array(5).fill('url')} onPhotosChange={() => {}} />
    );
    expect(getByText('5/5 photos')).toBeInTheDocument();
    // Add button should not exist
    expect(screen.queryByText('Add')).not.toBeInTheDocument();
  });

  it('rejects files over 1MB', async () => {
    const onPhotosChange = vi.fn();
    render(<ReviewPhotoUpload photos={[]} onPhotosChange={onPhotosChange} />);
    
    const file = new File(['x'.repeat(2 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/add/i);
    
    await userEvent.upload(input, file);
    
    expect(onPhotosChange).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('reorders photos via drag', async () => {
    // Test drag-and-drop reordering
  });
});

describe('ReviewPhotoGallery', () => {
  it('shows single photo full width', () => {
    render(<ReviewPhotoGallery photos={['url1']} />);
    const img =element.querySelector('img');
    expect(img).toHaveClass('w-full');
  });

  it('shows grid for multiple photos', () => {
    render(<ReviewPhotoGallery photos={['url1', 'url2', 'url3']} />);
    expect(screen.getAllByRole('img').length).toBe(3);
  });

  it('shows +X overlay for 5+ photos', () => {
    render(<ReviewPhotoGallery photos={['1', '2', '3', '4', '5', '6']} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('opens lightbox on click', async () => {
    render(<ReviewPhotoGallery photos={['url1']} />);
    await userEvent.click(screen.getByRole('img'));
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });
});
```

### Manual Testing Checklist
- [ ] Upload 5 photos one by one
- [ ] Try to upload 6th photo - blocked
- [ ] Upload file > 1MB - rejected with message
- [ ] Drag to reorder photos
- [ ] First photo shows "Cover" badge
- [ ] Remove individual photo
- [ ] View photos in lightbox
- [ ] Navigate with arrows in lightbox
- [ ] Swipe on mobile in lightbox
- [ ] Submit review with multiple photos
- [ ] View saved review with photo gallery
- [ ] Edit review and modify photos

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_multi_photo.sql` | CREATE | Add photo_urls column, migrate data |
| `src/components/reviews/ReviewPhotoUpload.tsx` | REWRITE | Multi-photo with drag-reorder |
| `src/components/reviews/ReviewPhotoGallery.tsx` | CREATE | Display gallery and lightbox |
| `src/components/reviews/ReviewCard.tsx` | MODIFY | Use new gallery component |
| `src/services/reviewService.ts` | MODIFY | Handle photo arrays |
| `src/types/review.ts` | MODIFY | Change photo_url to photo_urls |
| `package.json` | MODIFY | Add @dnd-kit packages |

---

## Definition of Done

- [ ] Database schema supports photo_urls array
- [ ] Existing single photos migrated to array
- [ ] Upload up to 5 photos one-by-one
- [ ] Drag-to-reorder working
- [ ] 1MB size limit enforced
- [ ] Remove individual photos working
- [ ] Gallery display with lightbox
- [ ] Mobile touch gestures working
- [ ] All tests passing
- [ ] Code reviewed and approved

---

**Story Owner:** Frontend Engineering  
**Reviewer:** [TBD]
