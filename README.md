# Auckland Bridge Clearance Calculator

A beautiful, validated web application for calculating safe passage times under the Tamaki Drive bridge in Auckland, New Zealand.

## 🌊 Features

- **Official LINZ tide data**, bundled with the site so it loads without a CORS proxy
- **Dual bridge spans**: IN/OUT (6.2m) and HIGH (6.5m) clearance options
- **Smart calculations**: Accounts for boat height, safety margins, and tide heights
- **Safe passage windows**: Shows all safe times throughout the day with detailed clearance information
- **Beautiful UI**: Ocean-themed gradient design with glass morphism effects
- **Mobile-first**: Fully responsive design optimized for both desktop and mobile
- **Validated calculations**: Comprehensive test suite ensures accuracy

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
(`.github/workflows/refresh-tides.yml`) runs the same script and opens a pull
request when the data changes.

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

1. **Select Bridge Span**: Choose IN/OUT (6.2m) or HIGH (6.5m)
2. **Enter Date**: Pick your travel date (2024-2028)
3. **Enter Time** (optional): Your preferred departure time
4. **Boat Details**: 
   - Height from waterline to highest point
   - Safety margin (recommended: 0.5m minimum)
5. **Check Now**: See clearance for specific time
6. **Find Times**: View all safe windows for the day

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
python3 validation_tests.py            # clearance thresholds
python3 real_linz_verification_tests.py  # against real LINZ 2026 data
python3 obc_verification_tests.py        # against OBC reference values
python3 comprehensive_tests.py           # end-to-end scenarios

# Tide data path, using the real functions extracted from index.html
TZ=Pacific/Auckland node node_extract_tests.js
```

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
- [ ] Multi-day planning view
- [ ] Export safe times to calendar
- [ ] PWA support for offline use
- [ ] Additional NZ bridge locations

---

**Made with ⛵ for Auckland boaters**

*Last updated: January 2026*
