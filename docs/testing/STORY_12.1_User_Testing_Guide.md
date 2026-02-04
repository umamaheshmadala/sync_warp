# User Testing Guide: Story 12.1 - Product Image Upload & Cropping

This guide covers the testing procedures for the new Product Image Upload and Cropping functionality. This feature allows business owners to upload, crop (to 4:5 aspect ratio), and manage product images.

## 1. Prerequisites
- **User Role**: Logged in as a Business Owner.
- **Environment**: Web Browser (Chrome/Safari) or Mobile Device (via local dev server).
- **Test Files**:
  - Valid images (JPG, PNG) under 10MB.
  - Large image (>10MB) for error testing.
  - Landscape image for cropping/letterboxing test.
  - Unsupported file type (e.g., PDF or GIF).

## 2. Testing Scenarios

### A. Happy Path (Standard Usage)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Product Creation/Edit page | `ImageUploadZone` is visible. "Product Images" header is present. |
| 2 | Click "Click to upload" or drag a valid image | Image is accepted. Preview thumbnail appears. |
| 3 | Click the "Pen" (Edit) icon on the image | **Cropper Modal** opens. Image is displayed. |
| 4 | Try to change crop area | Crop box is locked to **4:5 ratio**. You can move the image within the box. |
| 5 | Use Zoom slider or pinch | Image zooms in/out smoothly. |
| 6 | Click "Rotate 90°" | Image rotates 90 degrees clockwise. |
| 7 | Click "Apply Crop" | Modal closes. Thumbnail updates to show the cropped version. |
| 8 | Upload 2 more images | Total 3 images in the list. Count shows (3/5). |
| 9 | Drag the 3rd image to the 1st position | Images reorder. The new 1st image gets the "Cover" label. |
| 10 | Click "Save" / "Create" (if integrated) | Images are processed, compressed to ~1MB, and uploaded to storage. |

### B. Layout & Ratio Enforcement
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload a **Landscape** image (e.g., 1920x1080) | Image is uploaded. |
| 2 | Open Cropper | Default crop shows the center 4:5 portion. |
| 3 | Zoom out fully | You CANNOT zoom out past the image bounds (no white space allowed inside crop area) unless the implementation allows letterboxing fallback (dark bars). *Current Logic: Forces fill.* |
| 4 | Check Grid | Grid overlay (rule of thirds) is visible by default. Toggle works. |

### C. Edge Cases & Error Handling
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to upload file >10MB | **Error Toast**: "File too large: [filename] (Max 10MB)". Image is NOT added. |
| 2 | Try to upload PDF/GIF | **Error Toast**: "Unsupported format". Image is NOT added. |
| 3 | Upload 5 images | List is full (5/5). Upload zone becomes disabled/grayed out. |
| 4 | Try to drag 6th image onto zone | Drop is rejected or ignored. Toast warns about limit. |
| 5 | Network Disconnect (Simulated) during upload | Upload fails. Error message appears with "Retry" option (if upload logic integrated). |

### D. Mobile Specific (if testing on device)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tap Upload Area | Native OS Image Picker opens (Gallery/Camera). |
| 2 | Select "Take Photo" | Camera opens. Photo captured is passed to the app. |
| 3 | Select HEIC image (iPhone) | Image is converted and loaded correctly. |
| 4 | Touch Gestures in Cropper | Pinch-to-zoom and two-finger drag work smoothly. |

## 3. Visual Verification Checklist
- [ ] **Aspect Ratio**: All thumbnails in the list are vertical rectangles (4:5).
- [ ] **Cover Label**: Only the first image has the "Cover" badge.
- [ ] **Drag Handles**: Grip icons are visible on hover (desktop) or always (mobile).
- [ ] **Modal**: Cropper modal fits on screen, buttons are accessible on mobile.

## 4. Troubleshooting
- **Image not loading in cropper?** Check console for CORS errors.
- **Upload fails immediately?** Verify Supabase Storage bucket `product-images` exists and has RLS policies allowing uploads.
- **Reorder glitchy?** Ensure you are dragging by the handle/image center.
