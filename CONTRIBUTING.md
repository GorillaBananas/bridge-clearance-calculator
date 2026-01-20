# Contributing to Bridge Clearance Calculator

Thank you for considering contributing to this project! This guide will help you get started.

## 🎯 Ways to Contribute

- **Bug Reports**: Found a calculation error or UI issue? Open an issue!
- **Feature Requests**: Have ideas for improvements? We'd love to hear them!
- **Code Contributions**: Fix bugs, add features, or improve documentation
- **Testing**: Validate calculations against real-world conditions
- **Documentation**: Improve README, add examples, or clarify instructions

## 🔧 Development Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/bridge-clearance-calculator.git
   cd bridge-clearance-calculator
   ```

2. **Test locally**
   ```bash
   # Option 1: Direct open
   open index.html
   
   # Option 2: Local server (recommended)
   python3 -m http.server 8000
   # Open http://localhost:8000
   ```

3. **Run validation tests**
   ```bash
   python3 validation_tests.py
   ```

## 📋 Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Keep commits focused and atomic
   - Write clear commit messages
   - Test thoroughly

3. **Test everything**
   - ✅ All calculations produce correct results
   - ✅ UI works on mobile and desktop
   - ✅ Safari, Chrome, and Firefox compatibility
   - ✅ Validation tests pass

4. **Submit PR**
   - Describe what you changed and why
   - Reference any related issues
   - Include screenshots for UI changes

## 🧪 Testing Guidelines

### Calculation Tests
Always validate against known scenarios:
```python
# Example test case
boat_height = 4.5
safety_margin = 0.5
tide_height = 1.0
bridge_clearance = 6.2

actual_clearance = bridge_clearance - tide_height  # = 5.2m
spare_clearance = actual_clearance - (boat_height + safety_margin)  # = 0.2m
# Status: CAUTION (0m ≤ 0.2m < 0.5m)
```

### Browser Testing
Test on:
- Safari (macOS and iOS)
- Chrome (desktop and mobile)
- Firefox
- Edge

### Manual Test Scenarios
1. **Date selection**: Try past, current, and future dates (2024-2028)
2. **Time changes**: Verify results update when time changes
3. **Bridge spans**: Switch between IN/OUT and HIGH
4. **Edge cases**: 
   - Very tall boats (no safe times)
   - Very low tides (all times safe)
   - Dates outside 2024-2028 range

## 🎨 Code Style

### HTML/CSS
- Use semantic HTML5
- Follow BEM-like naming for CSS classes
- Maintain mobile-first responsive design
- Keep CSS organized by component

### JavaScript
- Use modern ES6+ features
- Keep functions focused and small
- Add comments for complex calculations
- Use descriptive variable names

### Example:
```javascript
// Good
function calculateSpareClearance(actualClearance, boatHeight, safetyMargin) {
    return actualClearance - (boatHeight + safetyMargin);
}

// Avoid
function calc(a, b, c) {
    return a - (b + c);
}
```

## 📐 Calculation Accuracy

**CRITICAL**: Never modify calculation formulas without:
1. Understanding the maritime standards
2. Validating against official data
3. Updating validation tests
4. Documenting changes

The core formula is:
```
Spare Clearance = (Bridge Clearance - Tide Height) - (Boat Height + Safety Margin)
```

## 🐛 Bug Reports

Include:
- Browser and version
- Device (desktop/mobile)
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Date/time inputs used

Example:
```
Browser: Safari 17.2 (macOS)
Issue: Time picker not showing
Steps: 
1. Open index.html
2. Click time input field
3. Expected: Time picker appears
4. Actual: Only manual text entry
```

## 💡 Feature Requests

We're interested in:
- Additional NZ bridge locations
- Weather integration
- Barometric pressure adjustments
- Multi-day planning
- Calendar export
- PWA capabilities

Please check existing issues first to avoid duplicates.

## 📝 Commit Message Guidelines

Use clear, descriptive messages:
```bash
# Good
git commit -m "Fix: Time selection not updating results on second click"
git commit -m "Add: Display tide direction in safe windows"
git commit -m "Docs: Add browser compatibility section to README"

# Avoid
git commit -m "fix bug"
git commit -m "updates"
```

Prefix types:
- `Fix:` Bug fixes
- `Add:` New features
- `Update:` Changes to existing features
- `Docs:` Documentation only
- `Style:` Formatting, CSS changes
- `Refactor:` Code restructuring
- `Test:` Adding/updating tests

## ⚖️ Legal

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙋 Questions?

- Open an issue for questions
- Tag with "question" label
- We'll respond ASAP!

## 🎉 Recognition

Contributors will be recognized in the README. Thank you for making this tool better for the Auckland boating community!

---

**Happy Contributing! ⛵**
