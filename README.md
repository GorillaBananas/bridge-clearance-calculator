# Auckland Bridge Clearance Calculator

A beautiful, validated web application for calculating safe passage times under the Tamaki Drive bridge in Auckland, New Zealand.

## 🌊 Features

- **Official LINZ tide data**, bundled with the site so it loads without a CORS proxy
- **Dual bridge spans**: IN/OUT (6.2m) and HIGH (6.5m) clearance options
- **Planning first**: passage windows for the next seven or fourteen days, not one
  moment at a time
- **No submit button**: the answer, the day rows and the week grid redraw as you
  change the date, time, span, margin or boat height
- **Safe, caution and danger**: a window is safe where at least 0.5m of spare
  remains, caution where the boat fits with less, and is never drawn across a
  period the boat does not fit
- **Mobile first**: one layout at two widths; the setup panel becomes a left rail
  and the day list becomes a week grid on a clock at 1000px and up
- **Validated calculations**: checked against every value of the OBC published chart

## 🚤 How It Works

The calculator uses the formula:
```
Actual Clearance = Bridge Clearance at Chart Datum - Tide Height
Spare Clearance = Actual Clearance - (Boat Height + Safety Margin)
```

**Safety Status:**
- **SAFE**: Spare clearance ≥ 0.5m (green)
- **CAUTION**: 0m ≤ Spare clearance < 0.5m (orange)
- **DANGER**: Spare clearance < 0m (red)

## 📊 Data Source

Tide data is sourced from **LINZ (Land Information New Zealand)** official Auckland
tide tables, in CSV format with high/low tide predictions.

### How tide data is resolved

The app tries three sources in order and uses the first that returns valid data:

1. **Bundled** — `tides/auckland_{year}.csv`, served same-origin from this repo.
   No CORS proxy, nothing to rate-limit, and the file is version controlled.
   Currently bundled: **2026-2029**.
2. **Browser cache** — a previously fetched year held in `localStorage` for 30 days.
3. **LINZ via CORS proxy** — corsproxy.io → allorigins → codetabs.

The proxy path is last because free proxies are unreliable: corsproxy.io's free
tier is now localhost-only and always fails from github.io, and the others are
rate-limited with no SLA. Relying on them is what broke tide loading before.

Every payload is validated before use or caching. A proxy that returns an HTML
error page with HTTP 200 is rejected rather than stored, so a bad response can no
longer poison the cache for 30 days.

### Adding a year

```bash
./fetch_tides.sh              # current year plus the next two
./fetch_tides.sh 2029         # or a specific year
git add tides/ && git commit -m "Add 2029 tide data"
```

The script downloads from LINZ, checks each file contains a full year of real tide
rows, and only then writes it into `tides/`. A monthly GitHub Actions job
(`.github/workflows/refresh-tides.yml`) runs the same script with `--best-effort`
and opens a pull request when the data changes; a year LINZ has not published yet
is skipped rather than failing the run.

LINZ publishes a few years ahead — currently through 2029 — so the bundled files
run out before the app does. Merging the monthly PR is what keeps them current.

Years that are not bundled still work — they fall through to the cache and proxy
paths — they are just less reliable, so keeping `tides/` current is worthwhile.

## 🎯 Use Cases

1. **Check specific time**: Enter your planned departure time to check clearance
2. **Find safe windows**: View all safe passage times for the day
3. **Plan around tides**: See tide direction (rising/falling) and clearance at window start/end
4. **Safety planning**: Adjust safety margins based on conditions

## 🛠️ Technical Details

### Technologies
- Pure HTML/CSS/JavaScript (no dependencies)
- Modern CSS with backdrop-filter for glass effects
- Fetch API, same-origin for bundled tide data and CORS-proxied only as a fallback
- Responsive design with CSS Grid and Flexbox

### Browser Support
- Safari (macOS and iOS) ✓
- Chrome/Edge ✓
- Firefox ✓
- Mobile browsers ✓

### Performance
- Lightweight: Single HTML file
- Fast loading: No external dependencies
- Offline-ready: Once loaded, works without internet (for cached dates)

## 🚀 Quick Start

### Option 1: Direct Use
Simply open `index.html` in any modern web browser. The app will:
1. Set today's date automatically
2. Load tide data from LINZ via CORS proxy
3. Calculate clearances based on your inputs

### Option 2: Local Server (Recommended)
For best performance, serve via HTTP:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js
npx http-server

# Then open http://localhost:8000
```

### Option 3: Deploy to GitHub Pages
1. Fork this repository
2. Go to Settings → Pages
3. Set source to "main branch"
4. Your app will be live at `https://yourusername.github.io/bridge-clearance-calculator`

## 📱 Usage Instructions

1. **Boat height**: waterline to your highest point, unladen. Remembered on this
   device, so it only has to be set once.
2. **Safety margin**: how much clearance you want left above the boat. Steps of
   0.05m; 0 is valid and shows the bare gap.
3. **Bridge span**: IN/OUT (6.2m) or HIGH (6.5m).
4. **Date and time**: the moment you want an answer for. "Now" jumps to the
   current time; the arrows step a day.

The verdict for that moment appears directly under the inputs, and the passage
windows for the coming week appear below it. Tap a day to open its tide curve
and see what each window opens, peaks and closes at. There is nothing to submit.

## ⚠️ Important Safety Notes

- **Chart Datum**: Clearances are measured at lowest astronomical tide
- **Weather impact**: Barometric pressure and wind can affect tide heights
- **Safety first**: Always add extra margin in adverse conditions
- **Use as guide**: This tool provides estimates - verify conditions before passage
- **Official sources**: Cross-reference with official navigation charts

## 🧪 Validation

The calculator has been validated against:
- ✅ OBC (Outboard Boating Club) documentation
- ✅ LINZ tide table format specifications
- ✅ 5 different scenario calculations
- ✅ Real-world tide data comparisons

Run the full suite:
```bash
python3 validation_tests.py              # clearance thresholds
python3 real_linz_verification_tests.py  # against real LINZ tide data
python3 obc_verification_tests.py        # clearance arithmetic
python3 comprehensive_tests.py           # end-to-end scenarios

# Using the real functions extracted from index.html
TZ=Pacific/Auckland node node_extract_tests.js   # tide data path and parser
node obc_chart_verification.js                   # against the OBC published chart
```

### Validation against the OBC chart

`obc_chart_verification.js` checks the calculator against every cell of the
[OBC Bridge Gap Calculation Chart](https://www.obc.co.nz/media/63141/outboard_boating_club_bridge_gap_calculation_chart.pdf),
transcribed verbatim: 11 tidal ranges × 7 hourly steps, both spans, rising and
falling. 407 values, no disagreement beyond the chart's own 2 dp rounding.

The chart states its own method — "the 'Rule of Twelfths' has been used to
calculate tidal heights on this chart" — and its span figures, 6.2 m at chart
datum for the IN/OUT spans and "+0.3 m" for High, are the ones the app uses.

Where a value falls exactly on a half-centimetre boundary the app displays the
conservative cent, never more clearance than the chart shows. The test asserts
that direction explicitly.

Note that `obc_verification_tests.py`, despite its name, checks clearance
arithmetic against values re-derived from the same formula rather than against
the published chart. `obc_chart_verification.js` is the one that validates
against OBC's actual numbers.

`node_extract_tests.js` pulls `parseLinzCsv`, `getNZTimezoneOffset`,
`ruleOfTwelfthsHeight` and `TideDataService` straight out of `index.html`, so the
shipped code is what gets tested. It covers the bundled/cache/proxy fallback
order, rejection of HTML payloads, cache self-healing, and the parser.

All of it runs on every push and pull request via `.github/workflows/tests.yml`.

## 🐛 Known Issues & Fixes

### Version 2.0 (Fixed)
- ✅ Fixed: Time selection not updating results
- ✅ Fixed: Safari desktop time picker not showing
- ✅ Added: Debug info for verification
- ✅ Improved: Start/End clearance display in windows

## 📄 License

MIT License - feel free to use and modify for your needs.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test thoroughly (especially calculations)
4. Submit a pull request

## 📞 Support

For issues or questions:
- Open a GitHub issue
- Check validation tests for calculation verification
- Review LINZ documentation for tide data queries

## 🙏 Acknowledgments

- **LINZ** for providing official tide data
- **OBC** for documentation and validation reference
- Inspired by the Auckland boating community

## 📈 Roadmap

- [ ] Add weather data integration
- [ ] Include barometric pressure adjustments
- [x] Multi-day planning view
- [ ] Export safe times to calendar
- [ ] Additional NZ bridge locations

PWA support is deliberately not on this list. A manifest put the page into
standalone mode on some devices and hid the address bar and navigation buttons,
so there is no manifest and no service worker. That also rules out scheduled
reminders, which have no other delivery mechanism on the web.

---

**Made with ⛵ for Auckland boaters**

*Last updated: January 2026*
