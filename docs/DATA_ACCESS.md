# Data Sources

## Currently Used

### US Census Bureau ACS (API)

Demographics and tract boundaries for Durham County.

- **Demographics endpoint:** `https://api.census.gov/data/2022/acs/acs5`
- **Geometry endpoint:** Census TIGER/Line via ArcGIS REST
- **Auth:** Free API key (`CENSUS_API_KEY` env var) from https://api.census.gov/data/key_signup.html
- **Variables:** Total population, median household income, race/ethnicity
- **Script:** `scripts/fetch_durham_data.py`

### NCDOT NC Vision Zero (API)

Durham County crash totals for calibrating simulation volumes.

- **Endpoint:** Power BI API (constants in `backend/config.py`)
- **Dashboard:** https://ncvisionzero.org/data-analytics/crash-query-tool/
- **Auth:** None (public)
- **Provides:** Aggregate crash count (~100,909 across 2018-2024)
- **Limitation:** No lat/long coordinates, so crashes cannot be geocoded to census tracts. The simulation generates geographic distribution instead.
- **Script:** `scripts/fetch_ncdot_crash_data.py` (caches to `ncdot_calibration.json`)

## Needed for Production

### Strava Metro

Real pedestrian/cyclist volume data from GPS traces.

- **URL:** https://metro.strava.com/
- **Auth:** Institutional license required
- **Would provide:** Observed active transportation volumes per road segment
- **Current substitute:** Simulated with demographic-correlated bias patterns matching Strava's documented 20-30% undercounting in low-income/minority areas

### StreetLight Data

Multi-modal traffic volume estimates from mobile device data.

- **URL:** https://www.streetlightdata.com/
- **Auth:** Institutional license required
- **Would provide:** Pedestrian, cyclist, and vehicle volume estimates by location
- **Current substitute:** Same simulation as Strava Metro (both exhibit similar demographic bias patterns)

### NCDOT TEAAS

Complete NC crash database with detailed records.

- **Access:** Institutional request to TEAAS_Support@ncdot.gov
- **Would provide:** Individual crash records with road-level location data
- **Current substitute:** Simulated crash records calibrated to NC Vision Zero API totals
