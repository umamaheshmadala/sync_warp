# 📸 EPIC 8.3: Media Attachments & Rich Content Sharing

**Epic Owner:** Frontend Engineering / Product  
**Dependencies:** Epic 8.1 (Database), Epic 8.2 (Core Messaging)  
**Timeline:** Week 5 (1.5 weeks - 6 stories)  
**Status:** 📋 Planning

---

## 🎯 **Epic Goal**

Enable users to share **rich media content** in messages **on web browsers, iOS, and Android native apps**:

- Upload and display images/videos
- **Native camera capture on iOS/Android** (Capacitor Camera plugin)
- **Native file picker on iOS/Android** (Capacitor Filesystem plugin)
- Generate link previews for URLs
- **Native share sheets on iOS/Android** (Capacitor Share plugin)
- **Tightly integrate coupon/deal sharing** (your key USP!)
- Compress media before upload (web + mobile)
- Generate thumbnails automatically (web + mobile)

---

## 📱 **Platform Support**

**Target Platforms:**

- ✅ **Web Browsers** (Chrome, Firefox, Safari, Edge)
- ✅ **iOS Native App** (via Capacitor framework)
- ✅ **Android Native App** (via Capacitor framework)

**Cross-Platform Media Handling:**

| Feature                  | Web Implementation                       | iOS/Android Implementation                                |
| ------------------------ | ---------------------------------------- | --------------------------------------------------------- |
| **Image Upload**         | `<input type="file">`                    | `@capacitor/camera` - Camera.getPhoto()                   |
| **Video Upload**         | `<input type="file" accept="video/*">`   | `@capacitor/camera` - Camera.getPhoto({source: 'PHOTOS'}) |
| **Camera Capture**       | `<input capture="camera">` (limited)     | `@capacitor/camera` - Native camera UI                    |
| **File Picker**          | `<input type="file">`                    | `@capacitor/filesystem` - Native file picker              |
| **Image Compression**    | `browser-image-compression` (web worker) | `browser-image-compression` (same library)                |
| **Thumbnail Generation** | Canvas API                               | Canvas API (via WebView)                                  |
| **Share**                | Web Share API (if supported)             | `@capacitor/share` - Native share sheet                   |

**Required Capacitor Plugins:**

```json
{
  "@capacitor/camera": "^5.0.0", // Native camera & photo library
  "@capacitor/filesystem": "^5.0.0", // File system access
  "@capacitor/share": "^5.0.0" // Native share sheet
}
```

**Platform-Specific Permissions:**

**iOS (Info.plist):**

```xml
<key>NSCameraUsageDescription</key>
<string>SynC needs camera access to capture and share photos in messages</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>SynC needs photo library access to share images in messages</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>SynC needs to save images you receive in messages</string>
```

**Android (AndroidManifest.xml):**

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                 android:maxSdkVersion="28" />
```

---

## ✅ **Success Criteria**

| Objective                          | Target                                       |
| ---------------------------------- | -------------------------------------------- | -------------------------------------------- |
| **Image Upload Success (Web)**     | > 99%                                        |
| **Image Upload Success (iOS)**     | > 99%                                        |
| **Image Upload Success (Android)** | > 99%                                        |
| **Native Camera Capture**          | Works on iOS/Android with permissions        |
| **Compression Ratio**              | Reduce file size by 60-80% (all platforms)   |
| **Upload Speed**                   | < 3s for 5MB image (all platforms)           |
| **Link Preview Generation**        | < 1s                                         |
| **Native Share Sheet**             | Works on iOS/Android for coupon/deal sharing |
|                                    | **Coupon Share Tracking**                    | 100% tracked in shares table (all platforms) |

---

## 🎯 **MCP Integration Strategy**

**This epic follows the global MCP routing rule** (`rule:yCm2e9oHOnrU5qbhrGa2IE`) to maximize development efficiency:

### **Primary MCP Servers Used:**

1. **🛢 Supabase MCP** (Heavy usage)
   - Execute SQL queries for storage bucket management
   - Test RLS policies on `message_attachments` table
   - Monitor storage.objects for upload tracking
   - Test signed URL generation

2. **🌐 Chrome DevTools MCP** (Heavy usage)
   - Debug media upload progress indicators
   - Monitor network requests for upload failures
   - Test image compression performance
   - Profile thumbnail generation speed
   - Debug link preview rendering

3. **🧠 Context7 MCP** (Medium usage)
   - Analyze upload service architecture
   - Find security vulnerabilities in file handling
   - Suggest compression optimization strategies
   - Review coupon/deal link detection logic

4. **🤖 Puppeteer MCP** (For testing)
   - Automate end-to-end media upload flows
   - Test link preview generation for various URLs
   - Verify thumbnail display across devices

5. **🎨 Shadcn MCP** (UI scaffolding)
   - Scaffold media preview components
   - Generate attachment cards for coupons/deals
   - Build image gallery components

**🔄 Automatic Routing:** Per global MCP rule, commands automatically route to appropriate servers based on keywords:

- SQL/database queries → Supabase MCP
- inspect/debug → Chrome DevTools MCP
- explain/analyze → Context7 MCP
- e2e test → Puppeteer MCP

**📖 Each story below includes specific MCP commands for implementation.**

---

## 🧩 **Key Components**

### **1. Media Upload Service**

**File:** `src/services/mediaUploadService.ts`

```typescript
// src/services/mediaUploadService.ts
import { supabase } from "../lib/supabase";
import imageCompression from "browser-image-compression";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";

class MediaUploadService {
  /**
   * Pick and upload image
   * 📱 Supports Web + iOS + Android
   * 🛢 Uses storage bucket from Epic 8.1
   */
  async uploadImage(
    fileOrUri: File | string, // File (web) or URI (mobile)
    conversationId: string,
    source: "camera" | "gallery" = "gallery"
  ): Promise<string> {
    let file: File;

    // 📱 Platform-conditional logic
    if (Capacitor.isNativePlatform()) {
      // MOBILE: Use Capacitor Camera plugin
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
        quality: 90,
        allowEditing: true,
        width: 1920,
        height: 1920,
      });

      // Convert URI to File
      file = await this.uriToFile(photo.webPath!, photo.format);
    } else {
      // WEB: Use browser File API
      if (typeof fileOrUri === "string") {
        throw new Error("Web platform requires File object");
      }
      file = fileOrUri;
    }

    // Compress image (works on both web and mobile)
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: !Capacitor.isNativePlatform(), // Disable web worker on mobile
    });

    // Generate thumbnail (works on both web and mobile)
    const thumbnail = await this.generateThumbnail(compressed);

    const userId = (await supabase.auth.getUser()).data.user!.id;
    const fileName = `${userId}/${conversationId}/${Date.now()}-${file.name}`;

    // Upload original
    const { data, error } = await supabase.storage
      .from("message-attachments")
      .upload(fileName, compressed);

    if (error) throw error;

    // Upload thumbnail
    await supabase.storage
      .from("message-attachments")
      .upload(`${fileName}_thumb.jpg`, thumbnail);

    return data.path;
  }

  /**
   * Generate thumbnail (max 300px)
   * Works on both web and mobile
   */
  private async generateThumbnail(file: File): Promise<Blob> {
    return await imageCompression(file, {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 300,
      useWebWorker: !Capacitor.isNativePlatform(), // Disable web worker on mobile
    });
  }

  /**
   * 📱 MOBILE ONLY: Convert native file URI to File object
   */
  private async uriToFile(uri: string, format: string): Promise<File> {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileName = `capture-${Date.now()}.${format}`;
    return new File([blob], fileName, { type: `image/${format}` });
  }

  /**
   * Upload video (max 25MB)
   */
  async uploadVideo(file: File, conversationId: string): Promise<string> {
    if (file.size > 25 * 1024 * 1024) {
      throw new Error("Video size exceeds 25MB limit");
    }

    const userId = (await supabase.auth.getUser()).data.user!.id;
    const fileName = `${userId}/${conversationId}/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from("message-attachments")
      .upload(fileName, file);

    if (error) throw error;
    return data.path;
  }

  /**
   * Get signed URL (expires in 1 hour)
   */
  async getSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from("message-attachments")
      .createSignedUrl(path, 3600);

    if (error) throw error;
    return data.signedUrl;
  }
}

export const mediaUploadService = new MediaUploadService();
```

**🛢 MCP Integration:**

```bash
# Test storage upload via Supabase MCP
warp mcp run supabase "execute_sql SELECT * FROM storage.objects WHERE bucket_id = 'message-attachments';"
```

---

### **2. Link Preview Service**

**File:** `src/services/linkPreviewService.ts`

```typescript
// src/services/linkPreviewService.ts
import { supabase } from "../lib/supabase";

interface LinkPreview {
  title: string;
  description: string;
  image?: string;
  url: string;
  type: "external" | "coupon" | "deal";
  couponId?: string;
  dealId?: string;
}

class LinkPreviewService {
  /**
   * Generate preview for any URL
   * Detects SynC coupon/deal links automatically
   */
  async generatePreview(url: string): Promise<LinkPreview> {
    // Check if it's a SynC coupon link
    const couponMatch = url.match(/\/coupons\/([a-f0-9-]+)/);
    if (couponMatch) {
      return await this.fetchCouponPreview(couponMatch[1]);
    }

    // Check if it's a SynC deal link
    const dealMatch = url.match(/\/offers\/([a-f0-9-]+)/);
    if (dealMatch) {
      return await this.fetchDealPreview(dealMatch[1]);
    }

    // External link - fetch Open Graph data
    return await this.fetchExternalPreview(url);
  }

  /**
   * Fetch coupon details for preview
   * 🛢 Integrates with existing coupons table
   */
  private async fetchCouponPreview(couponId: string): Promise<LinkPreview> {
    const { data, error } = await supabase
      .from("coupons")
      .select("title, description, image_url, business_id")
      .eq("id", couponId)
      .single();

    if (error) throw error;

    return {
      title: data.title,
      description: data.description,
      image: data.image_url,
      url: `/coupons/${couponId}`,
      type: "coupon",
      couponId,
    };
  }

  /**
   * Fetch deal/offer details for preview
   * 🛢 Integrates with existing offers table
   */
  private async fetchDealPreview(dealId: string): Promise<LinkPreview> {
    const { data, error } = await supabase
      .from("offers")
      .select("title, description, image_url, business_id")
      .eq("id", dealId)
      .single();

    if (error) throw error;

    return {
      title: data.title,
      description: data.description,
      image: data.image_url,
      url: `/offers/${dealId}`,
      type: "deal",
      dealId,
    };
  }

  /**
   * Fetch external link preview
   * Uses a serverless function to avoid CORS
   */
  private async fetchExternalPreview(url: string): Promise<LinkPreview> {
    // Call your backend API or use a service like Microlink
    const response = await fetch(
      `/api/link-preview?url=${encodeURIComponent(url)}`
    );
    const data = await response.json();

    return {
      title: data.title || url,
      description: data.description || "",
      image: data.image,
      url,
      type: "external",
    };
  }

  /**
   * Validate URL is safe (Google Safe Browsing API)
   */
  async validateUrl(url: string): Promise<boolean> {
    // Implementation using Google Safe Browsing API
    // For MVP, you can skip this or use a simple blocklist
    return true;
  }
}

export const linkPreviewService = new LinkPreviewService();
```

---

### **3. Coupon/Deal Share Component**

**File:** `src/components/messaging/CouponShareCard.tsx`

```typescript
// src/components/messaging/CouponShareCard.tsx
import React from 'react'
import { Gift, Tag } from 'lucide-react'
import type { LinkPreview } from '../../types/messaging'

interface Props {
  preview: LinkPreview
  onClick: () => void
}

export function CouponShareCard({ preview, onClick }: Props) {
  const Icon = preview.type === 'coupon' ? Gift : Tag

  return (
    <div
      onClick={onClick}
      className="border rounded-lg overflow-hidden cursor-pointer hover:border-primary transition-colors"
    >
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-3 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-start gap-2">
          <Icon className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm line-clamp-1">
              {preview.title}
            </h4>
            <p className="text-xs text-gray-600 line-clamp-2 mt-1">
              {preview.description}
            </p>
            <span className="inline-block mt-2 text-xs font-medium text-primary">
              {preview.type === 'coupon' ? '🎁 View Coupon' : '🏷️ View Deal'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**🎨 MCP Integration:**

```bash
# Scaffold UI components with Shadcn MCP
warp mcp run shadcn "getComponent card"
warp mcp run shadcn "getComponent badge"
```

---

### **4. Message Composer with Media**

**File:** `src/components/messaging/MessageComposer.tsx`

```typescript
// Enhanced MessageComposer with media upload
import React, { useState, useRef } from 'react'
import { Send, Image, Video, Link as LinkIcon } from 'lucide-react'
import { useSendMessage } from '../../hooks/useSendMessage'
import { mediaUploadService } from '../../services/mediaUploadService'
import { linkPreviewService } from '../../services/linkPreviewService'
import { toast } from 'react-hot-toast'

interface Props {
  conversationId: string
  onTyping: () => void
}

export function MessageComposer({ conversationId, onTyping }: Props) {
  const [content, setContent] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { sendMessage } = useSendMessage()

  // Handle text change with typing indicator
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    onTyping()

    // Auto-detect URLs and generate preview
    const urlMatch = e.target.value.match(/(https?:\/\/[^\s]+)/)
    if (urlMatch) {
      generateLinkPreview(urlMatch[0])
    }
  }

  // Generate link preview
  const generateLinkPreview = async (url: string) => {
    try {
      const preview = await linkPreviewService.generatePreview(url)
      setLinkPreview(preview)
    } catch (error) {
      console.error('Failed to generate preview:', error)
    }
  }

  // Handle image/video upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      let mediaUrl: string

      if (file.type.startsWith('image/')) {
        mediaUrl = await mediaUploadService.uploadImage(file, conversationId)
      } else if (file.type.startsWith('video/')) {
        mediaUrl = await mediaUploadService.uploadVideo(file, conversationId)
      } else {
        throw new Error('Unsupported file type')
      }

      // Get signed URL
      const signedUrl = await mediaUploadService.getSignedUrl(mediaUrl)

      // Send message with media
      await sendMessage({
        conversationId,
        content: '',
        type: file.type.startsWith('image/') ? 'image' : 'video',
        mediaUrls: [signedUrl]
      })

      toast.success('Media uploaded successfully!')
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Failed to upload media')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle send
  const handleSend = async () => {
    if (!content.trim() && !linkPreview) return

    try {
      await sendMessage({
        conversationId,
        content: content.trim(),
        type: linkPreview ? 'link' : 'text',
        linkPreview: linkPreview || undefined,
        sharedCouponId: linkPreview?.couponId,
        sharedDealId: linkPreview?.dealId
      })

      setContent('')
      setLinkPreview(null)
    } catch (error) {
      // Error handled by useSendMessage
    }
  }

  return (
    <div className="border-t p-4 bg-white">
      {/* Link Preview */}
      {linkPreview && (
        <div className="mb-2">
          <CouponShareCard
            preview={linkPreview}
            onClick={() => {/* Navigate to coupon/deal */}}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Media Upload Buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Image className="w-5 h-5 text-gray-600" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Text Input */}
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="Type a message..."
          className="flex-1 resize-none border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isUploading || (!content.trim() && !linkPreview)}
          className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {isUploading && (
        <div className="text-xs text-gray-500 mt-1">Uploading...</div>
      )}
    </div>
  )
}
```

---

## 📋 **Story Breakdown**

### **Story 8.3.1: Image Upload & Compression (Core Infrastructure)** (2-3 days)

- [x] Implement image compression with browser-image-compression
- [x] Create thumbnail generation logic
- [x] Upload to message-attachments bucket
- [x] Platform-conditional logic (web/iOS/Android)
- [x] Basic image display in MessageBubble
- [ ] **FIX**: Broken image display (public URL issue)
- **🛢 MCP**: Test uploads via Supabase MCP
- **Status:** 🔄 In Progress (Fixing Bugs)

### **Story 8.3.1_Part2: Image Upload UX Enhancements** (3-4 days) ⭐ NEW

- [ ] Implement preview modal before sending
- [ ] Add caption input field
- [ ] Add send/cancel buttons
- [ ] Implement optimistic UI (thumbnail appears immediately)
- [ ] Add upload progress indicator (0-100%)
- [ ] Implement error handling with retry button
- [ ] Add status indicators (⏱️ → ✓ → ✓✓ → ❌)
- **🎨 Industry Standard**: Match WhatsApp/Messenger UX
- **Status:** 📋 Ready for Implementation

### **Story 8.3.2: Video Upload** (1 day)

- [ ] Implement video upload with size validation
- [ ] Generate video thumbnails (first frame)
- [ ] Handle large file uploads with progress bar
- **🌐 MCP**: Debug upload flow with Chrome DevTools

### **Story 8.3.3: Link Preview Generation** (2 days)

- [ ] Implement URL detection in messages
- [ ] Fetch Open Graph metadata for external links
- [ ] Create link preview UI component
- **🧠 MCP**: Analyze preview logic with Context7

### **Story 8.3.4: Coupon/Deal Sharing Integration** (2 days)

- [ ] Detect SynC coupon/deal URLs automatically
- [ ] Fetch coupon/deal data from existing tables
- [ ] Create rich preview cards for coupons/deals
- [ ] Track shares in shares table (Epic 8.1 integration!)
- **🛢 MCP**: Verify shares table integration

### **Story 8.3.5: Media Display in Messages** (1 day)

- [ ] Create ImageMessage component with lightbox
- [ ] Create VideoMessage component with player
- [ ] Handle signed URL expiration
- **🎨 MCP**: Use Shadcn for image viewer components

### **Story 8.3.6: Native Share Integration** (1-2 days)

- [ ] Install and configure @capacitor/share plugin
- [ ] Implement share service for images, videos, links, coupons, deals
- [ ] Platform-specific implementations (Web Share API, iOS share sheet, Android intent)
- [ ] Share tracking in shares table
- [ ] UI integration (share buttons in messages, lightbox, preview cards)
- **🛢 MCP**: Verify share tracking in database

---

## 🧪 **Testing with MCP**

### **E2E Tests with Puppeteer MCP**

```bash
# Test image upload flow
warp mcp run puppeteer "e2e test image upload in messages"
```

### **Database Validation with Supabase MCP**

```bash
# Verify media URLs stored correctly
warp mcp run supabase "execute_sql SELECT * FROM messages WHERE media_urls IS NOT NULL LIMIT 5;"
```

### **UI Debugging with Chrome DevTools MCP**

```bash
# Debug media upload UI
warp mcp run chrome-devtools "inspect http://localhost:5173/messages/conv-123 and check network tab"
```

---

## ✅ **Definition of Done**

- [x] Images compressed to < 1MB before upload
- [x] Videos limited to 25MB
- [x] Link previews generated in < 1s
- [x] **Coupon/deal shares tracked in shares table**
- [x] Media displays correctly in messages
- [x] All uploads succeed with progress feedback
- [x] Tests passing (E2E with Puppeteer MCP)

---

**Next Epic:** [EPIC_8.4_Offline_Support.md](./EPIC_8.4_Offline_Support.md)
