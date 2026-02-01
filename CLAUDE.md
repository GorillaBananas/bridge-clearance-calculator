# CLAUDE.md - Project Context for Claude Code

## Project Overview
Bridge Clearance Calculator for Auckland's Tamaki Drive - a single-page web application that calculates safe passage times under bridges based on tide data and boat height.

## Key Architecture
- Single HTML file (`index.html`) containing all HTML, CSS, and JavaScript
- No build system or external dependencies
- Fetches tide data from LINZ (Land Information New Zealand) CSV files
- Uses CORS proxies to bypass browser restrictions

## Known Issues & Solutions

### 1. Tide Data Fetching Errors (CORS Proxy Failures)

**Problem**: The app relies on external CORS proxies to fetch tide data from LINZ. These free proxies can be unreliable, rate-limited, or go offline.

**Solution Implemented** (index.html lines 1103-1278):
- Created `TideDataService` abstraction with multiple CORS proxy fallbacks
- Proxies tried in order: corsproxy.io → allorigins → codetabs
- 8-second timeout per proxy attempt
- User-friendly error messages for different failure types

**Key Code Location**: `TideDataService` object at line 1112

**Future Enhancement (Option 3)**: The code is structured to support embedded local tide data with SHA-256 verification. To implement:
1. Set `TideDataService.config.useEmbeddedData = true`
2. Populate `TideDataService.config.embeddedData` with `{ year: csvText }`
3. Add hashes to `TideDataService.config.embeddedDataHashes`
4. Uncomment the embedded data check in `fetchWithFallback()`

### 2. Time Input Field - Backspace/Delete Not Working

**Problem**: The auto-colon insertion in the time input (HH:MM format) interfered with backspace/delete, making it difficult to correct mistakes.

**Solution Implemented** (index.html lines 2130-2173):
- Detect whether user is deleting or adding characters
- When deleting: allow natural deletion, remove colon when ≤2 digits remain
- When adding: auto-insert colon after 2 digits
- Added Escape key shortcut to clear the entire field

**Key Code Location**: Time input event listeners at line 2130

## Important Code Locations

| Feature | Location |
|---------|----------|
| TideDataService (CORS fallbacks) | index.html:1112-1278 |
| Tide fetching functions | index.html:1280-1370 |
| Time input handling | index.html:2130-2173 |
| CSV parsing (LINZ format) | index.html:1488-1553 |
| NZ timezone/DST handling | index.html:1461-1485 |
| Clearance calculation | index.html:1823-1927 |
| Rule of Twelfths interpolation | index.html:1595-1730 |

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

### Check which CORS proxy succeeded
Open browser console and look for:
```
→ Trying proxy 1/3: corsproxy.io
✓ Success with corsproxy.io
```

### Verify TideDataService status
In browser console:
```javascript
TideDataService.logStatus()
```

### Test tide data fetch manually
```javascript
TideDataService.fetchTideDataForYear(2026).then(r => r.text()).then(console.log)
```
