/*
 * Validates the calculator against the Outboard Boating Club's own published
 * Bridge Gap Calculation Chart, not against a reimplementation of its formula.
 *
 * Source (transcribed verbatim, 2 pages):
 *   https://www.obc.co.nz/media/63141/outboard_boating_club_bridge_gap_calculation_chart.pdf
 *
 * The chart states its method explicitly: "Movement in 1/12ths: The 'Rule of
 * Twelfths' has been used to calculate tidal heights on this chart", and
 * "Height of gap at Chart Datum = 6.2metres (Based on marked 'IN' and 'OUT'
 * spans, - for 'High' span, add 0.3m".
 *
 * Each row runs high water to low water over six hours, so this exercises
 * ruleOfTwelfthsHeight() as the chart's authors intended it. The app normalises
 * the curve over the actual interval between two tide points, which reduces to
 * the chart's arithmetic exactly when that interval is six hours.
 *
 * Run:  node obc_chart_verification.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Pull the shipped function out of index.html rather than restating it here
function extractFunction(name) {
    const match = new RegExp('\\n\\s*function ' + name + '\\s*\\(').exec(html);
    assert.ok(match, 'could not find function ' + name + ' in index.html');

    const start = match.index + 1;
    const open = html.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < html.length; i++) {
        if (html[i] === '{') depth++;
        else if (html[i] === '}') { depth--; if (depth === 0) return html.slice(start, i + 1); }
    }
    throw new Error('unbalanced braces');
}

const ruleOfTwelfthsHeight = new Function(
    extractFunction('ruleOfTwelfthsHeight') + '\nreturn ruleOfTwelfthsHeight;')();

// The span clearances the chart specifies, read back out of the app's config
const IN_OUT_GAP = 6.2;
const HIGH_GAP = IN_OUT_GAP + 0.3;

assert.ok(html.includes("selectSpan('in-out', 6.2)"),
    'app IN/OUT span should be 6.2m, per the OBC chart');
assert.ok(html.includes("selectSpan('high', 6.5)"),
    'app HIGH span should be 6.5m (6.2 + 0.3), per the OBC chart');

/*
 * The chart's eleven rows. Each is:
 *   high, low, range, twelfth, then tide height at high / 1h / 2h / 3h / 4h /
 *   5h past high / low, then the gap published beneath each of those.
 *
 * `chartTypo` marks a cell printed incorrectly on the chart itself.
 */
const ROWS = [
    { high: 3.4,  low: 0.4,  range: 3.0,  twelfth: 0.25,
      tide: [3.40, 3.15, 2.65, 1.90, 1.15, 0.65, 0.40],
      gap:  [2.80, 3.05, 3.55, 4.30, 5.05, 5.55, 5.80] },
    { high: 3.3,  low: 0.5,  range: 2.8,  twelfth: 0.23,
      tide: [3.30, 3.07, 2.60, 1.90, 1.20, 0.73, 0.50],
      gap:  [2.90, 3.13, 3.60, 4.30, 5.00, 5.47, 5.70] },
    { high: 3.2,  low: 0.55, range: 2.65, twelfth: 0.22,
      tide: [3.20, 2.98, 2.54, 1.88, 1.21, 0.77, 0.55],
      gap:  [3.00, 3.22, 3.66, 4.33, 4.99, 5.43, 5.65] },
    { high: 3.1,  low: 0.6,  range: 2.5,  twelfth: 0.21,
      tide: [3.10, 2.89, 2.48, 1.85, 1.23, 0.81, 0.60],
      gap:  [3.10, 3.31, 3.73, 4.35, 4.98, 5.39, 5.60] },
    { high: 3.0,  low: 0.65, range: 2.35, twelfth: 0.20,
      tide: [3.00, 2.80, 2.41, 1.83, 1.24, 0.85, 0.65],
      gap:  [3.20, 3.40, 3.79, 4.38, 4.96, 5.35, 5.55] },
    { high: 2.9,  low: 0.7,  range: 2.2,  twelfth: 0.18,
      tide: [2.90, 2.72, 2.35, 1.80, 1.25, 0.88, 0.70],
      gap:  [3.30, 3.48, 3.85, 4.40, 4.95, 5.32, 5.50] },
    { high: 2.8,  low: 0.8,  range: 2.00, twelfth: 0.17,
      tide: [2.80, 2.63, 2.30, 1.80, 1.30, 0.97, 0.80],
      gap:  [3.40, 3.57, 3.90, 4.40, 4.90, 5.23, 5.40] },
    { high: 2.7,  low: 0.9,  range: 1.80, twelfth: 0.15,
      tide: [2.70, 2.55, 2.25, 1.80, 1.35, 1.05, 0.90],
      gap:  [3.50, 3.65, 3.95, 4.40, 4.85, 5.15, 5.30] },
    { high: 2.6,  low: 1.0,  range: 1.60, twelfth: 0.13,
      // The chart prints 2.80 in the "Gap at High Tide" tide-height cell of this
      // row. Its own gap figure of 3.60 (6.2 - 2.60) shows 2.60 is meant.
      tide: [2.60, 2.47, 2.20, 1.80, 1.40, 1.13, 1.00],
      gap:  [3.60, 3.73, 4.00, 4.40, 4.80, 5.07, 5.20],
      chartTypo: { index: 0, printed: 2.80, correct: 2.60 } },
    { high: 2.5,  low: 1.1,  range: 1.40, twelfth: 0.12,
      tide: [2.50, 2.38, 2.15, 1.80, 1.45, 1.22, 1.10],
      gap:  [3.70, 3.82, 4.05, 4.40, 4.75, 4.98, 5.10] },
    { high: 2.4,  low: 1.2,  range: 1.20, twelfth: 0.10,
      tide: [2.40, 2.30, 2.10, 1.80, 1.50, 1.30, 1.20],
      gap:  [3.80, 3.90, 4.10, 4.40, 4.70, 4.90, 5.00] }
];

const HIGH_WATER = new Date(2026, 0, 1, 6, 0, 0);
const LOW_WATER = new Date(2026, 0, 1, 12, 0, 0); // the chart's six-hour cycle

let checks = 0;
const failures = [];

// The chart is printed to two decimal places, so a value sitting exactly on a
// half-centimetre boundary (the app computes 1.825m where the chart prints
// 1.83m) is the chart's rounding, not a disagreement. Half a cent is therefore
// the largest difference that can be attributed to rounding; anything beyond it
// is a genuine mismatch.
const ROUNDING = 0.005 + 1e-9;

function compare(label, expected, actual, tolerance) {
    checks++;
    const delta = Math.abs(expected - actual);
    if (delta > tolerance) {
        failures.push(`${label}: chart ${expected.toFixed(2)}m, app ${actual.toFixed(4)}m (${delta.toFixed(4)}m out)`);
    }
    return delta;
}

console.log('\nValidation against the OBC Bridge Gap Calculation Chart');
console.log('Rule of Twelfths, 6.2m IN/OUT gap at chart datum\n');
console.log('High   Low    Hr  Chart tide  App tide   Chart gap  App gap');
console.log('-'.repeat(64));

let worstTide = 0, worstGap = 0;

ROWS.forEach(row => {
    const before = { time: HIGH_WATER, height: row.high };
    const after = { time: LOW_WATER, height: row.low };

    // The chart's own arithmetic: range and twelfth, rounded as printed
    compare(`range ${row.high}/${row.low}`, row.range, row.high - row.low, ROUNDING);
    compare(`twelfth ${row.high}/${row.low}`, row.twelfth, (row.high - row.low) / 12, ROUNDING);

    for (let hour = 0; hour <= 6; hour++) {
        const at = new Date(HIGH_WATER.getTime() + hour * 3600 * 1000);
        const appTide = ruleOfTwelfthsHeight(before, after, at);
        const appGap = IN_OUT_GAP - appTide;

        // The chart rounds to 2dp, so allow half a centimetre
        const dTide = compare(`tide ${row.high}/${row.low} +${hour}h`, row.tide[hour], appTide, ROUNDING);
        const dGap = compare(`gap ${row.high}/${row.low} +${hour}h`, row.gap[hour], appGap, ROUNDING);
        worstTide = Math.max(worstTide, dTide);
        worstGap = Math.max(worstGap, dGap);

        const flag = row.chartTypo && row.chartTypo.index === hour ? '  <- chart prints ' + row.chartTypo.printed.toFixed(2) : '';
        console.log(
            `${row.high.toFixed(2)}   ${row.low.toFixed(2)}   ${hour}h  ` +
            `${row.tide[hour].toFixed(2)}m      ${appTide.toFixed(2)}m     ` +
            `${row.gap[hour].toFixed(2)}m     ${appGap.toFixed(2)}m${flag}`);
    }
    console.log('-'.repeat(64));
});

// The HIGH span is the same table plus 0.3m, per the chart's own note
ROWS.forEach(row => {
    const before = { time: HIGH_WATER, height: row.high };
    const after = { time: LOW_WATER, height: row.low };
    for (let hour = 0; hour <= 6; hour++) {
        const at = new Date(HIGH_WATER.getTime() + hour * 3600 * 1000);
        const appGapHigh = HIGH_GAP - ruleOfTwelfthsHeight(before, after, at);
        compare(`HIGH span ${row.high}/${row.low} +${hour}h`, row.gap[hour] + 0.3, appGapHigh, ROUNDING);
    }
});

// A rising tide must mirror the chart's falling one
ROWS.forEach(row => {
    const before = { time: HIGH_WATER, height: row.low };
    const after = { time: LOW_WATER, height: row.high };
    for (let hour = 0; hour <= 6; hour++) {
        const at = new Date(HIGH_WATER.getTime() + hour * 3600 * 1000);
        const rising = ruleOfTwelfthsHeight(before, after, at);
        const mirrored = row.high + row.low - row.tide[hour];
        compare(`rising mirror ${row.high}/${row.low} +${hour}h`, mirrored, rising, ROUNDING);
    }
});

// Where the app and the chart differ by a cent of rounding, the app must not be
// the optimistic one. Overstating available clearance is the dangerous direction
// in a tool skippers use to decide whether they fit under a bridge.
let optimistic = 0;
ROWS.forEach(row => {
    const before = { time: HIGH_WATER, height: row.high };
    const after = { time: LOW_WATER, height: row.low };
    for (let hour = 0; hour <= 6; hour++) {
        const at = new Date(HIGH_WATER.getTime() + hour * 3600 * 1000);
        const shown = Number((IN_OUT_GAP - ruleOfTwelfthsHeight(before, after, at)).toFixed(2));
        checks++;
        if (shown > row.gap[hour] + 1e-9) {
            optimistic++;
            failures.push(`gap ${row.high}/${row.low} +${hour}h: app displays ${shown.toFixed(2)}m, ` +
                `more clearance than the chart's ${row.gap[hour].toFixed(2)}m`);
        }
    }
});

console.log(`\n${checks} values checked against the published chart`);
console.log(`Worst tide-height difference: ${worstTide.toFixed(4)}m`);
console.log(`Worst gap difference:         ${worstGap.toFixed(4)}m`);

if (failures.length) {
    console.log(`\n${failures.length} DISAGREEMENTS WITH THE OBC CHART:`);
    failures.forEach(f => console.log('  ✗ ' + f));
    process.exit(1);
}

console.log(`Cells where the app shows more clearance than the chart: ${optimistic}`);
console.log('\nNote: the chart rounds its tide and gap columns independently, so a few');
console.log('cells do not reconcile with each other. At high 3.1m / low 0.6m, four hours');
console.log('past high, it prints tide 1.23m and gap 4.98m, which sum to 6.21m rather');
console.log('than the stated 6.2m gap at chart datum. The app computes 1.225m and');
console.log('4.975m, and displays the conservative cent.');

console.log('\n✓ Every value matches the OBC chart to within its own 2dp rounding');
console.log('✓ Span clearances match: IN/OUT 6.2m, HIGH 6.5m (6.2 + 0.3)');
console.log('✓ Method matches: the chart states it uses the Rule of Twelfths\n');
