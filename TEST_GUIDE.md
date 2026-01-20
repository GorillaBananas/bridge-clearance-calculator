# Bridge Clearance Calculator - Testing Guide

## Version 8.0 - Multi-Bridge Support

### Overview
This version introduces multi-bridge support, allowing users to calculate clearances for different bridges while preserving the original OBC bridge functionality.

---

## New Features Implemented

### 1. Multi-Bridge Support
- **Bridge Selector**: Users can choose between OBC Bridge, Panmure Bridge, or Custom Bridge
- **Dynamic Span Configuration**: Each bridge has its own span configurations
- **Custom Chart Datum**: Users can enter custom chart datum values for custom bridges

### 2. iOS Improvements
- **Dynamic Island Padding**: Added extra padding at the top to prevent the boat icon from being covered by iOS Dynamic Island
- **Home Screen Icon**: Updated to use a proper SVG sailboat icon instead of emoji for better iOS compatibility

### 3. Bridge Configurations

#### OBC Bridge (Original - Preserved)
- **Location**: Tamaki Drive, Auckland
- **Tide Station**: Auckland
- **Spans**:
  - In/Out: 6.2m clearance at chart datum
  - High: 6.5m clearance at chart datum
- **Chart Datum**: 0m (clearances already referenced to chart datum)

#### Panmure Bridge (New)
- **Location**: Tamaki River, Auckland
- **Tide Station**: Auckland (uses same LINZ data)
- **Spans**:
  - Main Span: 4.5m clearance at chart datum
- **Chart Datum**: 0m

#### Custom Bridge (New)
- **Location**: User Defined
- **Tide Station**: Auckland
- **Spans**: Default 5.0m (customizable)
- **Chart Datum**: User can specify custom value

---

## Testing Instructions

### Test 1: OBC Bridge Functionality (Original)
**Objective**: Verify that the original OBC bridge calculations still work correctly

**Steps**:
1. Open the calculator
2. Verify "OBC Bridge - Tamaki Drive" is selected by default
3. Verify two span options are visible:
   - In/Out: 6.2m
   - High: 6.5m
4. Select a date (e.g., today's date)
5. Enter a time (e.g., 14:30)
6. Enter boat height (e.g., 4.5m)
7. Keep safety margin at 0.5m
8. Click "Check Now"

**Expected Results**:
- ✓ Tide data loads from LINZ for Auckland
- ✓ Clearance calculation displays
- ✓ Shows whether passage is safe at that time
- ✓ Displays tide height and actual clearance
- ✓ Shows LINZ data points for the day
- ✓ All original OBC functionality works as before

**Test Scenarios**:
- Low tide time: Should show safe passage with good clearance
- High tide time: Should show reduced clearance or unsafe passage
- Click "Find Times": Should show all safe passage windows for the day

---

### Test 2: Panmure Bridge Functionality (New)
**Objective**: Verify the new Panmure Bridge calculations work correctly

**Steps**:
1. Open the calculator
2. Select "Panmure Bridge - Tamaki River" from the Bridge Location dropdown
3. Verify only ONE span option is visible:
   - Main Span: 4.5m
4. Select a date (e.g., today's date)
5. Enter a time (e.g., 14:30)
6. Enter boat height (e.g., 3.5m)
7. Keep safety margin at 0.5m
8. Click "Check Now"

**Expected Results**:
- ✓ Bridge selector changes to Panmure
- ✓ Span grid shows only one span (centered/full width)
- ✓ Tide data loads from LINZ for Auckland
- ✓ Clearance calculation uses 4.5m bridge clearance
- ✓ Result shows "MAIN SPAN (4.5m)" in the results
- ✓ All calculations work correctly for the lower clearance

**Test Scenarios**:
- Low tide: Should show safe passage
- High tide: Should show unsafe passage (due to lower clearance)
- Click "Find Times": Should show safe passage windows (likely fewer than OBC)

---

### Test 3: Bridge Switching
**Objective**: Verify switching between bridges works correctly

**Steps**:
1. Start with OBC Bridge selected
2. Enter all values and click "Check Now"
3. Note the results
4. Switch to "Panmure Bridge" using the dropdown
5. Verify the span options change
6. Click "Check Now" again (without changing other values)

**Expected Results**:
- ✓ Span selector updates when bridge changes
- ✓ Previous results are cleared when switching bridges
- ✓ New calculation uses the new bridge's clearances
- ✓ Results update correctly for the new bridge

---

### Test 4: Custom Bridge & Chart Datum
**Objective**: Verify custom bridge option and chart datum input

**Steps**:
1. Select "Custom Bridge" from the dropdown
2. Verify a new input field appears: "Chart Datum (optional)"
3. Enter a custom chart datum value (e.g., 0.5m)
4. Proceed with normal calculation

**Expected Results**:
- ✓ Custom chart datum field appears when "Custom Bridge" is selected
- ✓ Field is hidden for OBC and Panmure bridges
- ✓ Custom datum value is accepted
- ✓ Calculations account for the custom datum (if implemented)

---

### Test 5: iOS Dynamic Island Padding
**Objective**: Verify the boat icon is not covered on iOS devices

**Steps**:
1. Open the calculator on an iOS device (iPhone 14 Pro or newer with Dynamic Island)
2. View in Safari
3. Check the position of the boat icon (⛵) at the top

**Expected Results**:
- ✓ Boat icon is visible and not covered by the Dynamic Island
- ✓ Additional padding is applied at the top
- ✓ Layout looks good on iPhone with Dynamic Island

**Note**: If you don't have a device with Dynamic Island, the padding will simply add extra space at the top, which is acceptable.

---

### Test 6: iOS Home Screen Icon
**Objective**: Verify the icon appears correctly when bookmarked to home screen

**Steps**:
1. Open the calculator in Safari on iOS
2. Tap the Share button
3. Select "Add to Home Screen"
4. Check the icon preview
5. Add to home screen and check the actual icon

**Expected Results**:
- ✓ Icon shows a sailboat graphic (not just emoji)
- ✓ Icon has a dark blue background
- ✓ Icon renders clearly and looks professional
- ✓ Icon is visible on home screen

---

### Test 7: Responsive Design
**Objective**: Verify the layout works on different screen sizes

**Steps**:
1. Open the calculator on desktop
2. Test on mobile device
3. Test on tablet
4. Resize browser window

**Expected Results**:
- ✓ Bridge selector dropdown is full width and readable
- ✓ Span options display properly (2 columns for OBC, 1 column for Panmure)
- ✓ All inputs are properly sized and functional
- ✓ No horizontal scrolling on mobile
- ✓ Touch targets are appropriately sized

---

### Test 8: Edge Cases

**Test 8a: Multiple Bridge Switches**
1. Switch between all three bridge types multiple times
2. Verify no JavaScript errors occur
3. Verify tide data loads correctly each time

**Test 8b: Time Edge Cases**
- Test times at midnight (00:00)
- Test times just before midnight (23:59)
- Test times that require next-day tide data interpolation

**Test 8c: Boat Height Edge Cases**
- Very tall boat (e.g., 5.5m) on Panmure Bridge
- Should show no safe passage times
- Verify appropriate message is shown

---

## Verification Checklist

### Code Quality
- [✓] Original OBC functionality preserved
- [✓] No breaking changes to existing features
- [✓] Bridge configurations properly structured
- [✓] JavaScript functions properly named and organized
- [✓] CSS properly styled for new elements

### Features
- [✓] Bridge selector dropdown
- [✓] OBC Bridge (6.2m / 6.5m spans)
- [✓] Panmure Bridge (4.5m span)
- [✓] Custom Bridge option
- [✓] Custom chart datum input
- [✓] Dynamic span selector updates

### iOS Fixes
- [✓] Safe area padding for Dynamic Island
- [✓] Updated SVG icon for home screen
- [✓] Icon renders without emoji issues

### UI/UX
- [✓] Dropdown styling matches theme
- [✓] Responsive layout for all bridge types
- [✓] Single-span bridges display full width
- [✓] Multi-span bridges display in grid
- [✓] Smooth transitions when switching bridges

### Version
- [✓] Version updated to v8.0

---

## Known Issues / Notes

1. **Panmure Bridge Clearance**: The 4.5m clearance is used for testing purposes. Actual clearance should be verified from official sources.

2. **Custom Bridge**: Currently uses Auckland tide data for all bridges. Future enhancement could allow selecting different tide stations.

3. **Chart Datum**: The custom chart datum input is present but may need additional implementation in the calculation logic to fully account for datum differences.

4. **Browser Compatibility**: Tested primarily in modern browsers. IE11 support not guaranteed.

---

## Success Criteria

All tests pass with the following outcomes:
- ✓ OBC bridge calculations match original functionality
- ✓ Panmure bridge calculations work correctly
- ✓ Bridge switching works smoothly
- ✓ iOS Dynamic Island padding prevents icon overlap
- ✓ iOS home screen icon displays correctly
- ✓ No JavaScript console errors
- ✓ Responsive design works on all screen sizes
- ✓ Tide data loads correctly for all bridges

---

## Report Issues

If you find any issues during testing:
1. Note the bridge selected
2. Note the date and time used
3. Note the boat height and safety margin
4. Take a screenshot if visual issue
5. Check browser console for JavaScript errors
6. Report with all details above

---

**Test Date**: _____________
**Tested By**: _____________
**Version**: 8.0
**Status**: All major features implemented and ready for testing
