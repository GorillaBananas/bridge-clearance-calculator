#!/usr/bin/env bash
#
# Download LINZ tide tables into tides/ so the app can serve them same-origin.
#
# The app resolves tide data bundled -> cache -> CORS proxy. Anything in tides/
# is served directly by GitHub Pages, so it never depends on a free proxy.
#
# Usage:
#   ./fetch_tides.sh              # current year plus the next two
#   ./fetch_tides.sh 2027 2028    # specific years
#
set -euo pipefail

BASE_URL="https://static.charts.linz.govt.nz/tide-tables/maj-ports/csv/Auckland%20"
DEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/tides"

mkdir -p "$DEST_DIR"

if [ "$#" -gt 0 ]; then
    YEARS=("$@")
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
    printf 'saved %s rows to tides/auckland_%s.csv\n' "$rows" "$year"
done

if [ "$failures" -gt 0 ]; then
    echo "$failures year(s) could not be fetched." >&2
    exit 1
fi

echo "Done. Commit the files in tides/ to publish them."
