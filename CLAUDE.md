# CLAUDE.md - Project Context for Claude Code

## Project Overview
Bridge Clearance Calculator for Auckland's Tamaki Drive - a single-page web application that calculates safe passage times under bridges based on tide data and boat height.

## Current Version
**v10.5** - Displayed in the page footer (search `versionTag` in index.html)

### Version History
| Version | Changes |
|---------|---------|
| v10.5 | Passages covering whole days stay one window and every day they cover says so |
| v10.4 | The verdict's date carries the same weight as its time on the wide layout |
| v10.3 | Column title stops claiming a date range, day-list heading and separator on both layouts |
| v10.2 | Verdict and picked day made adjacent, neutral limits panel, "Now" only when now, tide stated on danger verdicts |
| v10.1 | Picked-date panel for dates outside the visible list, midnight-lap fix in the verdict, stale-day guard |
| v10.0 | Planning-first redesign, multi-day forecast, window-merge fix, midnight stitching, caveats section, wide layout |
| v9.3 | Bundled tide data (no CORS proxy needed), payload validation, parser fixes, DST fix, unified Rule of Twelfths, CI, GoatCounter |
| v9.2 | Saved inputs, time shortcuts, collapsible tide chart |
| v9.1 | localStorage caching, force refresh option, error retry panel, multi-bridge prep |
| v9.0 | Removed PWA manifest, CORS proxy fallbacks, time input fix |

**Important**: When making significant changes, update the version in the footer:
```html
<span class="version" id="versionTag">v10.5</span>
```
The floating `validation-badge` is gone; the version now sits in the footer next
to the OBC and map links.

**Note on line numbers**: `index.html` is ~3300 lines and shifts with every change.
Locate code by searching for the function or identifier, not by line number.

## Key Architecture
- Single HTML file (`index.html`) containing all HTML, CSS, and JavaScript
- No build system or external dependencies. **No webfonts either**: the design in
  `design/` specifies Archivo, but the page uses the system stack so it has no
  external assets at all and works on a bad connection. Do not add a CDN font.
- Two layers in one script: the **tide engine** (BridgeConfig, TideDataService,
  the parser, the DST offset, the Rule of Twelfths, the window and forecast
  functions) and the **UI layer** below it. The tests extract engine functions by
  name, so keep them as named top-level functions.
- Colours are the design's `oklch()` values, each preceded by a hex fallback and
  upgraded inside `@supports (color: oklch(...))`. Add both when adding a token.
- **Normal website** (not a PWA) - no manifest, no service worker, and there never
  has been one. Do not add one: it hides the address bar and navigation buttons.
- Tide data ships in `tides/` and is served same-origin; LINZ via CORS proxy is a
  fallback only
- Deployed straight from `main` to
  https://gorillabananas.github.io/bridge-clearance-calculator/ - a project page,
  **not** the user root. Asset paths in the page must stay relative (`tides/...`);
  the absolute URLs in the og:/twitter: meta tags must include the subdirectory

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
saving. `.github/workflows/refresh-tides.yml` runs it monthly with `--best-effort`;
a year LINZ has not published yet is skipped, not fatal.

When something changed, the workflow pushes a `chore/refresh-tides-<date>` branch
and **raises an issue** carrying the compare link, rather than opening the pull
request itself. GitHub blocks Actions from creating pull requests unless
*Settings > Actions > General > Workflow permissions > Allow GitHub Actions to
create and approve pull requests* is enabled, and that switch cannot be granted
from the workflow file - the September 2026 run pushed its branch and then died on
`gh pr create` for exactly this reason. Raising an issue needs only `issues:
write`, which the workflow does grant itself. The issue is labelled `tide-data`
and a later run comments on the open one rather than opening a second, so a year
of unmerged refreshes is one thread. If the repository setting is ever enabled,
swapping the issue back for `gh pr create` is a two-line change.

**What auto-extends and what does not**: `availableYears`, the date picker range
and the DST rules are all computed at runtime, so the *code* needs no change for
future years. The *data* does not appear by itself - a year is only bundled once
its CSV is committed. Merge the monthly PR, or run the script by hand. If a year
is not bundled the app still works, but falls back to the unreliable proxy path.

Note the published LINZ files carry a BOM, three header lines and CRLF endings,
while the original bundled 2026 file has none of them. `isLinzDataRow` identifies
rows by content so both shapes parse; `node_extract_tests.js` checks every file in
`tides/` for exactly this reason.

### Passage windows (v10)
`calculateSafeWindows(series, span, boat, margin)` walks the 10-minute series and
returns a run of **consecutive** passable samples as one window. It breaks on any
impassable sample: before v10 the joiner glued runs up to 1.5 hours apart, so a
short closure around a weak high tide was reported as continuous passage. That
was safety-relevant and is covered by "Fix 7" in `node_extract_tests.js`.

Each window carries `safeStart`/`safeEnd` (the stretch clearing the safe floor,
or null), `hasSafeCore`, `best` (the lowest tide in the window) and
`minClearance`/`maxClearance`.

### What "safe" means (v10.0)
`SAFE_CUSHION_M` (0.5) is a **floor on total clearance above the bare boat, not
an addition to the skipper's margin**. A moment is safe once clearance reaches
`max(margin, SAFE_CUSHION_M)`; `safeSpareThreshold(margin)` returns the spare
still needed, `max(0, SAFE_CUSHION_M - margin)`.

| Margin | Fits at all | Safe from | Caution band |
|--------|-------------|-----------|--------------|
| 0.00 | boat | boat + 0.50 | 0.50 wide |
| 0.30 | boat + 0.30 | boat + 0.50 | 0.20 wide |
| 0.50 | boat + 0.50 | boat + 0.50 | none |
| 1.00 | boat + 1.00 | boat + 1.00 | none |

Before this the two stacked: a 0.30m margin was only called safe at 0.80m of
clearance, which double-counted the skipper's own decision. The safe boundary
must not move with the margin while the margin is under the floor - "the safe
boundary is the same clearance whatever the margin below the floor" in
`node_extract_tests.js` pins exactly that.

At or above the floor there is no caution band at all, so the UI drops the amber
entry from the legends (`cautionPossible()`) and a window with no caution
shoulders reports its duration rather than repeating its own times.

Windows are reported from the first to the **last** moment the data shows the boat
fits, never to the sample after it. The true edges lie within the ten minutes
either side; naming the inner bound is the conservative direction and the only one
the data supports.

### Multi-day forecast (v10)
`computeDayForecast(startDate, count, span, boat, margin, forceRefresh)` returns
one entry per day: `{ date, points, series, windows, prevAnchor, nextAnchor,
unavailable }`. Each day is interpolated against its own neighbours, so day-edge
times are interpolated rather than held flat. Year CSVs are fetched once per year
the range spans (`yearCsvCache`), so a fortnight costs one or two fetches; a range
crossing 31 December pulls both years. A day past the published range comes back
`unavailable: true` instead of throwing.

`stitchWindowsAcrossMidnight(days)` joins a window ending 23:50 to one starting
00:00 the next day. Windows are computed a day at a time, so without this a
passage running past midnight looks like one closing at midnight plus a short
"caution throughout" window the next morning. The UI always loads `count + 1` days
so the last visible day can be stitched too.

It carries the open window forward rather than comparing adjacent days, because
joining day N to day N+1 **empties** N+1 when that was its only window - which is
what a passage covering a whole day looks like. Pairwise iteration then had no
trailing window to chain from and stopped (issue 13). `endsAtDayEnd` and
`startsAtDayStart` are extracted by `node_extract_tests.js` alongside it, so they
must stay named top-level functions.

### A date outside the visible list (v10.1)
The day list only ever covers the next 7 or 14 days. A date picked outside it -
next month, or in the past - has no row to expand, so `renderPickedDay()` renders
the same detail an expanded row would (windows, curve, the published tide times)
into `#pickedDay`, directly under the verdict. It shows only when
`selectedDayLoaded()` returns a day that `findDay()` does not, so an in-range date
still expands in the list as before.

Such a date is loaded with a day either side of it (`computeDayForecast(date - 1,
3, ...)`, stitched), for the same reasons the visible range is: the day after so a
window running past midnight is whole, the day before so one still open that
morning is known. `contextDays(date)` returns whichever loaded run a date belongs
to, and `windowContaining()` now falls back to `lapCovering()` so a moment
in the small hours reports the window it is actually inside rather than none.

`selectedDayLoaded()` returns null when the day in hand is for a different date -
what is left after a fetch for the selected date fails, e.g. a year LINZ has not
published and no proxy will serve. Before it, `renderResult` interpolated the day
in hand against the selected moment and printed a confident tide figure for a date
it had no data for.

### A day inside a passage (v10.5)
A short boat fits at every tide for days on end, so a passage can run for a week.
A window is carried on the day it opens, so the days it covers hold none of their
own. `lapCovering(date)` finds the window covering a day, walking back past the
empty days to the one the passage opened on; `windowsToShow(day)` returns it ahead
of the day's own windows, and every render site - rows, expanded detail, the tide
curve, the week grid, `windowContaining`, `nextWindowAfter` - goes through one of
those two rather than reading `day.windows` directly. Reading `day.windows` in a
render site is the bug: it is only what *opens* that day.

`isLapOn(win, date)` marks a window that opened earlier. Such a window is drawn as
a continuation, never as something opening today: "Open all day · closes ..." when
it covers the day end to end, otherwise "&rarr; 05:40 · open since 18:50 Wed". Times
are read against the row they sit on, and `spansPastAWeek()` dates them when a
window runs more than six days - "00:00 Thu - 18:00 Thu" is a week apart and reads
as a single day.

### Reading order around the verdict (v10.2)
Three sections answer for the selected date, in this order:

1. `#resultWrap` - the verdict itself, and nothing else
2. `#pickedDay` - that day's windows, curve and tide times, when the date is
   outside the visible list (empty and hidden otherwise)
3. `#resultTail` - `renderLimitsLine` and, on a danger verdict,
   `renderNextPassage`

The tail is separate from the verdict for one reason: it used to be rendered as
part of it, which put two panels between the red verdict and the detail that
explains it. With nothing picked the tail still lands directly under the verdict,
so the in-range layout is unchanged. On the wide layout `.result-tail` is
`display: contents` - the rail states the limits there, so the section must not
reserve a gap for a line that is hidden.

`renderNextPassage` returns nothing when the window it would name falls on the
picked day already detailed above it; the same window with its clearances is
three lines further down. It still renders when the next passage is on another
day, which is the one thing the picked-day card cannot say.

### Where the date range is stated (v10.3)
`#mainTitle` is the static text "Passage windows" and no longer carries a range.
It heads the whole main column - which, on a picked date, includes a day months
outside that range - so a range there was read as covering the picked date too.

`renderDaysHeading()` puts the range on `#daysHeading`, the heading of the list it
actually describes: "Next 7 days · 4 – 10 Sep", crossing months as
"30 Sep – 6 Oct". One heading serves both layouts. `.days-head` used to be hidden
on wide, which left the week grid with no heading and no boundary above it; it now
shows on both, with a 2px rule and a real heading weight rather than the uppercase
micro-label it was.

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

### 6. Time Input Field - Backspace/Delete Not Working (moot since v10)

**Was**: a free-text time field auto-inserted a colon and fought deletion. The fix
detected whether the user was deleting or adding characters.

**Now**: the field is gone. Date and time are native `<input type="date">` and
`<input type="time">` sitting invisibly over the design's readouts, so the
platform picker does the parsing and there is no colon logic to get wrong. Do not
reintroduce a text time field.

### 7. PWA Mode Hiding Browser Controls

**Problem**: a web app manifest caused standalone mode on some devices, hiding the
address bar and navigation buttons.

**Solution**: no manifest, no service worker. Do NOT add one.

This is also why there are **no reminders**. The design in `design/` specifies a
local notification 30 minutes before a window closes, but a notification
scheduled for a future time can only be delivered from a service worker, so the
feature was cut rather than faked. If it ever comes back, an `.ics` download with
a `VALARM` is the way to do it without a service worker.

### 8. Windows spanned periods the boat did not fit (fixed in v10.0)

**Problem**: `calculateSafeWindows` joined runs of passable samples up to 1.5
hours apart, and `findBestTimes` carried a second copy of the same joiner. A
short closure around a weak high tide was therefore reported as one continuous
window, telling a skipper the passage was open when it was not. Safety-relevant.

**Solution**: a window is a run of consecutive passable samples and breaks on any
impassable one. The duplicate joiner is gone; both call sites share the function.

### 9. Windows running past midnight looked like two (fixed in v10.0)

**Problem**: windows are computed a day at a time, so a passage from 19:10 to
00:50 came back as one window closing 23:50 and a separate "caution throughout"
window opening 00:00 the next morning. The first read as closing at midnight.

**Solution**: `stitchWindowsAcrossMidnight` joins them, and the closing time
carries a weekday when it lands on a different day.

### 10. A date outside the list had no windows or tide times (fixed in v10.1)

**Problem**: picking a date beyond the 7/14-day list gave a verdict for the chosen
minute and nothing else - no windows for that day, no published tide times. The
detail existed only in the desktop rail card (`renderDayCard`), which is hidden on
mobile, and even on desktop it lost to any day the user had expanded in the week
grid. Reproduction: set a boat height, pick a date a month out, look for that day's
windows. Not safety-relevant in itself - nothing shown was wrong - but it left a
skipper planning a trip a fortnight out with only the single minute in the picker.

**Solution**: `renderPickedDay()` renders the day detail under the verdict in both
layouts; `renderDayCard` no longer duplicates it beside the week grid.

### 11. A green panel under a red verdict, and a false "Now" (fixed in v10.2)

**Problem**: two faults in the same sentence under the verdict.

`.limits` was painted `var(--safe-softer)`, the safe green, whatever the verdict
said. On a danger verdict the page showed DANGER in red and then a green panel
directly beneath it. Reproduction: any date and time the boat does not fit.
Safety-relevant: green means safe everywhere else on the page.

The same line read `Now 3.14 m and falling`, but its figure is
`tideAtMoment(day, selectedMoment())` - the tide at the *selected* moment. On any
other date or time the word "Now" was simply false. Reproduction: pick a date
next month, note the verdict's time, read the sentence below it. Safety-relevant:
it states a water level for the present that is not the present's.

**Solution**: the panel is neutral (`--card`), since it states the safe *and* the
danger threshold and wearing either colour misreads it. `momentIsNow()` gates the
wording, so it reads "Now" only within a minute of the real clock and "At 11:24 it
is ..." otherwise. `renderRailLimits` was already correct - it reads the real
clock - and is unchanged.

`renderShortfallTail` now leads with the tide height, as the safe verdict does.
The danger verdict was the one case that never stated the height it was judging,
which left that figure to the limits line below it and, on the wide layout where
that line is hidden, to nowhere at all.

### 12. The column title claimed a range it was not showing (fixed in v10.3)

**Problem**: `renderWide` wrote "Passage windows, 4 – 10 Sep" into `#mainTitle`
from the visible list's range. With a date picked outside that list, the column
below the title led with a verdict and a full day's detail for, say, 30 September
- under a title saying 4 – 10 September. Reproduction on a wide viewport: pick a
date a month out and read the title above the red panel. Not safety-relevant in
the arithmetic, but it mislabels which date the figures under it belong to.

The same layout had no heading over the week grid and no rule before it, because
`.days-head` was `display: none` on wide, so a picked date's detail ran straight
into the seven-day list with nothing marking the change of subject.

**Solution**: the title is static; the range moved to `renderDaysHeading()`, on
the heading of the list it describes. `.days-head` shows on both layouts, with the
rule and a heading weight that holds against the cards above it.

### 13. Days inside a long passage read as closed (fixed in v10.5)

**Problem**: with a short boat the tide blocks passage rarely, so a window can run
for days. `stitchWindowsAcrossMidnight` joined day N's trailing window to day N+1's
leading one and shifted it off N+1 - emptying that day when it was its only window.
The pairwise loop then found no trailing window on N+1 and stopped, so one passage
came back cut into pieces, each falsely closing at midnight, with the days between
holding nothing. Every render site read `day.windows`, so those days printed
**"No passage this day"** while passage was in fact open around the clock.

Reproduction: boat 2.70 m, margin 0.30, the seven-day list. Before the fix, four of
seven days claimed no passage and the others showed 47h 50m windows starting at
00:00; the true state was one continuous passage across the whole week.

Safety-relevant in the direction of saying closed when open - it does not put a
boat under the bridge unsafely, but it hides passage a skipper is entitled to see,
and the false midnight closes are the failure issue 9 was meant to end.

**Solution**: the stitcher carries the open window across the days it swallows, so
a passage stays one window however long it runs. `lapCovering` and `windowsToShow`
give every render site the window covering a day, not only the ones opening on it.
Two tests in `node_extract_tests.js` pin it: a four-day fixture must come back
`1,0,0,0` windows with the passage ending on the day it truly closes, and an
unavailable day must break the chain rather than be joined across.

## Remaining known issues

**The page assumes the device is set to New Zealand time.** Tide instants are
built from NZ wall-clock plus the NZ offset, but `generateHourlyTideData` builds
its 10-minute series over the browser's local midnight-to-midnight. On a device
set to another timezone the day boundaries and "now" drift. This predates v10 and
is unchanged by it; the tests run under `TZ=Pacific/Auckland`. Not safety-relevant
for the intended audience, who are in Auckland, but worth knowing.

When adding an issue, record the reproduction and whether it is safety-relevant.

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
| Passage windows | `calculateSafeWindows`, `SAFE_SPARE_M` |
| Midnight-crossing windows | `stitchWindowsAcrossMidnight` |
| Multi-day forecast | `computeDayForecast`, `yearCsvCache`, `getDayPoints` |
| High/low labelling | `classifyTidePoints` |
| UI state | `const ui = {` |
| Recalculate after a fetch | `recompute` |
| Recalculate without a fetch | `recalcFromLoaded` |
| Header figure | `renderHeader` |
| Verdict panel (incl. shortfall) | `renderResult`, `renderShortfallTail` |
| Qualifiers under the verdict | `renderResultTail`, `renderLimitsLine`, `renderNextPassage` |
| "Now" vs the selected moment | `momentIsNow`, `renderRailLimits` |
| Date outside the visible list | `renderPickedDay`, `selectedDayLoaded` |
| Which loaded run a date is in | `contextDays`, `findDay` |
| A day covered by an earlier passage | `lapCovering`, `windowsToShow`, `isLapOn` |
| Day rows | `renderDays`, `renderWindowLine` |
| Expanded day | `renderDayDetail`, `renderDayCurve` |
| Published tide points table | `tide-row`, `classifyTidePoints` |
| Day list heading and range | `renderDaysHeading`, `.days-head`, `.days-title` |
| Wide layout only | `renderWide`, `renderWeek`, `renderRailLimits`, `renderDayCard` |
| Caveats section | `id="caveats"` |
| Analytics | `data-goatcounter` |

## Data Sources

- **Bundled**: `tides/auckland_{year}.csv` in this repo (currently 2026-2029).
  The 2026 file was refreshed from LINZ in September 2026; the edition shipped
  before that was out by up to 0.10 m on 124 of its 1,410 tide points, which is
  what the monthly workflow exists to catch
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
transition days, interpolation agreement, the window rules, the multi-day
forecast and the midnight stitching. It can extract `async function`s and
single-line `const`s (`extractConst`), so tests read the app's own thresholds
rather than a copy of them.

To cover a new engine function, add its name to `FUNCTIONS` and destructure it
from `api`. Anything the UI layer touches (`document`, `window`) cannot be
extracted this way - keep engine functions DOM-free.

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

### Provenance row (`id="provenance"`)
- Says where the data came from - bundled, this device's saved copy, or fetched -
  and the last date predictions run to, computed from `availableYears`
- Carries the **Refresh** button, which is the force-refresh path. The v9.3 force
  refresh checkbox and cache status indicator are gone; this row replaced both
- Turns amber when a refresh failed and the saved copy is being shown

### Error Panel (`id="errorPanel"`)
- Shows when a fetch fails outright
- "Try again" retries; "Use cached data" appears only when a cache exists

### Setup card (`class="setup"`)
- Date and time are native pickers behind the readouts; steppers for margin and
  boat height, 0.05m, repeating on a long press
- Margin presets include 0, which is valid and shows the bare gap

### Picked-date panel (`id="pickedDay"`)
- Appears **directly** under the result when the selected date falls outside the
  7/14-day list; carries that day's windows, curve and LINZ tide times
- Nothing may be placed between it and the verdict - see "Reading order around the
  verdict"
- Hidden the moment the date is back inside the list, where the row expands instead

### The verdict's date (`.result-figure.when`, `.result-when`)
- The date is the identity of the answer, not a caption on it: with a date picked,
  the first check a reader makes is that the verdict is for the day they asked for
- On the wide layout the strip shows time over date, both bold - the date was
  14px regular beside a 38px figure and was read past (v10.4). The narrow layout
  states both in one bold line and needs nothing extra

### Verdict qualifiers (`id="resultTail"`)
- The limits sentence, and the next-passage panel on a danger verdict
- Deliberately untinted: it states the safe and the danger threshold at once
- On the wide layout the rail carries the limits, so only next passage shows here

### Caveats (`id="caveats"`)
- The Rule of Twelfths explanation, the OBC cross-check, what the figures do and
  do not include, and the weather warning
- Reached from the asterisk on the BETA tag and the `i` button in the header.
  **Do not remove or weaken this**: it is the page's only statement of what the
  numbers are worth

## Future Enhancements

### To add a new bridge:
1. Add an entry to the `BridgeConfig.bridges` object
2. Add a bridge selector to the setup card
3. Have `setSpan()` and `buildSpanButtons()` read the selected bridge - they
   already read spans from `BridgeConfig.getCurrentBridge()`, so span names and
   clearances need no code change

## The design source

`design/` holds the Claude Design bundle this version was built from:
`Bridge Clearance Redesign.dc.html` (the artboards), `README.md` (the written
spec) and `uploads/logo.png`, copied to `logo.png` at the repo root for the page
to use. The `.dc.html` is a **visual reference**, not production code.

Where the build departs from that spec, and why:

| Spec | Built | Why |
|------|-------|-----|
| Reminders, "Alert me before it ends" | Cut | Needs a service worker (issue 7) |
| "Add to calendar" | Cut | Went with the reminders it belonged to |
| Archivo / Archivo Narrow from Google Fonts | System stack | The page otherwise has no external assets |
| Light BETA tag, no interpolation caveat | Full caveats section, linked from the tag | It is a safety tool; the v9.3 warnings were restored rather than dropped |
| Derived limits in the desktop rail only | Rail on desktop, under the result on mobile | Same sentence, rendered by `renderRailLimits` and `renderLimitsLine` |
| "Over 1 hour only" toggle | Cut | Removed at the owner's request: it hid windows rather than ranking them, and a short window is exactly the one a skipper needs to see |
| Safe = 0.5m spare on top of the margin | Safe = max(margin, 0.5m) of clearance | The two stacked, so a considered margin was double-counted; see "What safe means" |
| Day panel led with the tide curve | Windows first, curve below | Opening a day should expand on the summary row just tapped, not lead with a chart |
