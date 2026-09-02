/*
 * Verification harness for the tide-data path in index.html.
 *
 * Extracts the real functions and the real TideDataService out of the single-file
 * app and runs them under Node against the bundled CSV, so the parser and the
 * fetch fallbacks are tested as shipped rather than as a reimplementation.
 *
 * Run from the repo root:  TZ=Pacific/Auckland node node_extract_tests.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// ---------------------------------------------------------------- extraction

function extractBlock(source, startIndex) {
    const open = source.indexOf('{', startIndex);
    let depth = 0;
    let inLine = false, inBlock = false, inStr = null;

    for (let i = open; i < source.length; i++) {
        const ch = source[i], next = source[i + 1];

        if (inLine) { if (ch === '\n') inLine = false; continue; }
        if (inBlock) { if (ch === '*' && next === '/') { inBlock = false; i++; } continue; }
        if (inStr) {
            if (ch === '\\') { i++; continue; }
            if (ch === inStr) inStr = null;
            continue;
        }
        if (ch === '/' && next === '/') { inLine = true; i++; continue; }
        if (ch === '/' && next === '*') { inBlock = true; i++; continue; }
        if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }

        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return source.slice(startIndex, i + 1); }
    }
    throw new Error('unbalanced braces from index ' + startIndex);
}

function extractFunction(name) {
    const marker = new RegExp('\\n\\s*(?:async\\s+)?function ' + name + '\\s*\\(');
    const match = marker.exec(html);
    assert.ok(match, 'could not find function ' + name + ' in index.html');
    return extractBlock(html, match.index + 1);
}

function extractService() {
    const idx = html.indexOf('const TideDataService = {');
    assert.ok(idx !== -1, 'could not find TideDataService in index.html');
    return extractBlock(html, idx) + ';';
}

// Pull a single-line `const NAME = value;` straight out of the app, so the tests
// cannot drift from the threshold the page actually uses.
function extractConst(name) {
    const match = new RegExp('\\n\\s*const ' + name + '\\s*=\\s*([^;]+);').exec(html);
    assert.ok(match, 'could not find const ' + name + ' in index.html');
    return 'const ' + name + ' = ' + match[1].trim() + ';';
}

const FUNCTIONS = [
    'getNZTimezoneOffset',
    'isLinzDataRow',
    'parseLinzCsv',
    'ruleOfTwelfthsHeight',
    'buildInterpolationPoints',
    'findBracketingPoints',
    'generateHourlyTideData',
    'interpolateTideHeight',
    'calculateSafeWindows',
    'safeSpareThreshold',
    'isYearAvailable',
    'addDays',
    'classifyTidePoints',
    'getYearCsv',
    'getDayPoints',
    'computeDayForecast',
    'stitchWindowsAcrossMidnight'
];

// ------------------------------------------------------------------ sandbox

const store = new Map();
const localStorageStub = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear()
};

const fetchLog = [];
let fetchHandler = null;

function fetchStub(url) {
    fetchLog.push(String(url));
    if (!fetchHandler) return Promise.reject(new Error('no handler'));
    return fetchHandler(String(url));
}

const quietConsole = {
    log: () => {}, warn: () => {}, error: () => {}, info: () => {}
};

// interpolateTideHeight reads these module-level globals in the app
const source = 'let nextDayFirstPoint = null, prevDayLastPoint = null;\n' +
    extractConst('SAFE_CUSHION_M') + '\n' +
    extractConst('yearCsvCache') + '\n' +
    FUNCTIONS.map(extractFunction).join('\n\n') + '\n\n' + extractService() +
    '\nfunction setAdjacent(prev, next) { prevDayLastPoint = prev; nextDayFirstPoint = next; }' +
    '\nreturn { ' + FUNCTIONS.join(', ') + ', TideDataService, setAdjacent, SAFE_CUSHION_M, yearCsvCache };';

const api = new Function('localStorage', 'fetch', 'console', 'AbortController', source)(
    localStorageStub, fetchStub, quietConsole, AbortController
);

const {
    isLinzDataRow, parseLinzCsv, ruleOfTwelfthsHeight, buildInterpolationPoints,
    generateHourlyTideData, getNZTimezoneOffset, interpolateTideHeight,
    calculateSafeWindows, safeSpareThreshold, classifyTidePoints, computeDayForecast, addDays,
    stitchWindowsAcrossMidnight,
    TideDataService, setAdjacent
} = api;

const SAFE_CUSHION_M = api.SAFE_CUSHION_M;

// -------------------------------------------------------------------- runner

let passed = 0;
const failures = [];

function test(name, fn) {
    try {
        const result = fn();
        if (result && typeof result.then === 'function') {
            return result.then(
                () => { passed++; console.log('  ✓ ' + name); },
                e => { failures.push([name, e]); console.log('  ✗ ' + name + '\n      ' + e.message); }
            );
        }
        passed++;
        console.log('  ✓ ' + name);
    } catch (e) {
        failures.push([name, e]);
        console.log('  ✗ ' + name + '\n      ' + e.message);
    }
    return Promise.resolve();
}

const TIDES_DIR = path.join(__dirname, 'tides');
const BUNDLED_YEARS = fs.readdirSync(TIDES_DIR)
    .map(f => /^auckland_(\d{4})\.csv$/.exec(f))
    .filter(Boolean)
    .map(m => Number(m[1]))
    .sort((a, b) => a - b);
assert.ok(BUNDLED_YEARS.includes(2026), 'expected tides/auckland_2026.csv');

const CSV_PATH = path.join(TIDES_DIR, 'auckland_2026.csv');
const BUNDLED_CSV = fs.readFileSync(CSV_PATH, 'utf8');

function daysInYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

function resetState() {
    store.clear();
    fetchLog.length = 0;
    fetchHandler = null;
    TideDataService.bundledAvailability = {};
    TideDataService.bundledCsv = {};
    TideDataService.bundledCsvPending = {};
    TideDataService.lastDataSource = null;
    api.yearCsvCache.clear();
}

function csvResponse(text, ok = true, status = 200) {
    return Promise.resolve({ ok, status, text: async () => text });
}

// --------------------------------------------------------------------- tests

async function main() {
    console.log('\nTide data verification (functions extracted from index.html)');

    console.log('\nFix 3 - parser');

    await test('1 January 2026 returns tide points (header-less bundled file)', () => {
        const points = parseLinzCsv(BUNDLED_CSV, new Date(2026, 0, 1));
        assert.ok(points.length >= 3, 'expected tide points for 1 Jan, got ' + points.length);
        points.forEach(p => assert.ok(Number.isFinite(p.height)));
    });

    await test('2 January 2026 returns tide points', () => {
        const points = parseLinzCsv(BUNDLED_CSV, new Date(2026, 0, 2));
        assert.strictEqual(points.length, 4);
    });

    BUNDLED_YEARS.forEach(year => {
        const csv = fs.readFileSync(path.join(TIDES_DIR, 'auckland_' + year + '.csv'), 'utf8');

        test('every day of ' + year + ' parses with finite heights and valid times', () => {
            // The files as published carry a BOM, three header lines and CRLF
            // endings; the 2026 file has none of those. Both must parse.
            let days = 0, points = 0;
            for (let d = new Date(year, 0, 1); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
                const parsed = parseLinzCsv(csv, new Date(d));
                assert.ok(parsed.length >= 3, 'only ' + parsed.length + ' points on ' + d.toDateString());
                parsed.forEach(p => {
                    assert.ok(Number.isFinite(p.height), 'non-finite height on ' + d.toDateString());
                    assert.ok(!isNaN(p.time.getTime()), 'invalid date on ' + d.toDateString());
                    assert.ok(p.height >= -1 && p.height <= 6, 'implausible height ' + p.height);
                });
                days++;
                points += parsed.length;
            }
            assert.strictEqual(days, daysInYear(year));
            assert.ok(points > days * 3.5, 'expected ~4 tides a day, got ' + points + ' over ' + days);
        });

        test(year + ': 1 and 2 January return tide points', () => {
            assert.ok(parseLinzCsv(csv, new Date(year, 0, 1)).length >= 3);
            assert.ok(parseLinzCsv(csv, new Date(year, 0, 2)).length >= 3);
        });

        test(year + ': file validates as tide data', () => {
            assert.strictEqual(TideDataService.isValidTideCsv(csv), true);
            assert.strictEqual(TideDataService.countTideRows(csv), daysInYear(year));
        });
    });

    await test('files with 0, 2 and 3 header lines all parse identically', () => {
        const expected = parseLinzCsv(BUNDLED_CSV, new Date(2026, 0, 1));
        const twoLine = 'Auckland tide predictions\nday,wd,mo,yr,t1,h1,t2,h2\n' + BUNDLED_CSV;
        const threeLine = 'LINZ\nCopyright notice\nday,wd,mo,yr,t1,h1,t2,h2\n' + BUNDLED_CSV;
        [twoLine, threeLine].forEach(variant => {
            const got = parseLinzCsv(variant, new Date(2026, 0, 1));
            assert.strictEqual(got.length, expected.length);
            got.forEach((p, i) => assert.strictEqual(p.height, expected[i].height));
        });
    });

    await test('malformed times and non-numeric heights are dropped, not propagated', () => {
        const row = '15,Su,3,2026,25:99,3.1,08:aa,2.0,12:30,abc,18:06,3.1';
        const points = parseLinzCsv(row, new Date(2026, 2, 15));
        assert.strictEqual(points.length, 1, 'only the well-formed pair should survive');
        assert.strictEqual(points[0].height, 3.1);
        assert.ok(!isNaN(points[0].time.getTime()));
    });

    console.log('\nKnown bug 1 - DST offset resolved per time of day');

    await test('27 September 2026: tides before 02:00 are NZST, after 03:00 are NZDT', () => {
        assert.strictEqual(getNZTimezoneOffset(new Date(2026, 8, 27, 0, 30)), '+12:00');
        assert.strictEqual(getNZTimezoneOffset(new Date(2026, 8, 27, 1, 45)), '+12:00');
        assert.strictEqual(getNZTimezoneOffset(new Date(2026, 8, 27, 3, 30)), '+13:00');
        assert.strictEqual(getNZTimezoneOffset(new Date(2026, 8, 27, 23, 0)), '+13:00');
    });

    await test('5 April 2026: tides before 03:00 are NZDT, after are NZST', () => {
        assert.strictEqual(getNZTimezoneOffset(new Date(2026, 3, 5, 1, 0)), '+13:00');
        assert.strictEqual(getNZTimezoneOffset(new Date(2026, 3, 5, 4, 0)), '+12:00');
    });

    await test('midwinter is NZST and midsummer is NZDT', () => {
        assert.strictEqual(getNZTimezoneOffset(new Date(2026, 5, 15, 12, 0)), '+12:00');
        assert.strictEqual(getNZTimezoneOffset(new Date(2026, 11, 15, 12, 0)), '+13:00');
    });

    console.log('\nKnown bug 2 - one interpolation method everywhere');

    await test('Rule of Twelfths hits the classic checkpoints over the real interval', () => {
        const before = { time: new Date(2026, 0, 1, 0, 0), height: 0 };
        const after = { time: new Date(2026, 0, 1, 6, 30), height: 12 };
        const at = frac => ruleOfTwelfthsHeight(before, after,
            new Date(before.time.getTime() + (after.time - before.time) * frac));
        assert.ok(Math.abs(at(0) - 0) < 1e-9);
        assert.ok(Math.abs(at(1 / 6) - 1) < 1e-9, 'first sixth should be 1/12 of range');
        assert.ok(Math.abs(at(2 / 6) - 3) < 1e-9);
        assert.ok(Math.abs(at(3 / 6) - 6) < 1e-9);
        assert.ok(Math.abs(at(5 / 6) - 11) < 1e-9);
        assert.ok(Math.abs(at(1) - 12) < 1e-9, 'must land exactly on the next tide height');
    });

    await test('never overshoots the bracketing heights on a long interval', () => {
        const before = { time: new Date(2026, 0, 1, 0, 0), height: 3.2 };
        const after = { time: new Date(2026, 0, 1, 7, 30), height: 0.4 };
        for (let m = 0; m <= 450; m += 5) {
            const h = ruleOfTwelfthsHeight(before, after, new Date(2026, 0, 1, 0, m));
            assert.ok(h <= 3.2 + 1e-9 && h >= 0.4 - 1e-9, 'out of range at minute ' + m + ': ' + h);
        }
    });

    await test('falling tides use the same curve as rising tides, mirrored', () => {
        const t0 = new Date(2026, 0, 1, 0, 0);
        const t1 = new Date(2026, 0, 1, 6, 0);
        const rising = ruleOfTwelfthsHeight({ time: t0, height: 0 }, { time: t1, height: 12 },
            new Date(2026, 0, 1, 2, 0));
        const falling = ruleOfTwelfthsHeight({ time: t0, height: 12 }, { time: t1, height: 0 },
            new Date(2026, 0, 1, 2, 0));
        assert.ok(Math.abs(rising - 3) < 1e-9, 'two hours in is 3/12 of range');
        assert.ok(Math.abs(falling - 9) < 1e-9, 'falling must mirror exactly');
        assert.ok(Math.abs((rising + falling) - 12) < 1e-9);
    });

    // The three check types must return the same height for the same instant:
    //   Check Now   -> interpolateTideHeight(tideData, t)
    //   Find Times  -> fullDayTideData sample at t
    //   Chart       -> the same fullDayTideData array
    BUNDLED_YEARS.forEach(year => {
        test(year + ': Check Now, Find Times and the chart agree at every sample', () => {
            const csv = fs.readFileSync(path.join(TIDES_DIR, 'auckland_' + year + '.csv'), 'utf8');
            let compared = 0, worst = 0;

            // Sample a spread of days rather than all 365, including both DST
            // transition weekends and both solstices
            const probeDays = [
                new Date(year, 0, 1), new Date(year, 0, 2), new Date(year, 2, 20),
                new Date(year, 3, 5), new Date(year, 5, 21), new Date(year, 8, 27),
                new Date(year, 9, 15), new Date(year, 11, 31)
            ];

            probeDays.forEach(day => {
                const points = parseLinzCsv(csv, day);
                if (points.length === 0) return;

                const prevDay = new Date(day); prevDay.setDate(prevDay.getDate() - 1);
                const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
                const prevPoints = parseLinzCsv(csv, prevDay);
                const nextPoints = parseLinzCsv(csv, nextDay);
                const prev = prevPoints.length ? prevPoints[prevPoints.length - 1] : null;
                const next = nextPoints.length ? nextPoints[0] : null;
                if (!prev || !next) return; // year boundary, no adjacent data in this file

                setAdjacent(prev, next);

                const series = generateHourlyTideData(
                    buildInterpolationPoints(points, prev, next), day);

                series.forEach(sample => {
                    const checkNow = interpolateTideHeight(points, sample.time);
                    if (!checkNow || checkNow.height === null) return;

                    const delta = Math.abs(checkNow.height - sample.height);
                    worst = Math.max(worst, delta);
                    assert.ok(delta < 1e-9,
                        'disagreement of ' + delta.toFixed(4) + 'm at ' +
                        sample.time.toISOString() + ' (Check Now ' + checkNow.height.toFixed(4) +
                        ' vs series ' + sample.height.toFixed(4) + ')');
                    compared++;
                });
            });

            assert.ok(compared > 500, 'expected many comparisons, got ' + compared);
        });
    });

    console.log('\nKnown bug 3 - day-edge windows use adjacent-day tides');

    await test('adjacent-day anchors extend the series past both edges', () => {
        const day = new Date(2026, 5, 10);
        const points = parseLinzCsv(BUNDLED_CSV, day);
        const prev = parseLinzCsv(BUNDLED_CSV, new Date(2026, 5, 9)).slice(-1)[0];
        const next = parseLinzCsv(BUNDLED_CSV, new Date(2026, 5, 11))[0];

        const augmented = buildInterpolationPoints(points, prev, next);
        assert.strictEqual(augmented.length, points.length + 2);
        for (let i = 1; i < augmented.length; i++) {
            assert.ok(augmented[i].time >= augmented[i - 1].time, 'points must be in time order');
        }

        const flat = generateHourlyTideData(points, day);
        const full = generateHourlyTideData(augmented, day);

        // Before the day's first tide the un-anchored series is held flat at the
        // nearest height; with the previous day's tide it actually moves.
        const firstTide = points[0].time;
        const early = full.filter(s => s.time < firstTide);
        const earlyFlat = flat.filter(s => s.time < firstTide);
        assert.ok(early.length > 0, 'expected samples before the first tide');
        assert.ok(new Set(earlyFlat.map(s => s.height.toFixed(4))).size === 1, 'baseline should be flat');
        assert.ok(new Set(early.map(s => s.height.toFixed(4))).size > 1, 'anchored series should vary');
    });

    console.log('\nFix 2 - payload validation');

    await test('HTML error pages are rejected as tide data', () => {
        const html403 = '<!DOCTYPE html><html><head><title>403 Forbidden</title></head>' +
            '<body><h1>403</h1><p>Rate limit exceeded, try again later</p></body></html>';
        assert.strictEqual(TideDataService.isValidTideCsv(html403), false);
        assert.strictEqual(TideDataService.countTideRows(html403), 0);
        assert.strictEqual(TideDataService.isValidTideCsv(''), false);
        assert.strictEqual(TideDataService.isValidTideCsv(null), false);
        assert.strictEqual(TideDataService.isValidTideCsv('{"error":"proxy unavailable"}'), false);
    });

    await test('real LINZ CSV is accepted and counted', () => {
        assert.strictEqual(TideDataService.isValidTideCsv(BUNDLED_CSV), true);
        assert.strictEqual(TideDataService.countTideRows(BUNDLED_CSV), 365);
    });

    await test('setCachedData refuses a payload with no tide rows', () => {
        resetState();
        assert.strictEqual(TideDataService.setCachedData(2026, '<html>nope</html>'), false);
        assert.strictEqual(store.size, 0, 'nothing should have been written');
        assert.strictEqual(TideDataService.setCachedData(2026, BUNDLED_CSV), true);
        assert.ok(store.size > 0);
    });

    console.log('\nFix 1 - bundled first, then cache, then proxies');

    await test('bundled path makes zero proxy requests', async () => {
        resetState();
        fetchHandler = url => {
            if (url.startsWith('tides/')) return csvResponse(BUNDLED_CSV);
            return csvResponse('<html>should never be called</html>');
        };

        const response = await TideDataService.fetchTideDataForYear(2026);
        assert.strictEqual(response.source, 'bundled');
        assert.strictEqual(await response.text(), BUNDLED_CSV);
        assert.strictEqual(fetchLog.length, 1, 'exactly one request expected');
        assert.strictEqual(fetchLog[0], 'tides/auckland_2026.csv');
        assert.ok(!fetchLog.some(u => u.includes('corsproxy') || u.includes('allorigins') ||
            u.includes('codetabs') || u.includes('linz.govt.nz')));
    });

    await test('force refresh still uses bundled data and skips the network', async () => {
        resetState();
        fetchHandler = url => url.startsWith('tides/')
            ? csvResponse(BUNDLED_CSV)
            : Promise.reject(new Error('proxy should not be reached'));

        const response = await TideDataService.fetchTideDataForYear(2026, true);
        assert.strictEqual(response.source, 'bundled');
        assert.strictEqual(fetchLog.length, 1);
    });

    await test('a bundled 404 falls through to the proxies', async () => {
        resetState();
        fetchHandler = url => url.startsWith('tides/')
            ? csvResponse('<html>404</html>', false, 404)
            : csvResponse(BUNDLED_CSV);

        const response = await TideDataService.fetchTideDataForYear(2027);
        assert.strictEqual(response.source, 'corsproxy.io');
        assert.ok(fetchLog.some(u => u.includes('corsproxy.io')));
    });

    await test('a proxy returning HTML with HTTP 200 is an error, and is not cached', async () => {
        resetState();
        fetchHandler = url => url.startsWith('tides/')
            ? csvResponse('', false, 404)
            : csvResponse('<html><body>Free tier is localhost only</body></html>');

        let threw = null;
        try {
            await TideDataService.fetchTideDataForYear(2027);
        } catch (e) {
            threw = e;
        }
        assert.ok(threw, 'expected an error rather than a bogus success');
        assert.strictEqual(store.size, 0, 'garbage must not reach localStorage');
    });

    await test('a poisoned cache self-heals instead of serving junk for 30 days', async () => {
        resetState();

        // Simulate the old behaviour: an error page written straight into the cache
        store.set('tideData_2027', JSON.stringify({
            year: 2027,
            csvText: '<html><body>403 Forbidden</body></html>',
            timestamp: new Date().toISOString(),
            recordCount: 1
        }));

        assert.strictEqual(TideDataService.getCachedData(2027), null, 'poisoned entry must be rejected');
        assert.strictEqual(store.has('tideData_2027'), false, 'poisoned entry must be purged');

        fetchHandler = url => url.startsWith('tides/')
            ? csvResponse('', false, 404)
            : csvResponse(BUNDLED_CSV);

        const response = await TideDataService.fetchTideDataForYear(2027);
        assert.strictEqual(await response.text(), BUNDLED_CSV);
        assert.ok(store.has('tideData_2027'), 'good data should now be cached');
    });

    await test('network failure falls back to cache even on a force refresh', async () => {
        resetState();
        assert.strictEqual(TideDataService.setCachedData(2027, BUNDLED_CSV), true);

        fetchHandler = url => url.startsWith('tides/')
            ? csvResponse('', false, 404)
            : Promise.reject(new Error('network down'));

        const response = await TideDataService.fetchTideDataForYear(2027, true);
        assert.strictEqual(response.source, 'cache');
        assert.strictEqual(response.staleFallback, true);
        assert.strictEqual(await response.text(), BUNDLED_CSV);
    });

    await test('every source failing surfaces an error rather than empty data', async () => {
        resetState();
        fetchHandler = () => Promise.reject(new Error('network down'));

        let threw = null;
        try {
            await TideDataService.fetchTideDataForYear(2027);
        } catch (e) {
            threw = e;
        }
        assert.ok(threw, 'expected an error');
        assert.strictEqual(threw.type, TideDataService.ErrorTypes.PROXY_ALL_FAILED);
    });

    console.log('\nFix 4 - year range survives 2029');

    await test('availableYears tracks the current year, no hardcoded list', () => {
        const years = TideDataService.config.availableYears;
        const thisYear = new Date().getFullYear();
        assert.strictEqual(years[0], 2024);
        assert.strictEqual(years[years.length - 1], thisYear + 2);
        assert.ok(years.includes(thisYear));
        assert.ok(years.includes(thisYear + 1));
    });

    await test('a year outside the range is refused with a clear error', async () => {
        resetState();
        let threw = null;
        try {
            await TideDataService.fetchTideDataForYear(1999);
        } catch (e) {
            threw = e;
        }
        assert.ok(threw);
        assert.strictEqual(threw.type, TideDataService.ErrorTypes.YEAR_UNAVAILABLE);
    });

    console.log('\nFix 7 - passage windows break on any impassable sample');

    // A 10-minute series built by hand, so the closure is exact rather than
    // whatever the tide happens to do on a given day.
    function series(heights) {
        const base = new Date(2026, 8, 4, 0, 0, 0);
        return heights.map((h, i) => ({
            time: new Date(base.getTime() + i * 10 * 60 * 1000),
            height: h
        }));
    }

    // span 6.2, boat 3.9, margin 0.5 => required 4.40, so the boat fits while the
    // tide is at or under 1.80m, and has 0.5m spare while it is at or under 1.30m.
    const SPAN = 6.2, BOAT = 3.9, MARGIN = 0.5;

    await test('a brief closure splits one window into two', () => {
        //          fits ..............  closed ......  fits ..............
        const data = series([1.7, 1.5, 1.2, 1.0, 1.2, 1.9, 2.0, 1.9, 1.2, 1.0, 1.4, 1.75]);
        const windows = calculateSafeWindows(data, SPAN, BOAT, MARGIN);
        assert.strictEqual(windows.length, 2, 'expected the 30-minute closure to split the window');
        assert.strictEqual(windows[0].end.time.getTime(), data[4].time.getTime());
        assert.strictEqual(windows[1].start.time.getTime(), data[8].time.getTime());
    });

    await test('no window ever spans a sample the boat does not fit under', () => {
        const data = series([1.7, 1.5, 1.2, 1.0, 1.2, 1.9, 2.0, 1.9, 1.2, 1.0, 1.4, 1.75]);
        const required = BOAT + MARGIN;
        for (const w of calculateSafeWindows(data, SPAN, BOAT, MARGIN)) {
            for (const sample of data) {
                if (sample.time < w.start.time || sample.time > w.end.time) continue;
                assert.ok(SPAN - sample.height - required >= 0,
                    'window ' + w.start.time.toISOString() + '-' + w.end.time.toISOString() +
                    ' spans an impassable sample at ' + sample.time.toISOString());
            }
        }
    });

    // With a margin below the floor there is a caution band; the safe core is the
    // stretch that reaches SAFE_CUSHION_M of clearance above the bare boat.
    await test('a window reports its safe core, not just its extent', () => {
        // margin 0: fits while tide <= 2.30, clears the floor while tide <= 1.80
        const data = series([2.2, 2.0, 1.5, 1.2, 1.5, 2.0, 2.2]);
        const [w] = calculateSafeWindows(data, SPAN, BOAT, 0);
        assert.ok(w.hasSafeCore);
        assert.strictEqual(w.safeStart.time.getTime(), data[2].time.getTime());
        assert.strictEqual(w.safeEnd.time.getTime(), data[4].time.getTime());
        assert.ok(w.safeStart.time > w.start.time && w.safeEnd.time < w.end.time);
    });

    await test('a window that never clears the floor is caution throughout', () => {
        // margin 0, so safe needs SAFE_CUSHION_M of clearance above the boat
        const data = series([2.25, 2.1, 2.05, 2.1, 2.25]);
        const [w] = calculateSafeWindows(data, SPAN, BOAT, 0);
        assert.strictEqual(w.hasSafeCore, false);
        assert.strictEqual(w.safeStart, null);
        assert.ok(w.minClearance >= 0 && w.maxClearance < SAFE_CUSHION_M);
    });

    await test('the best moment in a window is its lowest tide', () => {
        const data = series([1.7, 1.5, 0.8, 1.0, 1.75]);
        const [w] = calculateSafeWindows(data, SPAN, BOAT, MARGIN);
        assert.strictEqual(w.best.time.getTime(), data[2].time.getTime());
        assert.ok(Math.abs(w.maxClearance - (SPAN - 0.8 - (BOAT + MARGIN))) < 1e-9);
    });

    await test('a real day of tides yields windows that are all genuinely passable', () => {
        const points = parseLinzCsv(BUNDLED_CSV, new Date(2026, 8, 4));
        setAdjacent(null, null);
        const hourly = generateHourlyTideData(buildInterpolationPoints(points, null, null), new Date(2026, 8, 4));
        const required = BOAT + MARGIN;
        const windows = calculateSafeWindows(hourly, SPAN, BOAT, MARGIN);
        assert.ok(windows.length > 0, 'expected at least one window on a real day');
        for (const w of windows) {
            assert.ok(w.minClearance >= 0);
            for (const s of hourly) {
                if (s.time < w.start.time || s.time > w.end.time) continue;
                assert.ok(SPAN - s.height - required >= 0);
            }
        }
    });

    console.log('\nThe safe cushion is a floor, not an addition');

    // Safe means clearance above the BARE BOAT of at least max(margin, floor).
    // The margin and the floor must never stack.
    const clearanceForSafe = margin => Math.max(margin, SAFE_CUSHION_M);

    await test('the spare still needed is whatever the margin has not covered', () => {
        assert.strictEqual(safeSpareThreshold(0), SAFE_CUSHION_M);
        assert.strictEqual(Math.round(safeSpareThreshold(0.3) * 100) / 100, 0.2);
        assert.strictEqual(safeSpareThreshold(SAFE_CUSHION_M), 0);
        assert.strictEqual(safeSpareThreshold(1.5), 0, 'a large margin must not go negative');
    });

    await test('a margin at or above the floor leaves no caution band', () => {
        // Every passable sample must be inside the safe core: if it fits, it is safe.
        for (const margin of [0.5, 0.75, 1.0]) {
            const data = series([2.4, 2.0, 1.6, 1.2, 1.6, 2.0, 2.4]);
            const windows = calculateSafeWindows(data, SPAN, BOAT, margin);
            for (const w of windows) {
                assert.ok(w.hasSafeCore, 'margin ' + margin + ' produced a caution-only window');
                assert.strictEqual(w.safeStart.time.getTime(), w.start.time.getTime(),
                    'margin ' + margin + ' left a caution shoulder at the open');
                assert.strictEqual(w.safeEnd.time.getTime(), w.end.time.getTime(),
                    'margin ' + margin + ' left a caution shoulder at the close');
            }
        }
    });

    await test('a margin below the floor leaves exactly the shortfall as caution', () => {
        const margin = 0.3;
        const data = series([2.4, 2.1, 1.9, 1.5, 1.9, 2.1, 2.4]);
        const [w] = calculateSafeWindows(data, SPAN, BOAT, margin);

        // fits while tide <= 6.2 - 3.9 - 0.3 = 2.00; safe while tide <= 6.2 - 3.9 - 0.5 = 1.80
        assert.strictEqual(w.start.time.getTime(), data[2].time.getTime());
        assert.strictEqual(w.end.time.getTime(), data[4].time.getTime());
        assert.ok(w.hasSafeCore);
        assert.strictEqual(w.safeStart.time.getTime(), data[3].time.getTime());
        assert.strictEqual(w.safeEnd.time.getTime(), data[3].time.getTime());
    });

    await test('the safe boundary is the same clearance whatever the margin below the floor', () => {
        // The tide at which a day turns safe must not move with the margin, as long
        // as the margin is under the floor: that is the double-counting this rule
        // exists to prevent.
        const boundaries = [0, 0.1, 0.25, 0.4, 0.5].map(margin => {
            const data = series(Array.from({ length: 40 }, (_, i) => 2.6 - i * 0.05));
            const [w] = calculateSafeWindows(data, SPAN, BOAT, margin);
            // clearance above the bare boat at the first safe sample
            return Math.round((SPAN - w.safeStart.tideHeight - BOAT) * 100) / 100;
        });
        boundaries.forEach((clearance, i) => {
            assert.ok(clearance >= SAFE_CUSHION_M - 1e-9,
                'safe declared at only ' + clearance + ' m of clearance (case ' + i + ')');
            assert.ok(clearance < SAFE_CUSHION_M + 0.05 + 1e-9,
                'safe withheld until ' + clearance + ' m, more than one sample past the floor');
        });
    });

    await test('a margin above the floor raises the safe boundary with it', () => {
        const data = series(Array.from({ length: 40 }, (_, i) => 2.6 - i * 0.05));
        [0.8, 1.2].forEach(margin => {
            const [w] = calculateSafeWindows(data, SPAN, BOAT, margin);
            const clearance = Math.round((SPAN - w.safeStart.tideHeight - BOAT) * 100) / 100;
            assert.ok(clearance >= margin - 1e-9,
                'margin ' + margin + ' called safe at only ' + clearance + ' m of clearance');
        });
    });

    console.log('\nMulti-day forecast');

    // Serve the real bundled files, so a range is exercised against published data.
    function serveBundled() {
        fetchHandler = url => {
            const m = /tides\/auckland_(\d{4})\.csv/.exec(String(url));
            if (m && BUNDLED_YEARS.includes(Number(m[1]))) {
                return csvResponse(fs.readFileSync(path.join(TIDES_DIR, 'auckland_' + m[1] + '.csv'), 'utf8'));
            }
            return csvResponse('', false, 404);
        };
    }

    await test('a seven-day range returns seven days, each with its own tides', async () => {
        resetState();
        serveBundled();
        const days = await computeDayForecast(new Date(2026, 8, 2), 7, 6.2, 3.9, 0.5);
        assert.strictEqual(days.length, 7);
        days.forEach((d, i) => {
            assert.strictEqual(d.unavailable, false);
            assert.ok(d.points.length >= 3, 'day ' + i + ' has only ' + d.points.length + ' tide points');
            assert.strictEqual(d.series.length, 144, 'expected a 10-minute series over 24 hours');
        });
        const dates = days.map(d => d.date.getDate());
        assert.deepStrictEqual(dates, [2, 3, 4, 5, 6, 7, 8]);
    });

    await test('a range crossing 31 December pulls both years', async () => {
        resetState();
        serveBundled();
        const days = await computeDayForecast(new Date(2026, 11, 29), 7, 6.2, 3.9, 0.5);
        assert.strictEqual(days.length, 7);
        days.forEach(d => assert.strictEqual(d.unavailable, false, d.date.toDateString() + ' came back unavailable'));
        assert.strictEqual(days[0].date.getFullYear(), 2026);
        assert.strictEqual(days[6].date.getFullYear(), 2027);
        assert.strictEqual(days[6].date.getDate(), 4);
    });

    await test('each year is fetched once, not once per day', async () => {
        resetState();
        serveBundled();
        await computeDayForecast(new Date(2026, 8, 2), 14, 6.2, 3.9, 0.5);
        const yearFetches = fetchLog.filter(u => /auckland_2026\.csv/.test(u)).length;
        assert.strictEqual(yearFetches, 1, 'expected one fetch for 2026, saw ' + yearFetches);
    });

    await test('a day past the published range is marked unavailable, not fatal', async () => {
        resetState();
        serveBundled();
        const lastYear = TideDataService.config.availableYears[TideDataService.config.availableYears.length - 1];
        const days = await computeDayForecast(new Date(lastYear, 11, 29), 7, 6.2, 3.9, 0.5);
        assert.strictEqual(days.length, 7);
        assert.ok(days.some(d => d.unavailable), 'expected days past the range to be flagged');
        assert.ok(days.some(d => !d.unavailable), 'expected the days inside the range to survive');
    });

    await test('day-edge times are interpolated, not held flat', async () => {
        resetState();
        serveBundled();
        const [day] = await computeDayForecast(new Date(2026, 8, 4), 1, 6.2, 3.9, 0.5);
        const firstTide = day.points[0].time;
        const before = day.series.filter(s => s.time < firstTide).map(s => s.height);
        assert.ok(before.length > 1, 'expected samples before the day\'s first tide');
        assert.ok(new Set(before.map(h => h.toFixed(4))).size > 1,
            'heights before the first tide are flat, so the previous day was not used');
    });

    await test('highs and lows alternate and match the extremes of the day', () => {
        const points = classifyTidePoints(parseLinzCsv(BUNDLED_CSV, new Date(2026, 8, 4)));
        assert.ok(points.length >= 3);
        points.forEach((p, i) => {
            if (i === 0) return;
            assert.notStrictEqual(p.kind, points[i - 1].kind, 'two ' + p.kind + 's in a row');
        });
        const highs = points.filter(p => p.kind === 'high').map(p => p.height);
        const lows = points.filter(p => p.kind === 'low').map(p => p.height);
        assert.ok(Math.min(...highs) > Math.max(...lows), 'a high came in below a low');
    });

    await test('addDays lands on wall-clock midnight across the DST change', () => {
        // NZDT ends on the first Sunday of April at 03:00; 5 April 2026 is that day.
        const d = addDays(new Date(2026, 3, 4), 1);
        assert.strictEqual(d.getDate(), 5);
        assert.strictEqual(d.getMonth(), 3);
        assert.strictEqual(d.getHours(), 0);
        const back = addDays(new Date(2026, 3, 5), -1);
        assert.strictEqual(back.getDate(), 4);
        assert.strictEqual(back.getHours(), 0);
    });

    console.log('\nWindows that run past midnight');

    await test('a window crossing midnight is one window, carried on the day it opens', async () => {
        resetState();
        serveBundled();
        const days = await computeDayForecast(new Date(2026, 8, 6), 4, 6.2, 3.9, 0.5);

        const crossesBefore = days.some((d, i) =>
            i > 0 &&
            d.windows.length &&
            d.windows[0].start.time.getHours() === 0 && d.windows[0].start.time.getMinutes() === 0);
        assert.ok(crossesBefore, 'fixture no longer has a window running past midnight');

        stitchWindowsAcrossMidnight(days);

        days.forEach((day, i) => {
            if (i === 0 || !day.windows.length) return;
            const prev = days[i - 1];
            const prevLast = prev.windows[prev.windows.length - 1];
            const first = day.windows[0];
            const orphan = first.start.time.getHours() === 0 && first.start.time.getMinutes() === 0 &&
                prevLast && prevLast.end.time.getHours() === 23 && prevLast.end.time.getMinutes() === 50;
            assert.ok(!orphan, 'day ' + i + ' still carries the tail of the previous day\'s window');
        });

        const carried = days.some(d => d.windows.some(w => w.end.time.getDate() !== w.start.time.getDate()));
        assert.ok(carried, 'expected at least one window to end on the day after it opened');
    });

    await test('stitching keeps the joined window internally consistent', async () => {
        resetState();
        serveBundled();
        const days = stitchWindowsAcrossMidnight(
            await computeDayForecast(new Date(2026, 8, 6), 4, 6.2, 3.9, 0.5));

        for (const day of days) {
            for (const w of day.windows) {
                assert.ok(w.end.time >= w.start.time, 'window ends before it starts');
                assert.ok(w.minClearance <= w.maxClearance);
                assert.strictEqual(w.hasSafeCore, w.safeStart !== null);
                if (w.safeStart) {
                    assert.ok(w.safeStart.time >= w.start.time && w.safeEnd.time <= w.end.time,
                        'safe core falls outside its window');
                    assert.ok(w.safeEnd.time >= w.safeStart.time);
                }
            }
        }
    });

    await test('stitching leaves windows that genuinely end at midnight alone', () => {
        // Two days whose windows do not touch the boundary: nothing should merge.
        const mk = (y, mo, d, hStart, hEnd) => {
            const pts = [];
            for (let h = hStart; h <= hEnd; h++) {
                pts.push({ time: new Date(y, mo, d, h, 0), tideHeight: 0.5, actualClearance: 5.7, spareClearance: 1.3 });
            }
            return {
                start: pts[0], end: pts[pts.length - 1], best: pts[0],
                minClearance: 1.3, maxClearance: 1.3,
                safeStart: pts[0], safeEnd: pts[pts.length - 1], hasSafeCore: true
            };
        };
        const days = [
            { date: new Date(2026, 8, 6), unavailable: false, windows: [mk(2026, 8, 6, 10, 14)] },
            { date: new Date(2026, 8, 7), unavailable: false, windows: [mk(2026, 8, 7, 11, 15)] }
        ];
        stitchWindowsAcrossMidnight(days);
        assert.strictEqual(days[0].windows.length, 1);
        assert.strictEqual(days[1].windows.length, 1);
        assert.strictEqual(days[0].windows[0].end.time.getDate(), 6);
    });

    console.log('\n' + '='.repeat(60));
    console.log(passed + ' passed, ' + failures.length + ' failed');
    console.log('='.repeat(60) + '\n');

    if (failures.length) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
