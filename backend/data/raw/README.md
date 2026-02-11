# Raw Data Directory

This directory contains raw data fetched from external sources.

## Files

- `durham_census_tracts.geojson` - Durham census tracts with demographics (US Census Bureau)
- `ncdot_crashes_durham.csv` - Simulated Durham crash data calibrated to real NCDOT volumes
- `ncdot_calibration.json` - Cached NCDOT API crash total for offline use

## Generating Data

```bash
make data
```

Or individually:

```bash
python3 scripts/fetch_durham_data.py
python3 scripts/fetch_ncdot_crash_data.py
```

The crash script queries the NCDOT NC Vision Zero API for Durham County totals and generates simulated records at that volume. See `docs/DATA_ACCESS.md` for details.

**Note:** Census data requires a Census API key:
```bash
export CENSUS_API_KEY=your_key_here
```

Get a free API key at: https://api.census.gov/data/key_signup.html
