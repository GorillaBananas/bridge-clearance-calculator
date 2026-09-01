# CLAUDE.md - Project Context for Claude Code

## Project Overview
Bridge Clearance Calculator for Auckland's Tamaki Drive - a single-page web application that calculates safe passage times under bridges based on tide data and boat height.

## Current Version
**v9.3** - Displayed on floating badge (search `validation-badge` in index.html)

### Version History
| Version | Changes |
|---------|---------|
| v9.3 | Bundled tide data (no CORS proxy needed), payload validation, parser fixes, DST fix, unified Rule of Twelfths, CI, GoatCounter |
| v9.2 | Saved inputs, time shortcuts, collapsible tide chart |
| v9.1 | localStorage caching, force refresh option, error retry panel, multi-bridge prep |
| v9.0 | Removed PWA manifest, CORS proxy fallbacks, time input fix |

**Important**: When making significant changes, update the version badge:
```html
<div class="validation-badge">✓ v9.3</div>
```

**Note on line numbers**: `index.html` is ~3300 lines and shifts with every change.
Locate code by searching for the function or identifier, not by line number.

## Key Architecture
- Single HTML file (`index.html`) containing all HTML, CSS, and JavaScript
- No build system or external dependencies
- **Normal website** (not a PWA) - no manifest, no service worker, and there never
  has been one. Do not add one: it hides the address bar and navigation buttons.
- Tide data ships in `tides/` and is served same-origin; LINZ via CORS proxy is a
  fallback only
- Deployed to gorillabananas.github.io straight from `main`

## Features

### Tide data resolution (v9.3)
`TideDataService.fetchTideDataForYear(year, forceRefresh)` resolves in this order:

1. **Bundled** - `tides/auckland_{year}.csv`, same-origin, no CORS (2026-2029
   are committed). Preferred even
   on a force refresh: the file is version controlled, so there is nothing fresher
   to fetch. Availability is probed at runtime and memoised in
   `TideDataService.bundledAvailability`; there is no hardcoded list of years.
2. **localStorage cache** - 30 day expiry, skipped on force refresh.
3. **LINZ via CORS proxies** - corsproxy.io → allorigins → codetabs. Unreliable;
   corsproxy.io's free tier is localhost-only and always fails from github.io.

On network failure the cache is used even when force refresh was requested
(`staleFallback: true` on the response). Stale data beats no data.

### Payload validation
`countTideRows()` / `isValidTideCsv()` gate everything that enters or leaves the
cache. A CORS proxy returning an HTML error page with HTTP 200 is rejected rather
than cached, and `getCachedData()` re-validates content as well as age, so a
poisoned cache self-heals instead of serving junk for 30 days.

### Adding a tide year
```bash
./fetch_tides.sh              # current year plus the next two
./fetch_tides.sh 2029         # or a specific year
git add tides/ && git commit -m "Add 2029 tide data"
```
The script validates each download contains a full year of real tide rows before
saving. `.github/workflows/refresh-tides.yml` runs it monthly with `--best-effort`
and opens a PR; a year LINZ has not published yet is skipped, not fatal.

**What auto-extends and what does not**: `availableYears`, the date picker range
and the DST rules are all computed at runtime, so the *code* needs no change for
future years. The *data* does not appear by itself - a year is only bundled once
its CSV is committed. Merge the monthly PR, or run the script by hand. If a year
is not bundled the app still works, but falls back to the unreliable proxy path.

Note the published LINZ files carry a BOM, three header lines and CRLF endings,
while the original bundled 2026 file has none of them. `isLinzDataRow` identifies
rows by content so both shapes parse; `node_extract_tests.js` checks every file in
`tides/` for exactly this reason.

### Multi-Bridge Support (Prepared, not published)
- `BridgeConfig` object supports multiple bridges
- Currently only Tamaki Drive is configured
- UI not yet implemented - ready for future expansion

## Known Issues & Solutions

### 1. Tide data stopped loading (fixed in v9.3)

**Problem**: The app fetched LINZ CSVs only through free CORS proxies.
corsproxy.io's free tier became localhost-only, so it always failed from
github.io; allorigins and codetabs are rate-limited with no SLA.

It stayed broken because proxy responses were cached with no validation: an HTML
error page returned with HTTP 200 was stored as tide data and served for 30 days,
surfacing as a misleading "No tide data found" rather than a fetch error.

**Solution**: tide data is bundled in `tides/` and served same-origin; every
payload is validated before use or caching; the cache purges entries that no
longer parse.

### 2. Parser dropped 1-2 January (fixed in v9.3)

**Problem**: `parseLinzCsv` started at `for (let i = 2; ...)`, blindly skipping two
lines. The bundled CSV has no header at all, so 1 and 2 January silently returned
zero tide points.

**Solution**: `isLinzDataRow()` identifies data rows by content (>=6 fields, valid
day/month/year), and the loop starts at `i = 0`. Files with 0, 2 or 3 header lines
now parse identically. Malformed times and non-finite heights are skipped rather
than flowing into the clearance maths as Invalid Date / NaN.

### 3. DST transition days were an hour out (fixed in v9.3)

**Problem**: `getNZTimezoneOffset` resolved the offset per-day rather than
per-time, so tides between 00:00 and the changeover on the two transition days
each year got the wrong offset. Safety-relevant.

**Solution**: the offset is resolved against the tide's own wall-clock time.
DST starts on the last Sunday of September at 02:00 NZST, and ends on the first
Sunday of April at 03:00 NZDT. The ambiguous 02:00-02:59 hour in April is treated
as the first (NZDT) pass, which is what LINZ publishes.

### 4. Two interpolation methods disagreed (fixed in v9.3)

**Problem**: `generateHourlyTideData` interpolated linearly while
`interpolateTideHeight` used the Rule of Twelfths, so "Find Times" and the chart
disagreed with "Check Now" by up to ~20% of tidal range on the same minute — while
the page claimed Rule of Twelfths throughout.

**Solution**: one `ruleOfTwelfthsHeight(before, after, targetTime)` used by both.
It applies the twelfths curve across the *actual* interval between two tide
points (matching the Python reference in `real_linz_verification_tests.py`), so it
lands exactly on the next tide height instead of overshooting on long intervals.

### 5. Day-edge windows reported flat heights (fixed in v9.3)

**Problem**: `fullDayTideData` was computed before the adjacent-day points loaded,
and never recomputed, so times before the day's first tide or after its last were
held flat at the nearest height.

**Solution**: the 10-minute series is generated after `nextDayFirstPoint` and
`prevDayLastPoint` resolve, over `buildInterpolationPoints()` — the day's tides
plus both adjacent anchors, in time order.

### 6. Time Input Field - Backspace/Delete Not Working

**Solution**: detect whether the user is deleting or adding characters; allow
natural deletion past the colon; Escape clears the field.

### 7. PWA Mode Hiding Browser Controls

**Problem**: a web app manifest caused standalone mode on some devices, hiding the
address bar and navigation buttons.

**Solution**: no manifest, no service worker. Do NOT add one.

## Remaining known issues

None outstanding from the v9.3 audit. When adding one, record the reproduction and
whether it is safety-relevant.

## Important Code Locations

Search by identifier - line numbers move.

| Feature | Search for |
|---------|-----------|
| Multi-bridge config | `const BridgeConfig` |
| Tide data service | `const TideDataService` |
| Bundled-first resolution | `fetchTideDataForYear` |
| Bundled file fetch | `fetchLocalCsv` |
| Payload validation | `countTideRows`, `isValidTideCsv` |
| Cache management | `getCachedData`, `setCachedData` |
| Year range | `get availableYears` |
| Error panel & retry | `showErrorPanel` |
| Main load path | `async function loadTideData` |
| CSV parsing (LINZ format) | `function parseLinzCsv`, `isLinzDataRow` |
| NZ timezone / DST | `getNZTimezoneOffset` |
| Interpolation | `ruleOfTwelfthsHeight`, `interpolateTideHeight` |
| 10-minute series | `generateHourlyTideData`, `buildInterpolationPoints` |
| Time input handling | `previousTimeValue` |
| Analytics | `data-goatcounter` |

## Data Sources

- **Bundled**: `tides/auckland_{year}.csv` in this repo (currently 2026-2029)
- **LINZ (fallback)**: `https://static.charts.linz.govt.nz/tide-tables/maj-ports/csv/Auckland%20{year}.csv`
- **Year range**: `minYear` (2024) to the current year + 2, computed at runtime.
  The `#tideDate` picker's `min`/`max` are set from the same range.
- **Format**: CSV with day, weekday, month, year, and up to 4 time/height pairs per
  row. No header in the LINZ files, but header lines are tolerated.

## Testing

```bash
python3 validation_tests.py
python3 real_linz_verification_tests.py
python3 obc_verification_tests.py
python3 comprehensive_tests.py

# Using the real functions extracted from index.html
TZ=Pacific/Auckland node node_extract_tests.js   # tide data path and parser
node obc_chart_verification.js                   # against the OBC published chart
```

`obc_chart_verification.js` is the external check: every cell of the OBC Bridge
Gap Calculation Chart, transcribed verbatim (11 ranges × 7 hourly steps, both
spans, rising and falling — 407 values). The chart states it uses the Rule of
Twelfths and a 6.2m gap at chart datum, +0.3m for the High span, which is what
the app implements. On half-cent rounding boundaries the app displays the
conservative cent; the test asserts it never shows more clearance than the chart.

Beware `obc_verification_tests.py`: despite the name, its "OBC reference values"
are re-derived from the same subtraction the app performs, so its 0.00% error
figure is circular. It tests arithmetic, not agreement with OBC.

`node_extract_tests.js` pulls the shipped functions and `TideDataService` out of
`index.html` by brace matching and runs them against `tides/auckland_2026.csv`
with stubbed `fetch` and `localStorage`. It covers the resolution order, proxy
call counts, HTML payload rejection, cache self-healing, parser edge cases, DST
transition days, and interpolation agreement.

Everything runs in CI on every push and pull request
(`.github/workflows/tests.yml`). GitHub Pages ships from `main`, so that workflow
is the only gate before the live site.

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

### Check where data actually came from
```javascript
TideDataService.lastDataSource        // 'bundled' | 'cache' | proxy name
TideDataService.bundledAvailability   // { 2026: true, 2027: false }
TideDataService.isBundledAvailable(2027)
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
