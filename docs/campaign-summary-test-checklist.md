# Campaign Summary Page - Test Checklist

## Test Date: 2025-10-12
## Tester: [Your Name]

---

## 1. Currency Display Test ✓

### Expected Behavior:
- All monetary values should display in ₹ (Indian Rupees)
- Cost per impression should show ₹2
- Total budget and costs should use INR formatting

### Test Steps:
1. Navigate to Campaign Wizard
2. Complete Step 1 (Basic Information) with a budget (e.g., ₹5000)
3. Complete Step 2 (Targeting) with some filters
4. Go to Step 3 (Campaign Summary)
5. Check the ReachEstimator card

### Verification Points:
- [ ] Estimated Total Cost shows in ₹ (not $)
- [ ] Cost per impression shows ₹2 (not $0.05)
- [ ] Currency format uses Indian numbering (e.g., ₹5,000)

**Result:** _______________
**Notes:** 

---

## 2. Validation Warnings Test ✓

### Expected Behavior:
- Warnings should ONLY appear when NO targeting filters are set
- If ANY targeting filter exists (age, income, driver, activity), no warning

### Test Steps:
1. Go to Campaign Wizard Step 2 (Targeting)
2. **Test Case A - No Filters:**
   - Don't select any filters
   - Navigate to Step 3
   - Check TargetingValidator card
3. **Test Case B - With Filters:**
   - Go back to Step 2
   - Select at least one filter (e.g., age range 25-34)
   - Navigate to Step 3
   - Check TargetingValidator card

### Verification Points:
**Test Case A (No Filters):**
- [ ] Warning appears: "No targeting filters applied - campaign will target all users"
- [ ] Suggestion appears about adding filters

**Test Case B (With Filters):**
- [ ] NO warning about "No targeting filters applied"
- [ ] Only relevant warnings/suggestions based on actual filters

**Result:** _______________
**Notes:** 

---

## 3. Smart Recommendations Test ✓

### Expected Behavior:
- Recommendations should adapt based on current targeting filters
- Different recommendations for different targeting scenarios

### Test Steps:
1. **Scenario A - No Targeting:**
   - Clear all targeting filters
   - Go to Step 3 Summary
   - Check "Smart Recommendations" card
   - Note the "Personalized for Your Business" recommendation

2. **Scenario B - Only Age Targeting:**
   - Go back to Step 2
   - Select only age ranges (e.g., 25-34, 35-44)
   - Go to Step 3 Summary
   - Check if recommendations suggest adding income filters

3. **Scenario C - Age + Income Targeting:**
   - Go back to Step 2
   - Keep age ranges, add income levels (e.g., middle, upper_middle)
   - Go to Step 3 Summary
   - Check if recommendations suggest adding activity score

### Verification Points:
**Scenario A:**
- [ ] Personalized recommendation suggests: age 25-44, income middle/upper_middle, activity 50, drivers only

**Scenario B:**
- [ ] Personalized recommendation includes your age selections
- [ ] Suggests adding income levels (middle, upper_middle)

**Scenario C:**
- [ ] Personalized recommendation includes your age + income
- [ ] Suggests adding activity score (around 60)

**Result:** _______________
**Notes:** 

---

## 4. Reach Estimator Accuracy Test ✓

### Expected Behavior:
- Reach numbers should change based on targeting filters
- More filters = lower reach
- Fewer/broader filters = higher reach

### Test Steps:
1. **Test Case A - Broad Targeting:**
   - Set targeting: Age 18-24, 25-34, 35-44, 45-54 (4 ranges)
   - No other filters
   - Check reach on Step 3

2. **Test Case B - Focused Targeting:**
   - Set targeting: Age 25-34 only
   - Income: upper_middle, high
   - Activity Score: 70
   - Drivers Only: Yes
   - Check reach on Step 3

3. **Test Case C - Very Narrow Targeting:**
   - Set targeting: Age 35-44
   - Income: high
   - Activity Score: 90
   - Drivers Only: Yes
   - Check reach on Step 3

### Verification Points:
- [ ] Test Case A has the HIGHEST reach (broad filters)
- [ ] Test Case B has MEDIUM reach (focused filters)
- [ ] Test Case C has the LOWEST reach (narrow filters)
- [ ] Reach numbers update when you change filters
- [ ] All costs display in ₹ INR

**Result:** _______________
**Notes:** 

---

## 5. Campaign Type Database Test ✓

### Expected Behavior:
- Campaign should save successfully to database
- No constraint violation errors

### Test Steps:
1. Complete all wizard steps with valid data
2. On Step 4 (Ready to Launch), click "Create Campaign"
3. Observe for any errors
4. Check if campaign appears in Campaign Manager

### Verification Points:
- [ ] No "campaign_type constraint violation" error
- [ ] Success message appears
- [ ] Campaign appears in Campaign Manager list
- [ ] Campaign status is "draft"

**Result:** _______________
**Notes:** 

---

## Overall Test Results

### Issues Found:
1. _______________
2. _______________
3. _______________

### All Tests Passed: YES / NO

### Additional Notes:
_______________________________________________
_______________________________________________
_______________________________________________

---

## Browser/Environment Info
- Browser: Chrome/Edge
- Screen Resolution: _______________
- Date/Time: _______________
