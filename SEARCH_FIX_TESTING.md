# Search Query Timing Fix - Testing Guide

## Issue Fixed
Fixed the issue where search queries were using stale state values, causing searches to be performed with incomplete query strings (e.g., typing "coffee" would search for "coffe").

## The Fix
Modified `setQuery` function in `useSearch.ts` to pass the fresh query value directly to `performSearch`, avoiding React's stale closure issue.

## Testing Steps

### 1. Setup Test Data (if not already done)
1. Open your Supabase SQL editor
2. Run the SQL script in `create-basic-test-data.sql`
3. This will create test businesses and coupons for "pizza", "coffee", and "burger"

### 2. Navigate to Search Page
Open your browser and go to: `http://localhost:5173/search`

### 3. Automated Testing (Recommended)
1. Open browser developer console (F12)
2. Copy and paste this test script:

```javascript
// Automated test for search query timing
function testSearchFix() {
    console.log('🧪 Testing Search Query Fix');
    
    const searchInput = document.querySelector('input[type="text"]') || 
                       document.querySelector('input[placeholder*="Search"]');
    
    if (!searchInput) {
        console.error('❌ Search input not found');
        return;
    }
    
    // Test 1: Type "coffee" gradually
    console.log('\n🧪 Test 1: Gradual typing "coffee"');
    searchInput.value = '';
    searchInput.focus();
    
    const testQuery = 'coffee';
    let charIndex = 0;
    
    const typeChar = () => {
        if (charIndex < testQuery.length) {
            const currentText = testQuery.substring(0, charIndex + 1);
            searchInput.value = currentText;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log(`📝 Typed: "${currentText}"`);
            charIndex++;
            setTimeout(typeChar, 150);
        } else {
            // Check URL after typing complete
            setTimeout(() => {
                const url = new URL(window.location);
                const searchParam = url.searchParams.get('q');
                console.log(`🔗 Final URL param: "${searchParam}"`);
                if (searchParam === 'coffee') {
                    console.log('✅ Test 1 PASSED: URL matches complete query');
                } else {
                    console.error(`❌ Test 1 FAILED: Expected "coffee", got "${searchParam}"`);
                }
                
                // Test 2: Quick typing
                testQuickTyping();
            }, 1000);
        }
    };
    
    typeChar();
}

function testQuickTyping() {
    console.log('\n🧪 Test 2: Quick typing "pizza"');
    
    const searchInput = document.querySelector('input[type="text"]') || 
                       document.querySelector('input[placeholder*="Search"]');
    
    searchInput.value = '';
    searchInput.focus();
    
    // Type "pizza" quickly
    searchInput.value = 'pizza';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('⚡ Quickly typed: "pizza"');
    
    setTimeout(() => {
        const url = new URL(window.location);
        const searchParam = url.searchParams.get('q');
        console.log(`🔗 Quick typing URL param: "${searchParam}"`);
        
        if (searchParam === 'pizza') {
            console.log('✅ Test 2 PASSED: Quick typing works correctly');
        } else {
            console.error(`❌ Test 2 FAILED: Expected "pizza", got "${searchParam}"`);
        }
        
        console.log('\n🎉 All tests completed!');
    }, 1000);
}

// Run the test
testSearchFix();
```

### 4. Manual Testing
1. **Type slowly**: Type "coffee" character by character with pauses
   - ✅ Expected: URL should update to `?q=coffee` when complete
   - ✅ Expected: Should show coffee-related results
   
2. **Type quickly**: Clear input and quickly type "pizza"
   - ✅ Expected: URL should show `?q=pizza`
   - ✅ Expected: Should show pizza-related results
   
3. **Test backspace**: Type "burger" then backspace to "burg"
   - ✅ Expected: Search should update to show partial results or no results

### 5. Browser Network Tab Verification
1. Open Network tab in DevTools
2. Type a search query
3. ✅ Expected: Should see search API calls with the complete query string
4. ❌ Before fix: Would see API calls with incomplete query strings

### 6. Console Output Verification
Look for these console messages:
- `🔍 [useSearch] setQuery called with: [your query]`
- `🔍 [useSearch] Triggering immediate search with query: [your query]`
- No error messages about search failures

## Expected Behavior After Fix
- **URL Parameters**: Always match the complete typed query
- **Search Results**: Show results for the complete query, not partial text
- **API Calls**: Made with complete query strings
- **No Console Errors**: Related to search state management

## Common Issues to Look For
- **Stale Query**: If URL shows incomplete query (old bug)
- **No Results**: Could indicate test data not seeded properly
- **Multiple API Calls**: Excessive calls due to rapid state updates
- **Console Errors**: Any JavaScript errors in the search process

## Rollback If Needed
If the fix causes issues, revert changes to `useSearch.ts` line 260-283 to the previous version.