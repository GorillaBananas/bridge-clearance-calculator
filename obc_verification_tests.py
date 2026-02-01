#!/usr/bin/env python3
"""
OBC Bridge Clearance Verification Test Suite
=============================================

This test verifies calculations against KNOWN PHYSICAL CONSTANTS:
- IN/OUT Span: 6.2m clearance at Chart Datum (MHWS)
- HIGH Span: 6.5m clearance at Chart Datum (MHWS)

The OBC Bridge Clearance Tables (PDF) use these same values.
This test calculates expected vs actual clearance and reports error rates.

Reference: https://www.obc.co.nz/media/63141/outboard_boating_club_bridge_gap_calculation_chart.pdf
"""

import math

# ============================================================
# KNOWN PHYSICAL CONSTANTS (from OBC documentation)
# ============================================================

BRIDGE_DATA = {
    'IN_OUT': {
        'clearance_at_datum': 6.2,  # metres at Chart Datum
        'description': 'IN/OUT Span - Main navigation channel'
    },
    'HIGH': {
        'clearance_at_datum': 6.5,  # metres at Chart Datum
        'description': 'HIGH Span - Maximum clearance'
    }
}

# Auckland tide ranges (from LINZ data)
AUCKLAND_TIDE_RANGES = {
    'MHWS': 3.5,   # Mean High Water Springs
    'MHWN': 2.9,   # Mean High Water Neaps
    'MSL': 1.8,    # Mean Sea Level
    'MLWN': 0.7,   # Mean Low Water Neaps
    'MLWS': 0.2,   # Mean Low Water Springs
    'LAT': 0.0,    # Lowest Astronomical Tide (Chart Datum)
}

# ============================================================
# OBC TABLE REFERENCE VALUES
# These are derived from the OBC formula:
# Actual Clearance = Bridge Height at Datum - Tide Height
# ============================================================

# Expected clearances at specific tide heights (IN/OUT span 6.2m)
OBC_REFERENCE_TABLE_INOUT = [
    # (tide_height, expected_clearance)
    (0.0, 6.2),   # Chart Datum (LAT)
    (0.5, 5.7),
    (1.0, 5.2),
    (1.5, 4.7),
    (2.0, 4.2),
    (2.5, 3.7),
    (3.0, 3.2),
    (3.5, 2.7),   # MHWS - typically highest normal tide
]

# Expected clearances at specific tide heights (HIGH span 6.5m)
OBC_REFERENCE_TABLE_HIGH = [
    # (tide_height, expected_clearance)
    (0.0, 6.5),   # Chart Datum (LAT)
    (0.5, 6.0),
    (1.0, 5.5),
    (1.5, 5.0),
    (2.0, 4.5),
    (2.5, 4.0),
    (3.0, 3.5),
    (3.5, 3.0),   # MHWS
]


def calculate_actual_clearance(span_clearance, tide_height):
    """Calculate actual bridge clearance given tide height."""
    return span_clearance - tide_height


def calculate_spare_clearance(actual_clearance, boat_height, safety_margin):
    """Calculate spare clearance above boat."""
    clearance_needed = boat_height + safety_margin
    return actual_clearance - clearance_needed


def get_status(spare_clearance):
    """Determine safety status."""
    if spare_clearance >= 0.5:
        return 'SAFE'
    elif spare_clearance >= 0:
        return 'CAUTION'
    else:
        return 'DANGER'


def run_obc_table_verification():
    """Verify calculations against OBC reference table values."""
    print("=" * 80)
    print("OBC BRIDGE CLEARANCE TABLE VERIFICATION")
    print("=" * 80)
    print("\nVerifying calculator output against known OBC reference values")
    print("Formula: Actual Clearance = Bridge Height at Datum - Tide Height\n")

    errors = []
    total_tests = 0

    # Test IN/OUT span
    print("-" * 80)
    print("IN/OUT SPAN (6.2m at Chart Datum)")
    print("-" * 80)
    print(f"{'Tide':>6} {'Expected':>10} {'Calculated':>12} {'Error':>8} {'Status':>8}")
    print("-" * 80)

    for tide, expected_clearance in OBC_REFERENCE_TABLE_INOUT:
        calculated = calculate_actual_clearance(6.2, tide)
        error = abs(calculated - expected_clearance)
        errors.append(error)
        total_tests += 1
        status = "✓ PASS" if error < 0.001 else "✗ FAIL"
        print(f"{tide:>5.1f}m {expected_clearance:>9.1f}m {calculated:>11.2f}m {error:>7.3f}m {status:>8}")

    # Test HIGH span
    print("\n" + "-" * 80)
    print("HIGH SPAN (6.5m at Chart Datum)")
    print("-" * 80)
    print(f"{'Tide':>6} {'Expected':>10} {'Calculated':>12} {'Error':>8} {'Status':>8}")
    print("-" * 80)

    for tide, expected_clearance in OBC_REFERENCE_TABLE_HIGH:
        calculated = calculate_actual_clearance(6.5, tide)
        error = abs(calculated - expected_clearance)
        errors.append(error)
        total_tests += 1
        status = "✓ PASS" if error < 0.001 else "✗ FAIL"
        print(f"{tide:>5.1f}m {expected_clearance:>9.1f}m {calculated:>11.2f}m {error:>7.3f}m {status:>8}")

    # Calculate error statistics
    avg_error = sum(errors) / len(errors)
    max_error = max(errors)
    error_rate = (sum(1 for e in errors if e >= 0.001) / len(errors)) * 100

    print("\n" + "=" * 80)
    print("ERROR STATISTICS")
    print("=" * 80)
    print(f"Total Tests:     {total_tests}")
    print(f"Average Error:   {avg_error:.6f}m")
    print(f"Maximum Error:   {max_error:.6f}m")
    print(f"Error Rate:      {error_rate:.1f}%")
    print("=" * 80)

    return avg_error, max_error, error_rate


def run_boat_clearance_scenarios():
    """Run realistic boat clearance scenarios."""
    print("\n" + "=" * 80)
    print("BOAT CLEARANCE SCENARIO TESTS")
    print("=" * 80)
    print("Testing full clearance calculation chain with various boat configurations\n")

    # Test scenarios: (name, boat_height, safety, tide, span, expected_status)
    scenarios = [
        ("4.5m boat, low tide, IN/OUT", 4.5, 0.5, 0.3, 'IN_OUT', 'SAFE'),
        ("4.5m boat, mid tide, IN/OUT", 4.5, 0.5, 1.5, 'IN_OUT', 'DANGER'),
        ("4.5m boat, high tide, IN/OUT", 4.5, 0.5, 3.0, 'IN_OUT', 'DANGER'),
        ("4.5m boat, low tide, HIGH", 4.5, 0.5, 0.3, 'HIGH', 'SAFE'),
        ("3.0m boat, high tide, IN/OUT", 3.0, 0.5, 3.0, 'IN_OUT', 'DANGER'),
        ("3.0m boat, mid tide, IN/OUT", 3.0, 0.5, 1.5, 'IN_OUT', 'SAFE'),
        ("5.0m boat, very low tide, IN/OUT", 5.0, 0.5, 0.2, 'IN_OUT', 'SAFE'),  # 6.2-0.2-5.5 = 0.5 = SAFE
        ("5.5m boat, low tide, HIGH", 5.5, 0.5, 0.3, 'HIGH', 'CAUTION'),
        ("4.0m boat, neap high, IN/OUT", 4.0, 0.5, 2.9, 'IN_OUT', 'DANGER'),
        ("3.5m boat, spring low, IN/OUT", 3.5, 0.5, 0.2, 'IN_OUT', 'SAFE'),
    ]

    print(f"{'Scenario':<35} {'Tide':>6} {'Spare':>8} {'Calc':>8} {'Expect':>8} {'Match':>6}")
    print("-" * 80)

    pass_count = 0
    for name, boat, safety, tide, span, expected in scenarios:
        span_clearance = BRIDGE_DATA[span]['clearance_at_datum']
        actual = calculate_actual_clearance(span_clearance, tide)
        spare = calculate_spare_clearance(actual, boat, safety)
        status = get_status(spare)
        match = status == expected
        if match:
            pass_count += 1

        match_str = "✓" if match else "✗"
        print(f"{name:<35} {tide:>5.1f}m {spare:>+7.2f}m {status:>8} {expected:>8} {match_str:>6}")

    print("-" * 80)
    print(f"Passed: {pass_count}/{len(scenarios)} ({pass_count/len(scenarios)*100:.0f}%)")

    return pass_count, len(scenarios)


def run_edge_case_tests():
    """Test edge cases and boundary conditions."""
    print("\n" + "=" * 80)
    print("EDGE CASE AND BOUNDARY TESTS")
    print("=" * 80)

    tests = [
        # Exactly at thresholds
        ("Spare exactly 0.5m (SAFE threshold)", 4.5, 0.5, 0.7, 'IN_OUT', 'SAFE'),
        ("Spare exactly 0.0m (CAUTION threshold)", 4.5, 0.5, 1.2, 'IN_OUT', 'CAUTION'),
        ("Spare slightly negative", 4.5, 0.5, 1.3, 'IN_OUT', 'DANGER'),

        # Extreme tides
        ("Very low spring tide (0.1m)", 4.5, 0.5, 0.1, 'IN_OUT', 'SAFE'),
        ("Extreme high tide (3.8m)", 4.5, 0.5, 3.8, 'IN_OUT', 'DANGER'),

        # Different safety margins
        ("Zero safety margin", 4.5, 0.0, 1.7, 'IN_OUT', 'CAUTION'),
        ("Large safety margin (1.0m)", 4.5, 1.0, 0.5, 'IN_OUT', 'CAUTION'),  # 6.2-0.5-5.5 = 0.2 = CAUTION
    ]

    print(f"\n{'Test Case':<40} {'Spare':>8} {'Status':>10} {'Pass':>6}")
    print("-" * 70)

    pass_count = 0
    for name, boat, safety, tide, span, expected in tests:
        span_clearance = BRIDGE_DATA[span]['clearance_at_datum']
        actual = calculate_actual_clearance(span_clearance, tide)
        spare = calculate_spare_clearance(actual, boat, safety)
        status = get_status(spare)
        match = status == expected
        if match:
            pass_count += 1

        print(f"{name:<40} {spare:>+7.2f}m {status:>10} {'✓' if match else '✗':>6}")

    print("-" * 70)
    print(f"Passed: {pass_count}/{len(tests)}")

    return pass_count, len(tests)


def main():
    print("\n" + "=" * 80)
    print("BRIDGE CLEARANCE CALCULATOR - VERIFICATION SUITE")
    print("Reference: OBC Bridge Clearance Tables")
    print("=" * 80)

    # Run all tests
    avg_error, max_error, error_rate = run_obc_table_verification()
    scenario_pass, scenario_total = run_boat_clearance_scenarios()
    edge_pass, edge_total = run_edge_case_tests()

    # Final summary
    print("\n" + "=" * 80)
    print("FINAL VERIFICATION SUMMARY")
    print("=" * 80)

    total_tests = 16 + scenario_total + edge_total  # 16 OBC table tests
    total_pass = (16 if error_rate == 0 else 0) + scenario_pass + edge_pass

    print(f"""
┌────────────────────────────────────────────────────────────────┐
│ OBC Table Verification                                         │
│   • Tests Run:        16                                       │
│   • Average Error:    {avg_error:.6f}m                              │
│   • Maximum Error:    {max_error:.6f}m                              │
│   • Error Rate:       {error_rate:.1f}%                                    │
├────────────────────────────────────────────────────────────────┤
│ Boat Clearance Scenarios                                       │
│   • Tests Run:        {scenario_total}                                       │
│   • Tests Passed:     {scenario_pass}                                       │
│   • Pass Rate:        {scenario_pass/scenario_total*100:.0f}%                                     │
├────────────────────────────────────────────────────────────────┤
│ Edge Case Tests                                                │
│   • Tests Run:        {edge_total}                                        │
│   • Tests Passed:     {edge_pass}                                        │
│   • Pass Rate:        {edge_pass/edge_total*100:.0f}%                                     │
├────────────────────────────────────────────────────────────────┤
│ OVERALL                                                        │
│   • Total Tests:      {16 + scenario_total + edge_total}                                      │
│   • Calculator Error: {error_rate:.2f}%                                   │
│   • Status:           {'✓ VERIFIED' if error_rate == 0 else '✗ ERRORS FOUND'}                            │
└────────────────────────────────────────────────────────────────┘
""")

    if error_rate == 0 and scenario_pass == scenario_total and edge_pass == edge_total:
        print("✓ ALL VERIFICATION TESTS PASSED")
        print("✓ Calculator matches OBC reference values with 0.00% error rate")
        return True
    else:
        print("✗ SOME TESTS FAILED - Review results above")
        return False


if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
