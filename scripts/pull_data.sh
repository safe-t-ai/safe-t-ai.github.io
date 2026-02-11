#!/bin/bash
# Pull data from the data branch for local development.
# Run from the repository root.
set -euo pipefail

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Error: not inside a git repository"
  exit 1
fi

ROOT=$(git rev-parse --show-toplevel)

echo "Fetching data branch..."
git fetch origin data --depth=1

echo "Extracting data files..."
mkdir -p /tmp/safe-t-data-$$
git archive origin/data -- raw/ simulated/ frontend/ | tar -x -C /tmp/safe-t-data-$$

mkdir -p "$ROOT/backend/data/raw" "$ROOT/backend/data/simulated" "$ROOT/frontend/public/data"
cp -r /tmp/safe-t-data-$$/raw/* "$ROOT/backend/data/raw/"
cp -r /tmp/safe-t-data-$$/simulated/* "$ROOT/backend/data/simulated/"
cp -r /tmp/safe-t-data-$$/frontend/* "$ROOT/frontend/public/data/"

rm -rf /tmp/safe-t-data-$$

echo "Done. Data files populated:"
echo "  backend/data/raw/       ($(ls "$ROOT/backend/data/raw/" | wc -l | tr -d ' ') files)"
echo "  backend/data/simulated/ ($(ls "$ROOT/backend/data/simulated/" | wc -l | tr -d ' ') files)"
echo "  frontend/public/data/   ($(ls "$ROOT/frontend/public/data/" | wc -l | tr -d ' ') files)"
