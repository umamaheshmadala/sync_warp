# Story 12.14: Analytics Integration - User Testing Guide

## 1. Environment Setup
- Ensure you are logged in as a **Business Owner**.
- Navigate to your **Business Dashboard** -> **Manage Business**.
- Go to the **Products** tab and ensure you have some published products.

## 2. Generate Views
1.  Open the application in a new browser window (Guest/Incognito) or use another account.
2.  Navigate to the same business profile.
3.  Click on a few products to open their **Product Modal**.
4.  Do this for 3-4 different products.
5.  Close and reopen the same products a few times (debounce logic might skip immediate re-opens, but new sessions or refresh will count).

## 3. Generate Engagement
1.  **Like** a product.
2.  **Comment** on a product.
3.  **Share** a product (click Share button).

## 4. Verify Dashboard
1.  Return to the **Business Owner** account.
2.  Go to the **Business Profile** -> **Analytics** tab (Statistics).
3.  Verify the **Product Performance** section appears.
    - **Total Views**: Should reflect the number of times modals were opened.
    - **Total Likes/Comments**: Should match your interactions.
4.  Check **Most Viewed Products** list.
    - The products you clicked should be ranked at the top.
5.  Check **Most Engaging Products** list.
    - The products you Liked/Commented on should be ranked higher.

## 5. Troubleshooting
- If "Total Views" is 0: Wait a moment, or ensure you are not the owner viewing your own products (though logic usually allows owner views to count for debugging, real analytics might filter it if we added that logic - *current implementation counts all views*).
- If "Engagement" is low: Engagement score = Likes + Comments + Shares.
