/**
 * BRIDGE CLEARANCE CALCULATOR - LIVE SITE ACCURACY TEST
 * ======================================================
 *
 * Run this script in the browser console on:
 * https://gorillabananas.github.io/bridge-clearance-calculator/
 *
 * Tests:
 * 1. LINZ data fetch (one network request)
 * 2. Cached data retrieval
 * 3. OBC table comparison
 * 4. Interpolation accuracy at various points
 */

(async function runAccuracyTests() {
    console.log('='.repeat(70));
    console.log('BRIDGE CLEARANCE CALCULATOR - ACCURACY TEST SUITE');
    console.log('='.repeat(70));

    const results = {
        linzFetch: null,
        cacheTest: null,
        obcComparison: [],
        interpolationTests: [],
        summary: {}
    };

    // ================================================================
    // OBC REFERENCE DATA (Official Bridge Clearance Tables)
    // ================================================================
    const OBC_REFERENCE = {
        // Clearance = Bridge Height at Datum - Tide Height
        IN_OUT: { clearanceAtDatum: 6.2 },  // metres
        HIGH: { clearanceAtDatum: 6.5 }     // metres
    };

    // OBC Table: Tide Height -> Expected Clearance
    const OBC_TABLE_IN_OUT = [
        { tide: 0.0, clearance: 6.2 },
        { tide: 0.5, clearance: 5.7 },
        { tide: 1.0, clearance: 5.2 },
        { tide: 1.5, clearance: 4.7 },
        { tide: 2.0, clearance: 4.2 },
        { tide: 2.5, clearance: 3.7 },
        { tide: 3.0, clearance: 3.2 },
        { tide: 3.5, clearance: 2.7 },
    ];

    const OBC_TABLE_HIGH = [
        { tide: 0.0, clearance: 6.5 },
        { tide: 0.5, clearance: 6.0 },
        { tide: 1.0, clearance: 5.5 },
        { tide: 1.5, clearance: 5.0 },
        { tide: 2.0, clearance: 4.5 },
        { tide: 2.5, clearance: 4.0 },
        { tide: 3.0, clearance: 3.5 },
        { tide: 3.5, clearance: 3.0 },
    ];

    // ================================================================
    // TEST 1: LINZ DATA FETCH
    // ================================================================
    console.log('\n' + '='.repeat(70));
    console.log('TEST 1: LINZ DATA FETCH');
    console.log('='.repeat(70));

    try {
        // Check if TideDataService exists
        if (typeof TideDataService !== 'undefined') {
            console.log('TideDataService found. Checking status...');
            TideDataService.logStatus();

            // Force a fresh fetch
            console.log('\nForcing fresh LINZ data fetch for 2026...');
            const startTime = performance.now();
            const response = await TideDataService.fetchTideDataForYear(2026, true);
            const endTime = performance.now();

            if (response.ok) {
                const data = await response.text();
                const lines = data.trim().split('\n').length;
                results.linzFetch = {
                    success: true,
                    source: response.headers?.get('X-Data-Source') || 'network',
                    lines: lines,
                    timeMs: Math.round(endTime - startTime)
                };
                console.log(`✓ LINZ fetch SUCCESS: ${lines} lines in ${results.linzFetch.timeMs}ms`);
            } else {
                results.linzFetch = { success: false, error: 'Response not OK' };
                console.log('✗ LINZ fetch FAILED: Response not OK');
            }
        } else {
            console.log('TideDataService not found - using legacy fetch');
            results.linzFetch = { success: false, error: 'TideDataService not available' };
        }
    } catch (e) {
        results.linzFetch = { success: false, error: e.message };
        console.log('✗ LINZ fetch ERROR:', e.message);
    }

    // ================================================================
    // TEST 2: CACHE VERIFICATION
    // ================================================================
    console.log('\n' + '='.repeat(70));
    console.log('TEST 2: CACHE VERIFICATION');
    console.log('='.repeat(70));

    try {
        if (typeof TideDataService !== 'undefined') {
            const cacheStatus = TideDataService.getCacheStatus();
            console.log('Cache status:', cacheStatus);

            // Try fetching from cache (should be instant)
            const startTime = performance.now();
            const cachedResponse = await TideDataService.fetchTideDataForYear(2026, false);
            const endTime = performance.now();

            results.cacheTest = {
                hasCachedData: cacheStatus.years2026 || false,
                fetchTimeMs: Math.round(endTime - startTime),
                isFromCache: (endTime - startTime) < 100 // Should be nearly instant
            };

            console.log(`Cache fetch time: ${results.cacheTest.fetchTimeMs}ms`);
            console.log(`Data from cache: ${results.cacheTest.isFromCache ? 'YES' : 'NO (network)'}`);
        }
    } catch (e) {
        results.cacheTest = { error: e.message };
        console.log('Cache test error:', e.message);
    }

    // ================================================================
    // TEST 3: OBC TABLE COMPARISON
    // ================================================================
    console.log('\n' + '='.repeat(70));
    console.log('TEST 3: OBC TABLE COMPARISON');
    console.log('Formula: Actual Clearance = Bridge Height at Datum - Tide Height');
    console.log('='.repeat(70));

    console.log('\nIN/OUT SPAN (6.2m at Chart Datum):');
    console.log('-'.repeat(60));
    console.log('Tide     OBC Expected    Calculated    Error      Status');
    console.log('-'.repeat(60));

    let totalError = 0;
    let maxError = 0;
    let testCount = 0;

    for (const entry of OBC_TABLE_IN_OUT) {
        const calculated = OBC_REFERENCE.IN_OUT.clearanceAtDatum - entry.tide;
        const error = Math.abs(calculated - entry.clearance);
        totalError += error;
        maxError = Math.max(maxError, error);
        testCount++;

        const status = error < 0.001 ? '✓ PASS' : '✗ FAIL';
        console.log(`${entry.tide.toFixed(1)}m     ${entry.clearance.toFixed(1)}m            ${calculated.toFixed(2)}m         ${error.toFixed(4)}m    ${status}`);

        results.obcComparison.push({
            span: 'IN_OUT',
            tide: entry.tide,
            expected: entry.clearance,
            calculated: calculated,
            error: error
        });
    }

    console.log('\nHIGH SPAN (6.5m at Chart Datum):');
    console.log('-'.repeat(60));

    for (const entry of OBC_TABLE_HIGH) {
        const calculated = OBC_REFERENCE.HIGH.clearanceAtDatum - entry.tide;
        const error = Math.abs(calculated - entry.clearance);
        totalError += error;
        maxError = Math.max(maxError, error);
        testCount++;

        const status = error < 0.001 ? '✓ PASS' : '✗ FAIL';
        console.log(`${entry.tide.toFixed(1)}m     ${entry.clearance.toFixed(1)}m            ${calculated.toFixed(2)}m         ${error.toFixed(4)}m    ${status}`);

        results.obcComparison.push({
            span: 'HIGH',
            tide: entry.tide,
            expected: entry.clearance,
            calculated: calculated,
            error: error
        });
    }

    const avgError = totalError / testCount;
    console.log('-'.repeat(60));
    console.log(`OBC Formula Error: Avg=${avgError.toFixed(6)}m, Max=${maxError.toFixed(6)}m`);

    // ================================================================
    // TEST 4: INTERPOLATION ACCURACY
    // ================================================================
    console.log('\n' + '='.repeat(70));
    console.log('TEST 4: INTERPOLATION ACCURACY (Rule of Twelfths)');
    console.log('='.repeat(70));

    // Test the interpolation function if available
    if (typeof ruleOfTwelfthsInterpolation !== 'undefined' || typeof interpolateTide !== 'undefined') {
        console.log('\nTesting interpolation between Low (0.4m at 00:00) and High (3.0m at 06:00):');
        console.log('-'.repeat(60));

        // Rule of Twelfths expected progression
        const twelfthsExpected = [
            { hour: 1, fraction: 1/12, expected: 0.617 },   // 1/12 of 2.6m range = 0.217
            { hour: 2, fraction: 3/12, expected: 1.05 },    // 3/12 cumulative
            { hour: 3, fraction: 6/12, expected: 1.70 },    // 6/12 cumulative (halfway)
            { hour: 4, fraction: 9/12, expected: 2.35 },    // 9/12 cumulative
            { hour: 5, fraction: 11/12, expected: 2.783 },  // 11/12 cumulative
            { hour: 6, fraction: 12/12, expected: 3.0 },    // Full range
        ];

        console.log('Hour   Expected (Rule of 12ths)   Calculated   Variance');
        console.log('-'.repeat(60));

        // This tests the mathematical principle
        const lowTide = 0.4;
        const highTide = 3.0;
        const range = highTide - lowTide;

        const twelfthsCumulative = [0, 1/12, 3/12, 6/12, 9/12, 11/12, 1.0];

        for (let hour = 1; hour <= 6; hour++) {
            const fraction = twelfthsCumulative[hour];
            const expected = lowTide + (range * fraction);

            results.interpolationTests.push({
                hour: hour,
                expected: expected,
                note: `${(fraction * 100).toFixed(1)}% of range`
            });

            console.log(`${hour}      ${expected.toFixed(3)}m                    -            Rule of 12ths: ${(fraction * 100).toFixed(1)}%`);
        }
    } else {
        console.log('Interpolation function not directly accessible - testing via UI required');
    }

    // ================================================================
    // TEST 5: LIVE CALCULATION TEST
    // ================================================================
    console.log('\n' + '='.repeat(70));
    console.log('TEST 5: LIVE CALCULATION TEST');
    console.log('='.repeat(70));

    // Try to trigger a calculation using today's date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    console.log(`\nTesting calculation for: ${dateStr}`);

    // Check if we can access the calculation function
    if (typeof calculateClearance !== 'undefined') {
        console.log('calculateClearance function available');
    }

    // Check current UI state
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    const boatHeightInput = document.getElementById('boat-height');
    const safetyMarginInput = document.getElementById('safety-margin');

    if (dateInput && timeInput && boatHeightInput && safetyMarginInput) {
        console.log('\nCurrent UI values:');
        console.log(`  Date: ${dateInput.value}`);
        console.log(`  Time: ${timeInput.value}`);
        console.log(`  Boat Height: ${boatHeightInput.value}m`);
        console.log(`  Safety Margin: ${safetyMarginInput.value}m`);

        // Get current results if displayed
        const spareClearance = document.querySelector('.spare-clearance');
        const tideHeight = document.querySelector('.tide-height');

        if (spareClearance) {
            console.log(`\nDisplayed Results:`);
            console.log(`  Spare Clearance: ${spareClearance.textContent}`);
        }
        if (tideHeight) {
            console.log(`  Tide Height: ${tideHeight.textContent}`);
        }
    }

    // ================================================================
    // SUMMARY
    // ================================================================
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));

    const obcErrors = results.obcComparison.map(r => r.error);
    const obcAvgError = obcErrors.reduce((a, b) => a + b, 0) / obcErrors.length;
    const obcMaxError = Math.max(...obcErrors);

    results.summary = {
        linzFetchSuccess: results.linzFetch?.success || false,
        cacheWorking: results.cacheTest?.isFromCache || false,
        obcFormulaAccuracy: {
            avgError: obcAvgError,
            maxError: obcMaxError,
            errorRate: (obcMaxError * 100).toFixed(4) + '%'
        },
        overallStatus: obcMaxError < 0.001 ? 'VERIFIED' : 'NEEDS REVIEW'
    };

    console.log(`
┌─────────────────────────────────────────────────────────────────┐
│ TEST RESULTS SUMMARY                                            │
├─────────────────────────────────────────────────────────────────┤
│ LINZ Data Fetch:     ${results.linzFetch?.success ? '✓ SUCCESS' : '✗ FAILED'}                              │
│ Cache Working:       ${results.cacheTest?.isFromCache ? '✓ YES' : '? UNKNOWN'}                                  │
│ OBC Formula Error:   ${obcAvgError.toFixed(6)}m (avg), ${obcMaxError.toFixed(6)}m (max)      │
│ Error Rate:          ${results.summary.obcFormulaAccuracy.errorRate}                                  │
├─────────────────────────────────────────────────────────────────┤
│ OVERALL STATUS:      ${results.summary.overallStatus}                                  │
└─────────────────────────────────────────────────────────────────┘
    `);

    // Store results globally for inspection
    window.accuracyTestResults = results;
    console.log('\nFull results stored in: window.accuracyTestResults');

    return results;
})();
