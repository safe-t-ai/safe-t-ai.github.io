# Data Sources

## Currently Used

### US Census Bureau ACS (API)

Demographics and tract boundaries for Durham County.

- **Demographics endpoint:** `https://api.census.gov/data/2022/acs/acs5`
- **Geometry endpoint:** Census TIGER/Line via ArcGIS REST
- **Auth:** Free API key required (`CENSUS_API_KEY` env var, stored as GitHub secret) from https://api.census.gov/data/key_signup.html
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

- **Access:** Free for government, municipal, and research entities, but requires completing a two-part training program (online modules + instructor-led class) before account provisioning
- **Download:** https://dmvcrashweb.dot.state.nc.us/teaas/
- **Info:** https://connect.ncdot.gov/resources/safety/Pages/TEAAS-Crash-Data-System.aspx
- **Would provide:** Individual crash records with road-level location data (all reportable NC crashes since 1990)
- **Current substitute:** Simulated crash records calibrated to NC Vision Zero API totals

### OpenStreetMap (Infrastructure Density)

Pedestrian and cyclist infrastructure features (crossings, cycleways, traffic signals, speed calming, footways) within Durham County bounds.

- **Endpoint:** Overpass API (`https://overpass-api.de/api/interpreter`)
- **Auth:** None (public)
- **License:** ODbL (open)
- **Provides:** Per-tract infrastructure feature counts and densities, composite infrastructure quality score
- **Used by:** Test 3 (Infrastructure Audit) project type selection, Test 4 (Suppressed Demand) infrastructure quality scores
- **Script:** `scripts/fetch_osm_infrastructure.py`

## Potential Additions

### Durham Vision Zero Dashboard (Crash Validation)

Interactive ArcGIS dashboard showing fatal and serious injury crashes in Durham from 2016 to present, maintained by the city.

- **Dashboard:** https://www.arcgis.com/apps/dashboards/fd720475a8de48ef82f801dc8d6d6677
- **Program page:** https://www.durhamnc.gov/2995/Vision-Zero
- **Auth:** None (public, view-only)
- **Provides:** Crash locations along the High Injury Network, temporal trends, severity breakdowns. Verified stats: ~23 fatalities/year, a pedestrian crash every 3 days on average.
- **Limitation:** View-only ArcGIS dashboard with no bulk data export. Useful for manual validation of Test 2 crash patterns, not for pipeline integration.

### GoDurham GTFS (Transit Routes)

Transit route and schedule data for Durham's bus system. The Durham Open Data Portal does not include transit data; this is the actual source.

- **URL:** https://godurhamtransit.org/developer-resources
- **Auth:** None (public)
- **Formats:** GTFS and GTFS-RT
- **Useful for:** Enriching equity analysis by mapping transit access gaps against income and race demographics. Areas with poor transit access may correlate with suppressed active transportation demand.

### DVRPC Bike/Ped Count Program (Methodology Reference)

Philadelphia-region bike/ped counting program with fully open data and a documented Eco-Counter integration pipeline.

- **Data portal:** https://www.dvrpc.org/traffic/bikepedtravelmonitoring/
- **Open data:** https://dvrpc-dvrpcgis.opendata.arcgis.com/
- **GitHub pipeline:** https://github.com/dvrpc/eco-counter-import
- **Formats:** CSV, Shapefile, GeoJSON
- **Useful for:** Not Durham-specific, but serves as a reference for how to structure real count data integration if Durham publishes Eco-Counter data in the future. Their pipeline architecture could inform Test 1 (Volume Estimation) ground truth methodology.
