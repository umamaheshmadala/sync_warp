# Product Listing Redesign - Clarification Q&A

**Status**: ✅ Complete  
**Last Updated**: 2026-02-03  
**Total Questions**: 88  

---

## Reference Screenshot

![Instagram Post Layout](file:///C:/Users/umama/.gemini/antigravity/brain/bf5d8738-4839-4347-a0aa-952e58ac5461/uploaded_media_1770112683761.png)

---

## Section 1: Image & Aspect Ratio

| # | Question | User Answer | Recommendation | Final Decision |
|---|----------|-------------|----------------|----------------|
| 1 | Instagram uses **4:5 aspect ratio (1080×1350px)** for portrait photos. Should we adopt this exact ratio? | ✅ Yes | Agreed - industry standard | **4:5 (1080×1350px)** |
| 2 | For letterboxing fallback (landscape images with padding), background color? | Gray close to black | `#1a1a1a` or `#0d0d0d` would work well | **Dark gray (#1a1a1a)** |

---

## Section 2: Removing Price & Category

| # | Question | User Answer | Recommendation | Final Decision |
|---|----------|-------------|----------------|----------------|
| 3 | If we remove **price**, how will customers know the cost? | Contact business for pricing | Add subtle "Contact for Price" label? Or leave completely blank? | **No price field; contact business** |
| 4 | If we remove **category**, how will products be organized? | Business is searchable; product names identify category | ✅ Agreed - search indexes product names | **Remove category; rely on search** |

---

## Section 3: Social Features (Like, Comment, Share, Favorite)

| # | Question | User Answer | Recommendation | Final Decision |
|---|----------|-------------|----------------|----------------|
| 5 | Are **comments public** to all users? | ✅ Yes, public | — | **Public comments** |
| 6 | Should there be **moderation** for comments? | No moderation; use appeal/report system like Reviews | Reuse existing `content_appeals` table and workflow. If needed, create a dedicated table for the comments. | **Appeal system (reuse Reviews module)** |
| 7 | **Share** platforms? | Reuse existing share component (storefront, offers) | — | **Reuse existing share sheet** |
| 8 | Add **Save/Bookmark** feature? | No bookmark; use **Favorites** button | Favorites = user can access from "My Favorites" section | **Favorites (like products)** |

---

## Section 4: Tags

| # | Question | User Answer | Recommendation | Final Decision |
|---|----------|-------------|----------------|----------------|
| 9 | Proposed tag list acceptable? | ✅ Yes, all approved | — | **See approved list below** |

### Approved Tags List

| Tag | Emoji | Color | Description |
|-----|-------|-------|-------------|
| Available | 🟢 | Green | In stock, ready to ship/pickup |
| Featured | ⭐ | Gold | Highlighted product (replaces toggle) |
| Hot | 🔥 | Orange/Red | Trending or best-seller |
| New Arrival | 🆕 | Blue | Recently added |
| Pre-Order | 📦 | Purple | Not yet available, accepting orders |
| Back Order | ⏳ | Yellow | Out of stock, order for later delivery |
| Low Stock | ⚠️ | Amber | Very few items remaining |
| Sale | 🏷️ | Red | On discount/promotion |
| Sold Out | ❌ | Gray | No longer available (read-only) |

---

## Section 5: Technical

| # | Question | User Answer | Recommendation | Final Decision |
|---|----------|-------------|----------------|----------------|
| 10 | For mobile, use **native image picker** with cropping? | ✅ Yes, always native | Use Capacitor plugins | **Native image picker + cropper** |
| 11 | **Existing products** with price/category data? | Hide or delete; dev phase, doesn't matter | ✅Hide from UI, keep in DB for now | **Hide fields; migrate later** |

---

## Section 6: Comments System (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 12 | Should comments support **nested replies** (threaded) or be **flat**? |✅ | ✅ **Flat** (like Instagram) - simpler UX |
| 13 | **Character limit** for comments? |✅ | ✅ **300 characters** (same as description) |
| 14 | Can users **edit/delete** their own comments? |✅ | ✅ **Yes** - with "Edited" indicator |
| 15 | Should comments be **paginated**? How many per load? |✅ | ✅ **Yes** - 10 initially, "Load more" button |

---

## Section 7: Likes & Favorites (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 16 | Show **like count** publicly (e.g., "24 likes")? | ✅| ✅ **Yes** - social proof drives engagement |
| 17 | Show **who liked** ("Liked by John and 23 others")? |✅ | ✅ **Yes**  only show the list of friends who liked it. The people who are not friends must be hidden. |
| 18 | **Notifications** when someone likes/comments on your product? |Yes** - business owner gets in-app notification. There must be a possibility to enable or disable it on the product modal with the toggle button. If the business owner does not want the in-app notifications of that particular product, he must be able to disable it in the product modal so that the in-app notifications about the other products of his business will not be affected | ✅ **Yes** - business owner gets in-app notification.|

---

## Section 8: Tags Behavior (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 19 | Who sets tags? **Business owner manually** or **auto-generated**? |✅  | ✅ **Manual** by owner; "New Arrival" auto-expires after 14 days |
| 20 | Can **multiple tags** be applied to one product? |✅  | ✅ **Yes** - e.g., "Featured" + "Low Stock" |
| 21 | Should **"Sold Out"** auto-hide product from storefront? |✅  | ✅ **No** - keep visible but grayed out |

---

## Section 9: Product Lifecycle (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 22 | Is there a **Draft mode** (save without publishing)? |✅  | ✅ **Yes** - especially for interrupted mobile uploads |
| 23 | Can products be **archived** (hidden but not deleted)? |✅  | ✅ **Yes** - soft delete pattern |
| 24 | **Edit existing product**: Can images be reordered/removed/added after publish? |✅  | ✅ **Yes** - full editing like Instagram |

---

## Section 10: Carousel/Multi-Image UX (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 25 | Show **dot indicators** for multi-image carousel? |✅  | ✅ **Yes** - pagination dots at bottom |
| 26 | On web, show **thumbnail strip** below main image? |✅  | ✅ **No** - dots only (cleaner, like Instagram) |
| 27 | **Swipe or arrows** on web to navigate images? | ✅ | ✅ **Both** - swipe + hover arrows |

---

## Section 11: Description & Formatting (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 28 | Support **@mentions** (tag other businesses)? |✅  | ✅ **No** initially - can add later |
| 29 | Support **#hashtags**? |✅  | ✅ **No** - we have tags system |
| 30 | **Auto-link URLs** in description? |✅  | ✅ **Yes** - clickable links |

---

## Section 12: Discovery & Feed (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 31 | Products appear **only on business storefront** or also in **global explore feed**? |    ✅  | ✅ **Storefront only** initially; Explore can be Phase 2 |
| 32 | **"Featured" products** appear on business **Overview tab**? |✅  | ✅ **Yes** (you confirmed this earlier) |

---

## Section 13: Mobile Two-Step Flow Edge Cases (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 33 | Can user **go back** from Step 2 to Step 1 to re-edit images? |✅ | ✅ **Yes** - back button, preserve selections |
| 34 | **Auto-save draft** between steps? |✅ | ✅ **Yes** - prevent data loss if app closes |
| 35 | If app is killed mid-upload, **resume upload** on reopen? |✅ | ✅ **Phase 2** - nice to have |

---

## Section 14: Existing Data Migration (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 36 | Products with **landscape images** already uploaded - what happens? | ✅ | ✅ **Grandfather them** - new uploads enforce ratio |

---

## ✅ CONFIRMED ANSWERS (Sections 1-14)

All questions 1-36 have been answered. Key custom answers noted:

| # | Question | Your Custom Answer |
|---|----------|--------------------|
| 17 | Show who liked? | **Yes** - but only show friends who liked. Non-friends hidden. |
| 18 | Notifications toggle? | **Yes** - Per-product toggle in product modal to disable notifications |

---

## 🆕 Section 15: Friends System (NEW - Please Answer)

> ⚠️ You mentioned "only show friends who liked" in Q17. We need to clarify the friends system.

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 37 | Does SynC have a **friends/connections system**? Or did you mean "followers"? | There will be only friend requests and friend connections. Not following system among users, the user will be able to follow only the business. A user cannot follow the user; he can only friend them. | Clarify: Users who follow each other = friends? Or explicit friend requests? |
| 38 | If friends = mutual followers, how do we determine this? | There is no mutual fall of concept at all. | Check if User A follows User B AND User B follows User A |
| 39 | If no friends system exists, should we **build one** or **skip this feature**? | Friendship system already exists. Check the code. | **Skip for now** - show like count only, not names |

---

## 🆕 Section 16: Per-Product Notification Toggle (NEW - Please Answer)

> ⚠️ You want a per-product notification toggle. Need clarity on scope.

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 40 | Toggle **disables notifications for which events**? (Likes, Comments, or Both) | ✅  | **Both** - single toggle for all activity on that product |
| 41 | Where exactly in the product modal should the toggle appear? | ✅  | Bottom of modal, near tags section, subtle design |
| 42 | Should there also be a **global toggle** to disable all product notifications? | ✅  | **No** - per-product is sufficient for now |

---

## 🆕 Section 17: Image Upload Technical (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 43 | **Max file size** per image? | ✅ | **10 MB** per image (Instagram allows 30MB but we can be stricter) |
| 44 | **Supported formats**? (JPEG, PNG, HEIC, WebP) | ✅ | **All four** - HEIC important for iPhone users |
| 45 | Show **upload progress** indicator? | ✅ | **Yes** - percentage or progress bar |
| 46 | If upload fails, **auto-retry** or show error? | ✅ | **Show error** with retry button |
| 47 | **Compress images** before upload to save bandwidth? | ✅ | **Yes** - client-side compression to ~1MB max |

---

## 🆕 Section 18: Cropping Tool Details (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 48 | Should cropping tool have **zoom controls** (pinch to zoom)? | ✅ | **Yes** - standard UX |
| 49 | Should cropping tool have **rotation** (90° or free)? | ✅ | **90° rotation only** - simpler |
| 50 | Lock to **4:5 aspect ratio only** or allow other ratios? | ✅ | **Lock to 4:5** - platform consistency |
| 51 | Show **grid overlay** (rule of thirds) during crop? | ✅ | **Yes** - helps composition |

---

## 🆕 Section 19: Comments Deep Dive (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 52 | Must user be **logged in** to comment? | ✅ | **Yes** - no anonymous comments |
| 53 | Can **business owner pin** a comment to top? | ✅ | **No** for now - keep simple |
| 54 | When someone replies, does **original commenter get notified**? | ✅ | **Yes** - in-app notification |
| 55 | Can business owner **hide/delete** any comment on their product? | ✅ | **Yes** - owner moderation power |

---

## 🆕 Section 20: Favorites Access (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 56 | Where does **"My Favorites"** page live in the app? | There is a dedicated favourites page. Check the code. | Profile menu → My Favorites |
| 57 | Can user **organize favorites** into collections/folders? | There is a dedicated power at stage, and we don't have to worry about it now. | **No** for now - single list |
| 58 | Are favorites **private** (only visible to user) or public? | favorites page is private to the user. | **Private** - personal list |

---

## 🆕 Section 21: Tags Selection UI (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 59 | **UI for selecting tags**: Dropdown, Checkboxes, or Pill buttons? |  ✅ | **Pill buttons** - visual and tappable |
| 60 | **Max number of tags** per product? | ✅  | **3 tags** max to avoid clutter |
| 61 | Are some tags **mutually exclusive**? (e.g., "Available" vs "Sold Out") | ✅  | **Yes** - Available/Sold Out/Back Order are mutually exclusive |

---

## 🆕 Section 22: Product Card View (NEW - Please Answer)

> When browsing products grid on storefront (not the modal), what's shown?

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 62 | Product card shows: **Image only** or **Image + Name**? | ✅ | **Image + Name** below |
| 63 | Show **like count** on card or only in modal? | Show the like count, comments count, and share count on the card, and also on the product modal | **Only in modal** - cleaner grid |
| 64 | Show **tags** on card or only in modal? | ✅ | **Only in modal** (as you specified) |
| 65 | Card **aspect ratio** same as image (4:5)? | ✅ | **Yes** - 4:5 cards in grid |

---

## 🆕 Section 23: Product Ordering (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 66 | Default product order in storefront: **Newest first**, **Featured first**, or **Custom order**? | ✅  | **Featured first**, then newest |
| 67 | Can business owner **manually reorder** products? | ✅  | **Phase 2** - nice to have |

---

## 🆕 Section 24: Analytics (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 68 | Track **product views** for business owner insights? | ✅  | **Yes** - basic analytics |
| 69 | Show analytics in **business dashboard** or **product modal**? | The analytics in the business analytics tab of storefront is only for the owner. As of now, the analytics tab is already available.  | **Business dashboard** (separate section) |

---

## 🆕 Section 25: Web Modal Layout Details (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 70 | Image on left is **60% or 70%** of modal width? | ✅ | **65%** - good balance |
| 71 | Right panel scrollable if many comments? | ✅ | **Yes** - scroll within panel |
| 72 | **Close button** position: Top-right corner or X outside modal? | ✅ | **Top-right inside modal** |
| 73 | **ESC key** closes modal on web? | ✅ | **Yes** - standard UX |

---

## 🆕 Section 26: Mobile Modal Behavior (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 74 | Mobile modal: **Full screen** or **Bottom sheet**? | ✅ | **Full screen** - immersive like Instagram |
| 75 | **Swipe down** to close modal? | ✅ | **Yes** - natural gesture |
| 76 | Comments section: **Below image** or **separate tab**? | ✅ | **Below image** - scroll down to see |

---

## 🆕 Section 27: Error States (NEW - Please Answer)

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 77 | If product has **no images**, can it be published? | ✅ | **No** - at least 1 image required |
| 78 | If description is **empty**, can it be published? | ✅ | **Yes** - description optional |
| 79 | If **no tags** selected, can it be published? | ✅ | **Yes** - tags optional |

---

## 🆕 Section 28: Accessibility (NEW - Please Answer)Ok.

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 80 | **Alt text** for product images? | ✅ | **Yes** - use product name as default, allow custom |
| 81 | **Keyboard navigation** for carousel on web? | ✅ | **Yes** - arrow keys |

---

## ✅ SYSTEMS CONFIRMED

I've verified the following systems already exist in the codebase:

| System | Files | Status |
|--------|-------|--------|
| **Friendship** | `friendsService.ts`, `friendsStore.ts`, `types/friends.ts` | ✅ Exists - explicit friend requests, not mutual followers |
| **Favorites** | `FavoritesPage.tsx`, `favoritesService.ts`, `FavoriteProductButton.tsx` | ✅ Exists - private to user |
| **Appeal System** | `content_appeals` table (Reviews module) | ✅ Exists - can reuse for comments |

---

## 🆕 Section 29: Final Implementation Questions (NEW - Please Answer)

> Based on my review, these are the last questions before I can create the EPIC.

| # | Question | Your Answer | My Recommendation |
|---|----------|-------------|-------------------|
| 82 | **Share count** tracking: Do we track how many times a product was shared? | ✅ | **Yes** - increment counter each time shared |
| 83 | For Q63, you said show likes/comments/shares on **card AND modal**. Confirm: the card in the grid will show all 3 counts below the image? | Okay, let us change this to Instagram model. We will not be showing likes, shares, and comments in the grid. | Please confirm - this differs from Instagram which only shows counts in post view |
| 84 | **Default tag** for new products: Auto-assign "New Arrival" or no default? | ✅ | **Auto-assign "New Arrival"** - removes after 14 days |
| 85 | When creating a new product, are **all images uploaded first, then metadata saved**? Or **save as you go**? | ✅ | **Upload all images first** (Step 1), then save metadata (Step 2) |
| 86 | **Product name** character limit? | ✅ | **100 characters** max |
| 87 | **Minimum image count**: Is 1 image required or can we have 0? | ✅ | **1 required** (you confirmed at Q77) |
| 88 | For existing products without tags, what's the **default display state**? | ✅ | **"Available"** assumed if no tag set |

---

## 🔍 Logical Review Notes

### ✅ Acceptable Answers
All your answers are logical and consistent. Key decisions confirmed:

1. **Friends (not followers)** for user-to-user connections ✅
2. **Favorites page exists** - no new work needed ✅
3. **Social counts on cards** - unique design choice (differs from Instagram) ✅
4. **Per-product notification toggle** - good UX for high-volume businesses ✅

### ⚠️ Minor Clarification Needed
| # | Item | Note |
|---|------|------|
| 57 | "dedicated power at stage" | I couldn't understand this phrase. Did you mean "dedicated page is already there"? I'll proceed assuming collections are not needed for now. |
| 63 | Counts on card | Instagram only shows counts in the modal/post view, not on the grid cards. Your approach shows counts on both. This is a valid design choice that increases engagement visibility, but may clutter the grid slightly. Please confirm. |

---

## Next Steps

Once questions 82-88 are answered:
1. ✅ Finalize this document
2. 📝 Create EPIC document (`EPIC_12_Instagram_Style_Products.md`)
3. 📋 Break into detailed Stories with acceptance criteria

---

## Instructions

For questions 37-81:
- Type ✅ to accept my recommendation
- Type your own answer if you prefer something different
- Leave blank if unsure (I'll use my recommendation)
