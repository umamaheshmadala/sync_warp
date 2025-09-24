# 🎟️ Story 4.3 - Coupon Management System Testing Guide

## 🚀 **Testing Overview**

This guide walks you through testing the complete coupon management system from business creation to user redemption.

---

## 📋 **Pre-Testing Setup**

### **1. Database Verification**
✅ Coupon tables created in Supabase
✅ Dependencies installed (`qrcode`, `@types/qrcode`)
✅ Components ready to import

### **2. Required Data for Testing**
- **Active Business**: You need at least one business you own
- **Test User Account**: For testing user flows
- **Second User** (optional): For testing multi-user scenarios

---

## 🏢 **Business Testing Flow**

### **Phase 1: Access Business Coupon Manager (5 minutes)**

#### **Method 1: From Business Dashboard**
1. Go to `/business/dashboard`
2. Find a business you own
3. Look for **"Manage Coupons"** button (should be added)
4. Click to navigate to coupon management

#### **Method 2: From Business Profile**
1. Go to `/business/{your-business-id}`
2. Look for **"Coupons"** button in header (for owners)
3. Click to access coupon system

#### **Method 3: Direct URL** (fallback)
1. Navigate to `/business/{your-business-id}/coupons`
2. Should load coupon management interface

### **Phase 2: Create Your First Coupon (10 minutes)**

#### **Basic Coupon Creation:**
1. **Click "Create Coupon"** button
2. **Step 1 - Basic Info:**
   - Title: "Test 20% Off"
   - Description: "Get 20% off your first purchase"
   - Category: "Shopping"
   - Click "Next"

3. **Step 2 - Discount Setup:**
   - Type: "Percentage Discount"
   - Value: 20
   - Minimum Purchase: 100
   - Maximum Discount: 50
   - Click "Next"

4. **Step 3 - Terms & Conditions:**
   - Add terms: "Valid for in-store purchases only"
   - Usage Limit: 100 (total uses)
   - Per User Limit: 1
   - Click "Next"

5. **Step 4 - Schedule:**
   - Valid From: Today
   - Valid Until: 30 days from now
   - Target Audience: "All Users"
   - Click "Create Coupon"

#### **Expected Result:**
- Coupon appears in your coupon list
- Status shows "Active"
- Coupon code is auto-generated

### **Phase 3: Test Coupon Management (10 minutes)**

#### **Edit Coupon:**
1. Find your test coupon
2. Click three-dots menu → "Edit"
3. Modify title to "Test 25% Off"
4. Change discount to 25%
5. Save changes
6. Verify updates appear immediately

#### **Coupon Status Management:**
1. Toggle coupon status (Active ↔ Paused)
2. Verify status changes in real-time
3. Test that paused coupons don't appear in public listings

#### **View Analytics:**
1. Click "Analytics" on your coupon
2. Verify analytics dashboard opens
3. Check that initial metrics show zeros
4. Note the performance insights section

### **Phase 4: Advanced Coupon Types (10 minutes)**

#### **Fixed Amount Coupon:**
1. Create new coupon
2. Type: "Fixed Amount"
3. Value: ₹50
4. Test creation and preview

#### **Buy X Get Y Coupon:**
1. Create new coupon
2. Type: "Buy X Get Y"
3. Buy 2, Get 1 free
4. Test creation process

---

## 👥 **User Testing Flow**

### **Phase 5: Coupon Discovery (10 minutes)**

#### **Browse Available Coupons:**
1. **Access Method**: Direct component test or via navigation
2. **Expected Components**: CouponBrowser should load
3. **Test Search:**
   - Search for your business name
   - Search for "20% off"
   - Verify filtering works

#### **Filter Testing:**
1. **Category Filter**: Filter by "Shopping"
2. **Sort Options**: Test "Popular", "Newest", "Expiring Soon"
3. **Business Filter**: Search by your business name
4. **Verify Results**: Should show your test coupons

#### **Coupon Collection:**
1. **Find Your Test Coupon** in the browser
2. **Click "Collect"** button
3. **Expected**: Toast notification "Added to wallet"
4. **Status Change**: Button should show "Collected"

### **Phase 6: Coupon Wallet Management (10 minutes)**

#### **Access Wallet:**
1. Load CouponWallet component
2. Should show your collected coupons
3. Verify coupon details are correct

#### **Wallet Features:**
1. **Search**: Search for your coupon in wallet
2. **Filter by Status**: "Active", "Expiring", etc.
3. **Sort Options**: Test different sorting
4. **Coupon Details**: Click to view full details

#### **Coupon Status Tracking:**
1. Check expiry countdown
2. Verify status badges (Active, Expiring)
3. Test removal from wallet

### **Phase 7: QR Code Redemption (15 minutes)**

#### **Generate Redemption QR:**
1. **In Wallet**: Click coupon → "Redeem"
2. **Expected**: CouponRedemption modal opens
3. **Verify**: QR code generates successfully
4. **Check**: Verification code is shown
5. **Test**: Privacy toggle (hide/show QR)

#### **QR Code Features:**
1. **Share Function**: Test QR code sharing/download
2. **Verification Code**: Copy to clipboard
3. **Security Notice**: Verify warning messages
4. **Timer**: Check expiry countdown if applicable

#### **Manual Redemption Test:**
1. **Click "Redeem Now"** button (testing mode)
2. **Expected**: Success animation
3. **Database**: Redemption record should be created
4. **Analytics**: Should update business analytics

---

## 📊 **Analytics Testing (10 minutes)**

### **Phase 8: Business Analytics Verification**

#### **After User Interactions:**
1. **Go back to business coupon manager**
2. **Click "Analytics"** on your test coupon
3. **Verify Metrics:**
   - Collections: Should show 1
   - Redemptions: Should show 1
   - Conversion Rate: Should calculate correctly

#### **Analytics Features:**
1. **Performance Insights**: Check AI-generated recommendations
2. **Charts**: Verify daily performance chart
3. **Conversion Funnel**: Check Views → Collections → Redemptions
4. **User Segments**: Verify user breakdown
5. **Collection Sources**: Check source tracking

---

## 🔧 **Integration Testing**

### **Phase 9: Component Integration (15 minutes)**

#### **Navigation Testing:**
1. **Business Dashboard** → Coupon Manager
2. **Business Profile** → Coupon Management
3. **Coupon Manager** → Analytics
4. **Back Navigation**: Verify all back buttons work

#### **State Management:**
1. **Create Coupon** → Should appear in list immediately
2. **Edit Coupon** → Changes reflect across components
3. **Status Changes** → Real-time updates
4. **User Collection** → Wallet updates immediately

#### **Error Handling:**
1. **Invalid Dates**: Try creating coupon with end date before start date
2. **Invalid Values**: Try negative discount values
3. **Missing Fields**: Submit form with required fields empty
4. **Network Issues**: Test with slow connection

---

## 🐛 **Common Issues & Solutions**

### **Database Issues:**
- **Error**: `relation "business_coupons" does not exist`
- **Solution**: Re-run the SQL migration in Supabase

### **Import Issues:**
- **Error**: `Cannot resolve module '@/components/coupon'`
- **Solution**: Verify index.ts file exists in src/components/coupon/

### **QR Code Issues:**
- **Error**: `Cannot find module 'qrcode'`
- **Solution**: Run `npm install qrcode @types/qrcode`

### **Permission Issues:**
- **Error**: `RLS policy violation`
- **Solution**: Ensure you're logged in and own the business

---

## ✅ **Testing Checklist**

### **Business Owner Features:**
- [ ] Create percentage discount coupon
- [ ] Create fixed amount coupon  
- [ ] Create Buy X Get Y coupon
- [ ] Edit existing coupon
- [ ] Toggle coupon status (active/paused)
- [ ] View coupon analytics
- [ ] Delete/cancel coupon

### **User Features:**
- [ ] Browse available coupons
- [ ] Search and filter coupons
- [ ] Collect coupons to wallet
- [ ] View wallet with collected coupons
- [ ] Generate QR code for redemption
- [ ] Share coupon QR codes
- [ ] Manual redemption process

### **Analytics & Reporting:**
- [ ] View collection metrics
- [ ] View redemption statistics  
- [ ] Performance insights generation
- [ ] Daily analytics charts
- [ ] User segment breakdown
- [ ] Collection source tracking

### **Technical Features:**
- [ ] Real-time updates across components
- [ ] Proper error handling
- [ ] Mobile responsive design
- [ ] QR code generation and scanning
- [ ] Database RLS policies working
- [ ] Navigation between components

---

## 🎯 **Success Criteria**

### **Must Work:**
- ✅ Complete coupon creation flow
- ✅ User coupon discovery and collection
- ✅ QR code generation for redemption  
- ✅ Business analytics dashboard
- ✅ All database operations (CRUD)

### **Should Work:**
- ✅ Real-time updates and notifications
- ✅ Advanced filtering and search
- ✅ Mobile-responsive design
- ✅ Error handling and validation

### **Nice to Have:**
- ✅ Smooth animations and transitions
- ✅ Performance insights and recommendations
- ✅ Social sharing capabilities
- ✅ Offline functionality preparation

---

## 🚀 **Next Steps After Testing**

### **If Everything Works:**
- ✅ **Story 4.3 Complete!**
- 📈 Update Epic 4 progress (5/6 stories done)
- 🎯 Move to Story 4.4 (Search & Discovery) or 4.6 (GPS Check-in)

### **If Issues Found:**
1. **Document specific errors** with screenshots
2. **Fix critical issues** first (database, core flows)
3. **Re-test affected functionality**
4. **Verify all integrations** work properly

---

## 💡 **Testing Tips**

1. **Test with Real Data**: Create realistic business scenarios
2. **Multi-Device Testing**: Test on mobile and desktop
3. **User Perspective**: Think like a customer discovering deals
4. **Edge Cases**: Test expiry dates, limits, invalid inputs
5. **Performance**: Monitor load times and responsiveness

**Your SynC app now has a complete coupon ecosystem! 🎉**