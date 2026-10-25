# Data sources

`notebooks/01_fetch_data.ipynb` fetches all five. Only the Census API needs a key.

## US Census Bureau ACS

- **Demographics:** `https://api.census.gov/data/{CENSUS_VINTAGE}/acs/acs5`, 5-year estimates (vintage in `backend/config.py`). Population, median household income, race and ethnicity, household vehicle availability.
- **Tract boundaries:** TIGERweb ArcGIS REST service (`TIGER_VINTAGE`, `TIGER_TRACTS_LAYER` in `backend/config.py`).
- **Key:** free from https://api.census.gov/data/key_signup.html, stored as the `CENSUS_API_KEY` Colab secret.

## NCDOT Non-Motorist Crashes

Geocoded police-reported crashes involving pedestrians, cyclists and other non-motorists (scooter, skateboard and wheelchair users), statewide, 2007–2024. Tests 2 and 3 use Durham County, 2019–2024.

- **Feature service:** `NCDOT_NONMOTORIST_SERVICE` in `backend/config.py`
- **Auth:** none

## OpenStreetMap

Crossings, cycleways and shared paths, traffic signals, traffic calming and footways within `DURHAM_BOUNDS`, counted per tract and per 1,000 residents and combined into an infrastructure score. Used by Test 3 (project type for each tract's largest gap) and Test 4 (infrastructure scores).

- **Endpoint:** Overpass API through osmnx (`OVERPASS_API` in `backend/config.py`, with the overpass.kumi.systems mirror as fallback)
- **Auth:** none
- **License:** ODbL

## NCDOT Transportation Disadvantage Index

Block group TDI scores and disability share, averaged to tracts. Shown on the overview map; no test uses them.

- **Feature service:** `NCDOT_TDI_SERVICE` in `backend/config.py`
- **Auth:** none

## GoDurham GTFS

Bus stop locations, counted per tract. Boardings are not in the public feed. Shown on the overview map; no test uses them.

- **Feed:** `GTFS_GODURHAM_URL` in `backend/config.py` (developer page: https://godurhamtransit.org/developer-resources)
- **Auth:** none
