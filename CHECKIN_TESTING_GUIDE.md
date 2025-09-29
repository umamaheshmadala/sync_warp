# GPS Check-in System Testing Guide 🧪

## Quick Start

Your development server is running at: **http://localhost:5174**

## Test URLs

### 🔬 Comprehensive Test Suite (Recommended)
```
http://localhost:5174/debug/checkins/test
```
This loads the full test suite with 7 different test categories.

### 👥 User Check-in Interface
```
http://localhost:5174/checkins
```
The main user interface for discovering and checking into nearby businesses.

## Testing Steps

### 1. **Open the Test Suite** 🎯
   - Navigate to: `http://localhost:5174/debug/checkins/test`
   - You should see "Check-in System Test Suite" with a "Run All Tests" button

### 2. **Grant Location Permissions** 📍
   - Click "Run All Tests"
   - Your browser will prompt for location access - click "Allow"
   - The test will use your real GPS location

### 3. **Watch the Test Results** ✅
   The test suite will automatically run these tests:
   
   - ✅ **Location Permission** - Verifies GPS access
   - ✅ **GPS Accuracy Check** - Tests location precision
   - ✅ **Nearby Businesses Discovery** - Finds businesses within 2km
   - ✅ **Distance Calculation** - Tests Haversine formula accuracy
   - ✅ **Check-in Validation** - Verifies proximity requirements
   - ✅ **Rewards System** - Tests points and achievements
   - ✅ **Database Integration** - Checks Supabase connectivity

### 4. **Test the Rewards System** 🏆
   - Click "Show Rewards Test" to see the gamification interface
   - View points, achievements, and level progression

### 5. **System Information** 📊
   Check the info cards at the bottom:
   - **Location Status**: Permission and accuracy
   - **Nearby Businesses**: Discovery results
   - **User Check-ins**: Database connections

## Testing Scenarios

### Scenario A: Urban Area Testing
- If you're in a city, you should see multiple nearby businesses
- Check-ins should be possible for businesses within 100 meters
- GPS accuracy should be "Excellent" (±50m or better)

### Scenario B: Suburban Testing  
- Fewer businesses but still discoverable within 2km radius
- Distance calculations should be accurate
- May see "Good" GPS accuracy (±100m)

### Scenario C: Mock Location Testing
The test suite includes pre-defined scenarios:
- **New York City** - Dense urban area
- **Los Angeles** - Suburban spread
- **Denver** - Remote area testing
- **San Francisco** - Edge case testing

## What to Look For

### ✅ **Success Indicators**
- All 7 tests show green checkmarks
- Location coordinates displayed in header
- Nearby businesses found (if any exist)
- Distance calculations accurate within 10m
- Database connections successful

### ❌ **Issues to Report**
- Red error indicators on any test
- Location permission denied
- Poor GPS accuracy (>200m)
- Database connection failures
- JavaScript errors in browser console

## Troubleshooting

### Location Issues
- Make sure you're not using a VPN
- Try refreshing and allowing location again
- Check browser location settings
- Test on a different device/browser

### No Nearby Businesses
- This is normal in rural areas
- The test will still validate core functionality
- Distance calculations will work with test coordinates

### Performance Issues
- Check browser console for errors
- Ensure stable internet connection
- Try clearing browser cache

## Advanced Testing

### Manual GPS Testing
1. Go to `http://localhost:5174/checkins`
2. Allow location access
3. Wait for nearby businesses to load
4. Try to check into a nearby location (within 100m)

### Analytics Testing
- If you have business accounts, check analytics at business routes
- View check-in statistics and charts

## Test Results Interpretation

### GPS Accuracy Ratings
- **5-50m**: Excellent (urban/indoor)
- **51-100m**: Good (typical outdoor)
- **101-200m**: Acceptable
- **200m+**: Poor (may affect check-ins)

### Distance Calculation
- Should be accurate within ±10 meters
- Uses Haversine formula for earth curvature
- Test coordinates: NYC to LA ≈ 3,944 km

### Check-in Validation
- Must be within 100 meters of business
- Business must be active status
- Location permission required

## Browser Compatibility

Tested browsers:
- ✅ Chrome (recommended)
- ✅ Firefox  
- ✅ Safari
- ✅ Edge

## Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Verify location permissions are granted
3. Ensure development server is running
4. Check network connectivity to Supabase

---

**Ready to test?** Open http://localhost:5174/debug/checkins/test and click "Run All Tests"! 🚀