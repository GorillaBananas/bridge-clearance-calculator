# Auckland Bridge Clearance Calculator

A beautiful, validated web application for calculating safe passage times under the Tamaki Drive bridge in Auckland, New Zealand.

## 🌊 Features

- **Real-time tide data** from LINZ (Land Information New Zealand) for 2024-2028
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

Tide data is sourced from **LINZ (Land Information New Zealand)**:
- Official tide tables for Auckland
- Updated annually
- Available for years 2024-2028
- CSV format with high/low tide predictions

## 🎯 Use Cases

1. **Check specific time**: Enter your planned departure time to check clearance
2. **Find safe windows**: View all safe passage times for the day
3. **Plan around tides**: See tide direction (rising/falling) and clearance at window start/end
4. **Safety planning**: Adjust safety margins based on conditions

## 🛠️ Technical Details

### Technologies
- Pure HTML/CSS/JavaScript (no dependencies)
- Modern CSS with backdrop-filter for glass effects
- Fetch API for CORS-proxied tide data
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

Run validation tests:
```bash
python3 validation_tests.py
```

Expected output: `✓ ALL TESTS PASSED (5/5 scenarios)`

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
