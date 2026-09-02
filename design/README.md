# Handoff: OBC Bridge Clearance Calculator — planning-first redesign

Repo: GorillaBananas/bridge-clearance-calculator (branch main). The app is a single ~140 KB `index.html` of vanilla
HTML/CSS/JS, no dependencies, deployed to GitHub Pages.

## What this is
A redesign of https://gorillabananas.github.io/bridge-clearance-calculator/. The current site is a five-section form
(bridge span, date, time, advanced tide options, boat, safety margin) with Check Now / Find Times buttons; the answer
arrives last. The redesign puts one always-visible setup panel next to live results: an answer for a chosen moment, and
passage windows for the next seven days. Mobile is the primary platform; desktop is the same page widened.

**Scope of the change: presentation only.** Do not touch the calculation, the LINZ parsing, the tide-fetch fallback chain,
or the SAFE/CAUTION/DANGER thresholds. `node_extract_tests.js` pulls `parseLinzCsv`, `getNZTimezoneOffset`,
`ruleOfTwelfthsHeight` and `TideDataService` out of `index.html` by name — keep those names. `obc_chart_verification.js`
checks 407 values against the published OBC chart and must stay green.

## About the design files
The bundled `.dc.html` is a **design reference**, not production code. Recreate it in `index.html` using the repo's own
plain HTML/CSS/JS. Open it in a browser to read exact computed styles.

## Fidelity
High-fidelity: colours, type, spacing, copy and hierarchy are final-intent. All numbers are illustrative placeholders from
the worked example below — do not ship them.

## Worked example (all mock numbers derive from this)
- Illustrative tide table, Tue 2 Sep: 03:12 low 0.5 m, 09:24 high 3.2 m, 15:40 low 0.6 m, 21:52 high 3.3 m
- Inputs: IN/OUT span 6.2 m, boat 3.90 m, safety margin 0.50 m → **required 4.40 m**
- Gap under the span = span height − tide. Spare = gap − required.
- Window (spare >= 0) while tide <= 1.80 m; safe core (spare >= 0.5) while tide <= 1.30 m
- At 14:05 tide 1.24 m falling → gap 4.96 m. At 16:00 tide 0.66 m → gap 5.54 m, spare 1.14 m, SAFE
- Tue 2 window 13:12–18:08, safe core 13:52–17:28
Windows shift ~50 min later each day. Friday shows a **three-window day** (04:02–08:04, 15:44–17:20, 17:52–20:36): a weak
1.86 m high closes the gap for 32 minutes, and the short middle window never reaches 0.5 m spare, so it is caution
throughout. Never assume two windows per day, and never assume a window has a safe core.

## Screens

### Mobile (design id 2A, 390 px, scrolls; setup card pins under the header)
1. **Header** (#0A1628, padding 14px 18px 18px, column gap 12):
   - Logo (uploads/logo.png, white artwork, 38 px tall, directly on the navy — never on a light chip), title
     "Bridge Clearance" 19px/700 with "(BETA)" in Archivo Narrow 11px/700, ls 0.14em, oklch(0.86 0.12 85); sub-line
     "Tamaki Drive · Outboard Boating Club" 12.5px; 34×34 info button on rgba(255,255,255,0.09).
   - Description 13px/1.45: "Safe passage times under the Tamaki Drive bridge using LINZ tide predictions and your boat's
     height above the waterline. Use at your own caution."
   - 1px rule rgba(255,255,255,0.12).
   - **Current status block** — label "CURRENT BRIDGE GAP" (Archivo Narrow 12px, ls 0.14em, uppercase), figure
     "4.96 m" 34px/800, then "Tue 2 Sep, 14:05 · tide 1.24 m, falling" 13.5px. It reports the bridge gap ONLY: no safety
     verdict and no clearance claim, because those depend on boat details the user may not have entered yet.
2. **Setup card** (white, radius 22, padding 16, gap 16). Order and equal weight:
   - Row of **Date** (‹ Tue 2 Sep / Today ›, flex 1.35) and **Time** (16:00 / Departure, with a "Now" chip, flex 1).
   - **Select bridge span** — segmented, 46px options: "In/Out 6.2 m" | "High 6.5 m"; selected = #0A1628 on #F7F5F0.
   - **Safety margin** — ± stepper (0.05 m steps) + preset chips 0 / 0.30 / 0.50 / 1.00. **0 is valid.** Helper:
     "Clearance you want left above the boat. Steps of 0.05 m; set 0 to see the bare gap."
   - **Boat height** — identical ± stepper, "saved on this device". Helper: "Waterline to your highest point — mast,
     aerial, radar — with the boat unladen. Remembered next visit."
   - Labels are Archivo Narrow 12px/0.14em uppercase in oklch(0.50 0.02 232); helpers 12px.
3. **Result block — outside the setup card.** Inputs and answers must stay visually separate.
   - Panel in the status colour (safe oklch(0.80 0.16 155) on #08240F). Header row: "16:00 on Tue 2 Sep" 18px/700 and a
     status pill on rgba(8,36,15,0.14).
   - Two equal figures, 40px/800, split by a 1px divider: **gap under the IN/OUT span** and **spare above your boat**.
     The span name is written in caps as selected — IN/OUT or HIGH.
   - 1px divider, then: "**Required 4.40 m** — boat 3.90 m + 0.50 m margin" / "**Tide 0.66 m** falling · safe until 17:28,
     closed from 18:08".
   - Under it, the derived-limits line (oklch(0.93 0.05 155) bg): "Safe while the tide is under 1.30 m, caution up to
     1.80 m, danger above. Now 1.24 m and falling."
4. **Data provenance row** (#E6E2D9): "LINZ tide predictions · Auckland" / "Fetched 06:12 today · predictions valid to
   31 Dec 2026" + Refresh. The validity date must come from the bundled years in `tides/`, not a constant.
5. **"Next 7 days"** head with an "Over 1 hour only" toggle; a legend line (Safe — 0.5 m spare / Caution / Danger).
6. **Day rows** — today's row white with a 1px oklch(0.88 0.02 232) border, others transparent. Day label 48px column;
   then one line per window: status dot 9px, times 18px/700 tabular-nums, and the safe sub-range in 12.5px
   ("safe 13:52–17:28", or "caution throughout" when there is no safe core; the current window reads "now · safe to 17:28").
   Ends with "Show all 14 days →".
7. **Best-window card** and a one-line footer: OBC gap table · Bridge location · v9.3.

### Desktop (design id 2B, 1180 px)
- **Full-width header**: logo 42px, title + (BETA), location, the same description sentence, and on the right status pills
  ("LINZ data · updated 06:12", "Offline copy saved"), an outlined Refresh, and links to the OBC gap table PDF and map.
- **Left rail 340px** (#0A1628): "Check a time" (date ‹ › and time with Now) → Select bridge span → Safety margin →
  Boat height → "Windows over 1 hour" toggle → derived-limits panel.
- **Main area** (#EFECE5): title "Passage windows, 2 – 8 September" with the three-state legend; range buttons
  This week / Next week / Pick dates.
- **Result strip** full width, two rows: 16:00 / Tue 2 Sep, divider, the two 38px figures, status pill right; hairline;
  then "Required 4.40 m — boat 3.90 m + 0.50 m margin · Tide 0.66 m falling · Safe until 17:28 · closed from 18:08".
- **Week grid** (white, radius 18): hour scale, one row per day, day label 106px, 38px track (#EFECE5, radius 9). Each
  window is a caution-coloured band with a green core inside it, positioned left = start/1440, width = duration/1440, and
  labelled with its times. A 2px #0A1628 line marks now on today's row.
- **Tide curve card**: the day's curve with dashed limits at the caution tide (oklch(0.55 0.16 25)) and the safe tide
  (oklch(0.62 0.12 85)), passable bands shaded, now line and dot.
- **Plan a trip card** (300px): out/back times, longest window this week, "Alert me 30 min before it ends",
  "Add to calendar".

### Negative result (design id 3A)
When spare < 0 the result panel turns red (oklch(0.62 0.17 25) on oklch(0.98 0.02 25)) and the second figure changes
meaning: not spare but **shortfall**, e.g. "−1.05 m / Short of what you need", with the gap still shown. Never print a
spare figure when there is none. Below it: "Next safe passage 02:18 tomorrow · Caution from 02:18, safe 02:58 – 05:42"
with a Remind me action, and a line stating the two tide levels being waited for ("Tide must fall to 1.80 m before you fit
at all, and to 1.30 m for 0.5 m spare").

### Expanded day (design id 3B)
Tapping a day row expands it in place (the list stays around it; tap again to collapse). Contents:
- Day heading with a collapse affordance.
- That day's tide curve with both dashed limits and the passable bands.
- High/low summary: "High 09:24 · 3.2 m   Low 15:40 · 0.6 m   High 21:52 · 3.3 m".
- Per window: dot + times + duration, then three cards — **Opens** (gap 4.40 m, 0.00 m spare), **Best** (5.60 m,
  1.20 m spare, highlighted green), **Closes** (4.40 m, 0.00 m spare) — then "Safe 13:52 – 17:28 · caution either side".
- Actions: "Remind me 17:38" and "Check a time" (loads that date into the picker).
On desktop the same detail loads into the existing tide-curve card instead of expanding a row.

## Interactions
- No submit button. Any input change recalculates the limits, the result panel, the day rows and the week grid.
- Steppers 0.05 m; margin floor 0; long-press to repeat.
- Date ‹ › moves a day; "Pick a date" opens the platform picker bounded by the prediction range. Time has a "Now" chip.
- Boat height and margin persist to localStorage (the current site already remembers boat height).
- "Over 1 hour only" filters windows shorter than 60 minutes.
- Reminders: local notification, default 30 min before a window closes.
- Refresh maps to the existing force-refresh path. Loading shows cached results with a "checking" state, never a blocking
  spinner; on error keep cached results, mark them stale, offer Try again / Use cached data.
- States to handle: open now, closed now (time to next opening), no window today, no safe core in a window, three or more
  windows in a day, boat height not yet entered (status block shows bridge gap only).

## Design tokens
- Navy #0A1628 · warm paper #F7F5F0 · app background #EFECE5 · recessed #E6E2D9 · track #E2DED5 · card white #FFFFFF
- Safe oklch(0.80 0.16 155), text on safe #08240F; soft fills oklch(0.88 0.09 155) / oklch(0.93 0.05 155)
- Caution oklch(0.86 0.13 85), text oklch(0.32 0.08 70); danger oklch(0.62 0.17 25); BETA tag oklch(0.86 0.12 85)
- Links / interactive oklch(0.52 0.13 232), hover oklch(0.40 0.13 232)
- Muted on light oklch(0.50 0.02 232) / oklch(0.42 0.02 232); muted on navy oklch(0.74 0.03 232)
- Type: Archivo 400–800 throughout; Archivo Narrow 400–700 for uppercase labels, hour scales and tags. Window times use
  font-variant-numeric: tabular-nums.
- Sizes in use: 11 / 12 / 12.5 / 13 / 13.5 / 14 / 15 / 16 / 17 / 18 / 19 / 22 / 26 / 34 / 38 / 40 px
- Radii 9–22, pills 999. Minimum touch target 46 px.

## Assets
uploads/logo.png — OBC logo, 165×114, white artwork on transparency; must sit on a dark surface.

## Files in this bundle
- `Bridge Clearance Redesign.dc.html` — the design. Turn 3 (top): 3A negative result, 3B expanded day. Turn 2: 2A mobile,
  2B desktop — the main spec. Turn 1 (bottom): three early explorations, history only, not a spec.
- `uploads/logo.png`, `support.js` (runtime for the design file).
