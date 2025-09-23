# 🛍️ Product Catalog Testing Guide

## 🚀 **Story 4.2 - Product Catalog Management**

This guide covers testing the new Product Catalog Management system added to your SynC app.

---

## 📋 **What We Built**

### **Core Components:**
- ✅ **ProductManager** - Main catalog management interface
- ✅ **ProductManagerPage** - Navigation wrapper with breadcrumbs
- ✅ **ProductForm** - Create/edit product form with image upload
- ✅ **ProductCard** - Display individual products (grid/list view)

### **Backend Integration:**
- ✅ **useProducts** - Custom hook for product CRUD operations
- ✅ **TypeScript types** - Complete product type definitions
- ✅ **Database integration** - Uses existing `business_products` table

### **Navigation Integration:**
- ✅ **Router integration** - New route: `/business/:businessId/products`
- ✅ **Business Dashboard** - "Manage Products" button on each business card
- ✅ **Business Profile** - "Products" button in header for owners

---

## 🧪 **Testing Checklist**

### **1. Access Product Catalog (5 minutes)**

#### **From Business Dashboard:**
- [ ] Go to `/business/dashboard`
- [ ] Find a business you own
- [ ] Click "Manage Products" blue button
- [ ] Verify you're redirected to `/business/{id}/products`

#### **From Business Profile:**
- [ ] Go to `/business/{your-business-id}`
- [ ] Look for "Products" button in header (only visible to owners)
- [ ] Click the Products button
- [ ] Verify navigation to product catalog

### **2. Product Catalog Interface (10 minutes)**

#### **Initial Load:**
- [ ] Catalog loads without errors
- [ ] Shows business name in header
- [ ] Displays stats cards (Total Products, Available, Featured, Categories)
- [ ] Shows "Add Product" button for owners

#### **Search & Filters:**
- [ ] Search bar works for product names
- [ ] Filter panel toggles open/closed
- [ ] View mode toggle (grid/list) works
- [ ] All filters work when products exist

### **3. Create New Product (15 minutes)**

#### **Basic Product Creation:**
- [ ] Click "Add Product" button
- [ ] Form modal opens properly
- [ ] Fill in required fields:
  - Product name: "Test Product"
  - Description: "A test product for catalog"
  - Category: Select from dropdown
  - Price type: "Fixed Price"
  - Price: 29.99
- [ ] Set availability and featured toggles
- [ ] Click "Create Product"
- [ ] Verify product appears in catalog

#### **Image Upload:**
- [ ] Upload 1-2 product images
- [ ] Images preview correctly
- [ ] Can remove images before saving
- [ ] Final product shows images

#### **Advanced Features:**
- [ ] Try different price types (Starting From, Range, Contact)
- [ ] Test category dropdown and custom category input
- [ ] Set display order (lower numbers first)
- [ ] Enable/disable featured status

### **4. Product Management (15 minutes)**

#### **Edit Product:**
- [ ] Click three-dots menu on a product
- [ ] Select "Edit Product"
- [ ] Modify product details
- [ ] Save changes
- [ ] Verify updates appear immediately

#### **Delete Product:**
- [ ] Use three-dots menu to delete
- [ ] Confirm deletion in popup
- [ ] Verify product disappears from catalog

#### **View Modes:**
- [ ] Switch between grid and list views
- [ ] Verify both views show product info correctly
- [ ] Check responsive design on mobile

### **5. Search & Filtering (10 minutes)**

#### **Search Functionality:**
- [ ] Search by product name
- [ ] Search by description keywords
- [ ] Verify results filter correctly
- [ ] Test empty search results

#### **Filter Options:**
- [ ] Filter by category
- [ ] Filter by availability (Available/Unavailable)
- [ ] Filter by featured status
- [ ] Clear all filters
- [ ] Combine multiple filters

### **6. Navigation & Breadcrumbs (5 minutes)**

#### **Navigation:**
- [ ] Breadcrumb navigation works (Home → Businesses → BusinessName → Products)
- [ ] Back button returns to business profile
- [ ] All navigation links clickable

#### **Error Handling:**
- [ ] Try accessing products for business you don't own
- [ ] Access non-existent business ID
- [ ] Verify proper error messages and redirects

---

## 🐛 **Common Issues & Solutions**

### **Images Not Uploading:**
- Check Supabase storage bucket permissions
- Verify `business-assets` bucket exists
- Ensure file sizes are under 10MB

### **Database Errors:**
- Run the business tables migration
- Check RLS policies are active
- Verify user authentication

### **Navigation Issues:**
- Check if user owns the business
- Verify business ID in URL is valid
- Ensure user is logged in

---

## 🚀 **Success Criteria**

### **✅ Must Work:**
- [ ] Product creation with all fields
- [ ] Product editing and deletion
- [ ] Image upload and management
- [ ] Search and filtering
- [ ] Navigation between pages
- [ ] Proper error handling

### **✅ Should Work:**
- [ ] Responsive design on mobile
- [ ] Fast loading and smooth animations
- [ ] Intuitive user interface
- [ ] Proper form validation

### **✅ Nice to Have:**
- [ ] Multiple image uploads
- [ ] Category suggestions
- [ ] Bulk operations
- [ ] Advanced sorting options

---

## 📊 **Database Schema Reference**

### **business_products Table:**
```sql
- id (UUID, Primary Key)
- business_id (UUID, Foreign Key)
- name (VARCHAR, Required)
- description (TEXT, Optional)
- category (VARCHAR, Optional)
- price (DECIMAL, Optional)
- currency (VARCHAR, Default: INR)
- price_type (ENUM: fixed, starting_from, range, contact)
- is_available (BOOLEAN, Default: true)
- is_featured (BOOLEAN, Default: false)
- display_order (INTEGER, Default: 0)
- image_urls (TEXT[], Array of image URLs)
- video_url (TEXT, Optional)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## 🎯 **Next Steps After Testing**

### **If Everything Works:**
- ✅ Product Catalog system is ready for production
- ✅ Move to next Epic 4 story (Coupon System, Search & Discovery, or GPS Check-in)

### **If Issues Found:**
- 🐛 Document specific errors
- 🔧 Fix critical issues first
- 🧪 Re-test affected functionality
- ✅ Mark as complete when stable

---

## 💡 **Tips for Testing**

1. **Test with Multiple Businesses** - Create products for different businesses
2. **Use Different Image Formats** - PNG, JPG, WEBP
3. **Test Edge Cases** - Very long names, special characters
4. **Mobile Testing** - Check responsive design
5. **Performance Testing** - Upload multiple images, create many products

**Your SynC app now has a complete Product Catalog Management system! 🎉**