# 🧪 Friend System Testing Guide

The RLS policies have been fixed! Now let's test to make sure everything works.

## **Test 1: Send Friend Request** ✅

1. Open your app: `http://localhost:5173`
2. Click on the **Friends** or **Contacts** button to open the sidebar
3. Click **"Find Friends"** button
4. Search for a user (type a name or email)
5. Click the **"Add"** button next to a user

**Expected Result:** 
- ✅ NO "Failed to send friend request" error
- ✅ Button changes to "Sending..." then "Sent ✓"
- ✅ User disappears from search results
- ✅ Success haptic feedback

**If it fails:** Check browser console (F12) for specific error messages

---

## **Test 2: View Friend Requests** ✅

1. In the friends sidebar, click **"Requests"** button
2. You should see pending friend requests

**Expected Result:**
- ✅ Requests are visible
- ✅ Shows requester profile information
- ✅ Accept/Decline buttons are available

---

## **Test 3: Accept Friend Request** ✅

1. In the Friend Requests modal, click **"Accept"** on a pending request
2. Wait for the operation to complete

**Expected Result:**
- ✅ Button shows "Processing..." then completes
- ✅ Request disappears from pending list
- ✅ User appears in friends list
- ✅ Success haptic feedback

---

## **Test 4: View Friends List** ✅

1. Close any modals and check the main friends list
2. The accepted friend should appear in your friends list

**Expected Result:**
- ✅ Friend appears in the list
- ✅ Shows online/offline status
- ✅ Action buttons (Share, Message, Remove) work

---

## **Debugging Tips**

If any test fails:

### **Check Browser Console:**
1. Press `F12` to open Developer Tools
2. Go to **Console** tab
3. Look for error messages
4. Take note of the specific error

### **Common Issues & Solutions:**

**"Failed to send friend request"**
- ✅ Should be FIXED now with RLS policy updates

**"403 Forbidden"** 
- RLS policy issue - run the RLS fix again

**"409 Conflict"**
- Duplicate request - this is normal if request already exists

**"Function not found"**
- Missing database function - run the minimal core fix again

**Network errors**
- Check if your dev server is running (`npm run dev`)
- Verify Supabase connection

---

## **Report Results**

After testing, please report:

✅ **Working:** "Friend system is now working perfectly!"  
❌ **Still broken:** Specific error message from console + which test failed

---

## **Expected Success Message:**

If everything works, you should be able to:
1. ✅ Send friend requests without errors
2. ✅ See pending requests 
3. ✅ Accept requests successfully
4. ✅ View friends in the main list
5. ✅ Use friend features (share, message, etc.)

**The friend system should now be fully functional!** 🚀