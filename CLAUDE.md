# CLAUDE.md - Project Context for Claude Code

## Project Overview
Bridge Clearance Calculator for Auckland's Tamaki Drive - a single-page web application that calculates safe passage times under bridges based on tide data and boat height.

## Current Version
**v9.1** - Displayed on floating badge (index.html line 1277)

### Version History
| Version | Changes |
|---------|---------|
| v9.1 | localStorage caching, force refresh option, error retry panel, multi-bridge prep |
| v9.0 | Removed PWA manifest, CORS proxy fallbacks, time input fix |
| v8.7 | Previous version |

**Important**: When making significant changes, update the version badge at line 1277:
```html
<div class="validation-badge">✓ v9.1</div>
```

## Key Architecture
- Single HTML file (`index.html`) containing all HTML, CSS, and JavaScript
- No build system or external dependencies
- **Normal website** (not a PWA) - address bar and navigation buttons visible
- Fetches tide data from LINZ (Land Information New Zealand) CSV files
- Uses CORS proxies with localStorage caching for reliability

## Features

### localStorage Caching System
- Tide data is cached in browser localStorage after first fetch
- Cache expires after 30 days
- Users can force refresh via checkbox
- Falls back to cache when network fails

### Multi-Bridge Support (Prepared, not published)
- `BridgeConfig` object at line 1288 supports multiple bridges
- Currently only Tamaki Drive is configured
- UI not yet implemented - ready for future expansion

## Known Issues & Solutions

### 1. Tide Data Fetching Errors (CORS Proxy Failures)

**Problem**: The app relies on external CORS proxies to fetch tide data from LINZ. These free proxies can be unreliable.

**Solution Implemented**:
- `TideDataService` with multiple CORS proxy fallbacks (corsproxy.io → allorigins → codetabs)
- localStorage caching reduces network dependency
- Error panel with retry button and "Use Cached Data" fallback
- 8-second timeout per proxy attempt

**Key Code Location**: `TideDataService` object at line 1350

### 2. Time Input Field - Backspace/Delete Not Working

**Problem**: Auto-colon insertion interfered with backspace/delete.

**Solution Implemented**:
- Detect whether user is deleting or adding characters
- Allow natural deletion past the colon
- Escape key clears the entire field

**Key Code Location**: Time input event listeners at line 2490

### 3. PWA Mode Hiding Browser Controls

**Problem**: Web app manifest caused standalone mode on some devices.

**Solution**: Removed manifest entirely - site always runs as normal website.

### 3. PWA Mode Hiding Browser Controls

**Problem**: The web app manifest caused the site to run in PWA/standalone mode on some devices, hiding the address bar and forward/back navigation buttons.

**Solution Implemented** (index.html line 37):
- Removed the web app manifest entirely
- Site now always runs as a normal website with full browser controls
- Users who previously installed as PWA may need to uninstall and access via browser

**Note**: Do NOT re-add a manifest with `display: standalone` or `display: fullscreen` as this will cause the same issue.

## Important Code Locations

| Feature | Location |
|---------|----------|
| BridgeConfig (multi-bridge) | index.html:1288-1345 |
| TideDataService | index.html:1350-1640 |
| Cache management | TideDataService methods |
| Error panel & retry | index.html:1900-1970 |
| loadTideData function | index.html:1990-2120 |
| Time input handling | index.html:2490-2530 |
| CSV parsing (LINZ format) | index.html:2030-2100 |
| Clearance calculation | index.html:2180-2280 |

## Data Sources

- **Tide Data**: LINZ official tide tables
  - URL pattern: `https://static.charts.linz.govt.nz/tide-tables/maj-ports/csv/Auckland%20{year}.csv`
  - Available years: 2024-2028
  - Format: CSV with day, month, year, and up to 4 tide time/height pairs per row

## Testing

Run validation tests:
```bash
python3 validation_tests.py
```

Tests cover:
- Clearance calculations (safe, caution, danger thresholds)
- Real-world scenarios with varying tide conditions

## Common Debugging

### Check TideDataService and cache status
```javascript
TideDataService.logStatus()
TideDataService.getCacheStatus()
```

### Clear all cached data
```javascript
TideDataService.clearAllCache()
```

### Force fetch fresh data for a year
```javascript
TideDataService.fetchTideDataForYear(2026, true).then(r => r.text()).then(console.log)
```

### Check BridgeConfig
```javascript
BridgeConfig.getCurrentBridge()
BridgeConfig.getAvailableBridges()
```

## UI Elements

### Cache Status Indicator
- Shows whether data will come from cache or network
- Updates when date changes
- Located below the Time input field

### Force Refresh Checkbox
- When checked, bypasses cache and fetches fresh data
- Includes hint about slower speed
- Auto-unchecks after successful load

### Error Panel
- Shows when data fetch fails
- "Try Again" button for retry
- "Use Cached Data" button (only if cache available)
- Replaces simple toast for persistent errors

## Future Enhancements

### To add a new bridge:
1. Add entry to `BridgeConfig.bridges` object
2. Create UI selector component
3. Update `selectSpan()` to use bridge config
4. Update calculations to use `BridgeConfig.getSpanClearance()`
