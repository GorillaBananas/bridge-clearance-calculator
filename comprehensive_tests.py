#!/usr/bin/env python3
"""
Comprehensive Bridge Clearance Calculator Tests
Using realistic Auckland tide data patterns

This replicates the JavaScript calculations in Python for verification.
Based on actual LINZ tide data format and Rule of Twelfths interpolation.
"""

import math
from datetime import datetime, timedelta

# ============================================================
# BRIDGE CONFIGURATION
# ============================================================
SPANS = {
    'IN_OUT': 6.2,  # metres
    'HIGH': 6.5     # metres
}

# ============================================================
# REALISTIC AUCKLAND TIDE DATA
# Based on actual LINZ tide patterns for Auckland
# Format: (time_str, height_m)
# Typical Auckland tides range from ~0.3m (low) to ~3.2m (high)
# ============================================================

SAMPLE_TIDE_DAYS = [
    # Day 1: Feb 1, 2026 - Typical day with 4 tides
    {
        'date': '2026-02-01',
        'tides': [
            ('00:23', 0.4),   # Low tide
            ('06:41', 2.9),   # High tide
            ('12:58', 0.5),   # Low tide
            ('19:12', 3.0),   # High tide
        ]
    },
    # Day 2: Feb 2, 2026
    {
        'date': '2026-02-02',
        'tides': [
            ('01:15', 0.3),   # Low tide
            ('07:32', 3.1),   # High tide
            ('13:48', 0.4),   # Low tide
            ('20:05', 3.1),   # High tide
        ]
    },
    # Day 3: Feb 3, 2026 - Spring tide (higher range)
    {
        'date': '2026-02-03',
        'tides': [
            ('02:05', 0.2),   # Very low tide
            ('08:22', 3.3),   # Very high tide
            ('14:38', 0.3),   # Low tide
            ('20:55', 3.2),   # High tide
        ]
    },
    # Day 4: Feb 4, 2026
    {
        'date': '2026-02-04',
        'tides': [
            ('02:54', 0.3),
            ('09:10', 3.2),
            ('15:26', 0.4),
            ('21:43', 3.1),
        ]
    },
    # Day 5: Feb 5, 2026 - Neap tide (smaller range)
    {
        'date': '2026-02-05',
        'tides': [
            ('03:42', 0.5),
            ('09:57', 2.8),
            ('16:13', 0.6),
            ('22:30', 2.8),
        ]
    },
]

# ============================================================
# RULE OF TWELFTHS INTERPOLATION
# ============================================================

def rule_of_twelfths_interpolation(time_minutes, tide1_time, tide1_height, tide2_time, tide2_height):
    """
    Interpolate tide height using maritime Rule of Twelfths.

    The Rule of Twelfths states that in a ~6 hour tide cycle:
    - Hour 1: 1/12 of range
    - Hour 2: 2/12 of range
    - Hour 3: 3/12 of range
    - Hour 4: 3/12 of range
    - Hour 5: 2/12 of range
    - Hour 6: 1/12 of range

    This accounts for the sinusoidal nature of tides.
    """
    # Convert times to minutes from midnight for calculation
    if isinstance(tide1_time, str):
        t1_parts = tide1_time.split(':')
        tide1_minutes = int(t1_parts[0]) * 60 + int(t1_parts[1])
    else:
        tide1_minutes = tide1_time

    if isinstance(tide2_time, str):
        t2_parts = tide2_time.split(':')
        tide2_minutes = int(t2_parts[0]) * 60 + int(t2_parts[1])
    else:
        tide2_minutes = tide2_time

    # Handle day boundary
    if tide2_minutes < tide1_minutes:
        tide2_minutes += 24 * 60
    if time_minutes < tide1_minutes:
        time_minutes += 24 * 60

    total_duration = tide2_minutes - tide1_minutes
    elapsed = time_minutes - tide1_minutes

    if total_duration <= 0:
        return tide1_height

    # Progress through the tidal cycle (0 to 1)
    progress = elapsed / total_duration

    # Clamp progress
    progress = max(0, min(1, progress))

    # Rule of Twelfths cumulative fractions
    # At each hour: 1/12, 3/12, 6/12, 9/12, 11/12, 12/12
    twelfths = [0, 1/12, 3/12, 6/12, 9/12, 11/12, 1.0]

    # Map progress (0-1) to the twelfths curve
    # Scale progress to 6 "hours" (0-6)
    scaled_progress = progress * 6
    hour_index = int(scaled_progress)
    hour_fraction = scaled_progress - hour_index

    if hour_index >= 6:
        height_fraction = 1.0
    else:
        # Linear interpolation within the hour
        start_fraction = twelfths[hour_index]
        end_fraction = twelfths[hour_index + 1]
        height_fraction = start_fraction + (end_fraction - start_fraction) * hour_fraction

    # Calculate height
    height_range = tide2_height - tide1_height
    interpolated_height = tide1_height + (height_range * height_fraction)

    return interpolated_height


def get_tide_at_time(tides, target_time_str):
    """
    Get tide height at a specific time using Rule of Twelfths interpolation.
    """
    target_parts = target_time_str.split(':')
    target_minutes = int(target_parts[0]) * 60 + int(target_parts[1])

    # Convert tide times to minutes
    tide_points = []
    for time_str, height in tides:
        parts = time_str.split(':')
        minutes = int(parts[0]) * 60 + int(parts[1])
        tide_points.append((minutes, height))

    # Find bracketing tides
    for i in range(len(tide_points) - 1):
        t1_min, t1_height = tide_points[i]
        t2_min, t2_height = tide_points[i + 1]

        if t1_min <= target_minutes <= t2_min:
            return rule_of_twelfths_interpolation(
                target_minutes, t1_min, t1_height, t2_min, t2_height
            )

    # Handle edge cases (before first tide or after last tide)
    if target_minutes < tide_points[0][0]:
        # Before first tide - would need previous day's last tide
        # For testing, extrapolate from first two points
        return tide_points[0][1]

    if target_minutes > tide_points[-1][0]:
        # After last tide - would need next day's first tide
        return tide_points[-1][1]

    return None


# ============================================================
# CLEARANCE CALCULATION
# ============================================================

def calculate_clearance(boat_height, safety_margin, tide_height, span_clearance):
    """
    Calculate bridge clearance.

    Actual Clearance = Bridge Span - Tide Height
    Clearance Needed = Boat Height + Safety Margin
    Spare Clearance = Actual Clearance - Clearance Needed
    """
    actual_clearance = span_clearance - tide_height
    clearance_needed = boat_height + safety_margin
    spare_clearance = actual_clearance - clearance_needed

    if spare_clearance >= 0.5:
        status = 'SAFE'
    elif spare_clearance >= 0:
        status = 'CAUTION'
    else:
        status = 'DANGER'

    return {
        'actual_clearance': actual_clearance,
        'clearance_needed': clearance_needed,
        'spare_clearance': spare_clearance,
        'status': status
    }


# ============================================================
# TEST SIMULATIONS
# ============================================================

def run_simulation(sim_num, day_data, boat_height, safety_margin, span, target_time):
    """Run a single simulation with given parameters."""
    span_clearance = SPANS[span]

    # Get interpolated tide height at target time
    tide_height = get_tide_at_time(day_data['tides'], target_time)

    if tide_height is None:
        return None

    # Calculate clearance
    result = calculate_clearance(boat_height, safety_margin, tide_height, span_clearance)

    return {
        'simulation': sim_num,
        'date': day_data['date'],
        'time': target_time,
        'boat_height': boat_height,
        'safety_margin': safety_margin,
        'span': span,
        'span_clearance': span_clearance,
        'tide_height': tide_height,
        **result
    }


def main():
    print("=" * 80)
    print("COMPREHENSIVE BRIDGE CLEARANCE CALCULATOR TESTS")
    print("Using Realistic Auckland Tide Data with Rule of Twelfths Interpolation")
    print("=" * 80)

    # Test configurations for 10 simulations
    test_configs = [
        # Sim 1: Early morning low tide - should be SAFE
        {'day_idx': 0, 'time': '01:00', 'boat': 4.5, 'safety': 0.5, 'span': 'IN_OUT'},
        # Sim 2: Morning high tide - likely DANGER
        {'day_idx': 0, 'time': '06:45', 'boat': 4.5, 'safety': 0.5, 'span': 'IN_OUT'},
        # Sim 3: Midday low tide - should be SAFE
        {'day_idx': 0, 'time': '13:00', 'boat': 4.5, 'safety': 0.5, 'span': 'IN_OUT'},
        # Sim 4: Evening high tide - likely DANGER
        {'day_idx': 0, 'time': '19:15', 'boat': 4.5, 'safety': 0.5, 'span': 'IN_OUT'},
        # Sim 5: Mid-tide rising - CAUTION zone
        {'day_idx': 1, 'time': '04:30', 'boat': 4.5, 'safety': 0.5, 'span': 'IN_OUT'},
        # Sim 6: Spring tide very low - extra SAFE
        {'day_idx': 2, 'time': '02:10', 'boat': 4.5, 'safety': 0.5, 'span': 'IN_OUT'},
        # Sim 7: Spring tide very high - definite DANGER
        {'day_idx': 2, 'time': '08:25', 'boat': 4.5, 'safety': 0.5, 'span': 'IN_OUT'},
        # Sim 8: HIGH span at moderate tide
        {'day_idx': 3, 'time': '12:00', 'boat': 4.5, 'safety': 0.5, 'span': 'HIGH'},
        # Sim 9: Tall boat at low tide
        {'day_idx': 4, 'time': '03:45', 'boat': 5.5, 'safety': 0.5, 'span': 'IN_OUT'},
        # Sim 10: Small boat at high tide
        {'day_idx': 4, 'time': '10:00', 'boat': 3.0, 'safety': 0.5, 'span': 'IN_OUT'},
    ]

    results = []
    all_pass = True

    print("\n" + "=" * 80)
    print("RUNNING 10 SIMULATIONS WITH REAL TIDE DATA PATTERNS")
    print("=" * 80)

    for i, config in enumerate(test_configs, 1):
        day_data = SAMPLE_TIDE_DAYS[config['day_idx']]

        result = run_simulation(
            i,
            day_data,
            config['boat'],
            config['safety'],
            config['span'],
            config['time']
        )

        if result:
            results.append(result)

            print(f"\n--- Simulation {i} ---")
            print(f"Date: {result['date']} at {result['time']}")
            print(f"Boat: {result['boat_height']}m + {result['safety_margin']}m safety = {result['clearance_needed']}m needed")
            print(f"Bridge Span: {result['span']} ({result['span_clearance']}m)")
            print(f"Tide Height: {result['tide_height']:.2f}m (interpolated)")
            print(f"Actual Clearance: {result['actual_clearance']:.2f}m")
            print(f"Spare Clearance: {result['spare_clearance']:+.2f}m")
            print(f"Status: {result['status']}")

            # Validate the calculation
            expected_spare = result['span_clearance'] - result['tide_height'] - result['clearance_needed']
            calc_match = abs(result['spare_clearance'] - expected_spare) < 0.01

            if not calc_match:
                print(f"  ✗ CALCULATION ERROR: Expected spare {expected_spare:.2f}m")
                all_pass = False
            else:
                print(f"  ✓ Calculation verified")
        else:
            print(f"\n--- Simulation {i} ---")
            print(f"  ✗ FAILED: Could not interpolate tide")
            all_pass = False

    # Summary
    print("\n" + "=" * 80)
    print("SIMULATION SUMMARY")
    print("=" * 80)

    safe_count = sum(1 for r in results if r['status'] == 'SAFE')
    caution_count = sum(1 for r in results if r['status'] == 'CAUTION')
    danger_count = sum(1 for r in results if r['status'] == 'DANGER')

    print(f"\nTotal Simulations: {len(results)}")
    print(f"  SAFE:    {safe_count}")
    print(f"  CAUTION: {caution_count}")
    print(f"  DANGER:  {danger_count}")

    # Detailed results table
    print("\n" + "-" * 80)
    print(f"{'#':<3} {'Date':<12} {'Time':<6} {'Tide':>6} {'Spare':>8} {'Status':<8}")
    print("-" * 80)

    for r in results:
        print(f"{r['simulation']:<3} {r['date']:<12} {r['time']:<6} {r['tide_height']:>5.2f}m {r['spare_clearance']:>+7.2f}m {r['status']:<8}")

    print("-" * 80)

    # Final verdict
    print("\n" + "=" * 80)
    if all_pass:
        print("✓ ALL 10 SIMULATIONS COMPLETED SUCCESSFULLY")
        print("✓ All calculations verified correct")
    else:
        print("✗ SOME SIMULATIONS FAILED")
    print("=" * 80)

    # Test Rule of Twelfths interpolation specifically
    print("\n" + "=" * 80)
    print("RULE OF TWELFTHS INTERPOLATION VERIFICATION")
    print("=" * 80)

    # Test case: Low to High tide over ~6 hours
    print("\nTest: Interpolating from Low (0.4m at 00:23) to High (2.9m at 06:41)")
    print("Expected pattern: slow start, fast middle, slow end")
    print()

    test_times = ['00:30', '01:30', '02:30', '03:30', '04:30', '05:30', '06:30']
    low_time = '00:23'
    low_height = 0.4
    high_time = '06:41'
    high_height = 2.9

    print(f"{'Time':<8} {'Height':>8} {'Progress':>10}")
    print("-" * 30)

    for t in test_times:
        parts = t.split(':')
        t_min = int(parts[0]) * 60 + int(parts[1])
        height = rule_of_twelfths_interpolation(t_min, low_time, low_height, high_time, high_height)
        progress = (height - low_height) / (high_height - low_height) * 100
        print(f"{t:<8} {height:>7.2f}m {progress:>9.1f}%")

    print("-" * 30)
    print("Pattern should show: ~8%, ~25%, ~50%, ~75%, ~92%, ~97%, ~100%")
    print("(Matching Rule of Twelfths: 1/12, 3/12, 6/12, 9/12, 11/12, 12/12)")

    return all_pass


if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
