# Raw Data Directory

This directory contains raw data fetched from external sources.

## Files

- `durham_census_tracts.geojson` - Durham census tracts with demographics (US Census Bureau)
- `ncdot_nonmotorist_durham.csv` - Real NCDOT non-motorist crash data, Durham County (ArcGIS Feature Service)
- `osm_infrastructure.json` - Pedestrian/cyclist infrastructure features (OpenStreetMap)

## Generating Data

```bash
make data
```

Or individually:

```bash
python3 scripts/fetch_durham_data.py
python3 scripts/fetch_ncdot_nonmotorist.py
python3 scripts/fetch_osm_infrastructure.py
```

**Note:** Census data requires a Census API key:
```bash
export CENSUS_API_KEY=your_key_here
```

Get a free API key at: https://api.census.gov/data/key_signup.html
