# Raw Data Directory

This directory contains raw data fetched from external sources.

## Files

- `durham_census_tracts.geojson` - Durham census tracts with demographics (US Census Bureau)
- `ncdot_crashes_durham.csv` - Durham crash data (NC DOT)
- `ncdot_powerbi_response.json` - NC DOT PowerBI API response

## Generating Data

To fetch the raw data, run:

```bash
cd backend
python ../scripts/fetch_durham_data.py
python ../scripts/fetch_ncdot_crash_data.py
```

**Note:** You'll need a Census API key. Set it as an environment variable:
```bash
export CENSUS_API_KEY=your_key_here
```

Get a free API key at: https://api.census.gov/data/key_signup.html
