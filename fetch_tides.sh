#!/usr/bin/env bash
#
# Download LINZ tide tables into tides/ so the app can serve them same-origin.
#
# The app resolves tide data bundled -> cache -> CORS proxy. Anything in tides/
# is served directly by GitHub Pages, so it never depends on a free proxy.
#
# Usage:
#   ./fetch_tides.sh                 # current year plus the next two
#   ./fetch_tides.sh 2027 2028       # specific years
#   ./fetch_tides.sh --best-effort   # succeed if at least one year was fetched
#
# LINZ publishes only a few years ahead, so asking for a year it has not
# published yet is expected rather than broken. --best-effort exists for the
# scheduled job: it keeps a not-yet-published year from failing the run and
# suppressing a pull request for the years that did update.
#
set -euo pipefail

BASE_URL="https://static.charts.linz.govt.nz/tide-tables/maj-ports/csv/Auckland%20"
DEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/tides"

mkdir -p "$DEST_DIR"

BEST_EFFORT=0
ARGS=()
for arg in "$@"; do
    case "$arg" in
        --best-effort) BEST_EFFORT=1 ;;
        -*) echo "Unknown option: $arg" >&2; exit 2 ;;
        *) ARGS+=("$arg") ;;
    esac
done

if [ "${#ARGS[@]}" -gt 0 ]; then
    YEARS=("${ARGS[@]}")
else
    CURRENT_YEAR="$(date +%Y)"
    YEARS=("$CURRENT_YEAR" "$((CURRENT_YEAR + 1))" "$((CURRENT_YEAR + 2))")
fi

# A LINZ tide row is: day,weekday,month,year,time,height[,time,height...]
# Validating before saving is the point of this script: an HTML error page saved
# as tide data is exactly the failure mode the app is being protected from.
count_tide_rows() {
    awk -F',' '
        $1 ~ /^[0-9]+$/ && $1 >= 1 && $1 <= 31 &&
        $3 ~ /^[0-9]+$/ && $3 >= 1 && $3 <= 12 &&
        $4 ~ /^[0-9]+$/ && $4 >= 2000 && $4 <= 2100 &&
        NF >= 6 { n++ }
        END { print n + 0 }
    ' "$1"
}

failures=0
saved=0

for year in "${YEARS[@]}"; do
    url="${BASE_URL}${year}.csv"
    target="${DEST_DIR}/auckland_${year}.csv"
    tmp="$(mktemp)"

    printf '→ %s ... ' "$year"

    if ! curl -fsSL --max-time 30 -o "$tmp" "$url"; then
        printf 'download failed\n'
        rm -f "$tmp"
        failures=$((failures + 1))
        continue
    fi

    rows="$(count_tide_rows "$tmp")"
    if [ "$rows" -lt 300 ]; then
        printf 'rejected (%s tide rows, expected ~365)\n' "$rows"
        rm -f "$tmp"
        failures=$((failures + 1))
        continue
    fi

    mv "$tmp" "$target"
    chmod 644 "$target"
    saved=$((saved + 1))
    printf 'saved %s rows to tides/auckland_%s.csv\n' "$rows" "$year"
done

if [ "$failures" -gt 0 ]; then
    echo "$failures year(s) could not be fetched (LINZ may not have published them yet)." >&2
    if [ "$BEST_EFFORT" -eq 0 ] || [ "$saved" -eq 0 ]; then
        exit 1
    fi
fi

echo "Done. Commit the files in tides/ to publish them."
