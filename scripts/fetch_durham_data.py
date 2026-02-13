"""
Fetch real Durham NC data from public sources:
- Census demographics (US Census API)
- Census tract geometries (Census TIGER/Line)
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / 'backend'))

import requests
import geopandas as gpd
import pandas as pd
from config import RAW_DATA_DIR, CENSUS_API_KEY, CENSUS_VINTAGE, DATA_FRESHNESS
from utils.freshness import is_fresh, write_meta

RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = RAW_DATA_DIR / 'durham_census_tracts.geojson'


def fetch_durham_census_tracts():
    """Fetch Durham County census tracts with demographic data."""

    # Durham County FIPS code: 37063
    state_fips = '37'
    county_fips = '063'

    base_url = f"https://api.census.gov/data/{CENSUS_VINTAGE}/acs/acs5"

    variables = [
        'B01003_001E',  # Total population
        'B19013_001E',  # Median household income
        'B02001_002E',  # White alone
        'B02001_003E',  # Black/African American alone
        'B03003_003E',  # Hispanic/Latino
    ]

    params = {
        'get': ','.join(['NAME'] + variables),
        'for': 'tract:*',
        'in': f'state:{state_fips} county:{county_fips}',
    }

    if not CENSUS_API_KEY:
        raise RuntimeError(
            "CENSUS_API_KEY is required. Set it as an environment variable. "
            "Get a free key at https://api.census.gov/data/key_signup.html"
        )
    params['key'] = CENSUS_API_KEY

    print("Fetching census demographic data...")
    response = requests.get(base_url, params=params)
    response.raise_for_status()

    data = response.json()
    headers = data[0]
    rows = data[1:]

    df = pd.DataFrame(rows, columns=headers)
    df = df.rename(columns={
        'B01003_001E': 'total_population',
        'B19013_001E': 'median_income',
        'B02001_002E': 'white_population',
        'B02001_003E': 'black_population',
        'B03003_003E': 'hispanic_population',
    })

    # Convert numeric columns
    numeric_cols = ['total_population', 'median_income', 'white_population',
                    'black_population', 'hispanic_population']
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Calculate percentages
    df['pct_white'] = (df['white_population'] / df['total_population'] * 100).round(1)
    df['pct_black'] = (df['black_population'] / df['total_population'] * 100).round(1)
    df['pct_hispanic'] = (df['hispanic_population'] / df['total_population'] * 100).round(1)
    df['pct_minority'] = (100 - df['pct_white']).round(1)

    # Create tract identifier
    df['tract_id'] = df['state'] + df['county'] + df['tract']

    # Fetch tract geometries from Census TIGER/Line
    print("Fetching tract geometries...")
    tiger_url = (
        f"https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb"
        f"/tigerWMS_ACS{CENSUS_VINTAGE}/MapServer/6/query"
    )

    tiger_params = {
        'where': f"STATE='{state_fips}' AND COUNTY='{county_fips}'",
        'outFields': '*',
        'f': 'geojson',
        'returnGeometry': 'true',
    }

    geom_response = requests.get(tiger_url, params=tiger_params)

    geom_response.raise_for_status()

    geojson_data = geom_response.json()
    gdf = gpd.GeoDataFrame.from_features(geojson_data['features'])
    gdf['tract_id'] = gdf['STATE'] + gdf['COUNTY'] + gdf['TRACT']

    # Merge demographics with geometries
    gdf = gdf.merge(df, on='tract_id', how='left')

    # Clean sentinel income values (Census uses -666666666 for missing)
    sentinel_mask = gdf['median_income'] < 0
    if sentinel_mask.any():
        county_median = gdf.loc[~sentinel_mask, 'median_income'].median()
        print(f"  Replacing {sentinel_mask.sum()} sentinel income values with county median ${county_median:,.0f}")
        gdf.loc[sentinel_mask, 'median_income'] = county_median

    # Drop tracts with 0 population (water-only, institutional, etc.)
    zero_pop = gdf['total_population'] == 0
    if zero_pop.any():
        print(f"  Dropping {zero_pop.sum()} tracts with 0 population")
        gdf = gdf[~zero_pop].reset_index(drop=True)

    # Save to file
    gdf.to_file(OUTPUT_FILE, driver='GeoJSON')
    print(f"Saved census data to {OUTPUT_FILE}")

    write_meta(OUTPUT_FILE, source_url=base_url, record_count=len(gdf),
               extra={'vintage': CENSUS_VINTAGE,
                      'temporal_coverage': f'{CENSUS_VINTAGE - 4}-{CENSUS_VINTAGE}'})

    return gdf

if __name__ == '__main__':
    force = '--force' in sys.argv

    print("Durham Transportation Safety Data Acquisition")
    print("=" * 50)

    if not force and is_fresh(OUTPUT_FILE, DATA_FRESHNESS['census']):
        print(f"Census data is fresh (< {DATA_FRESHNESS['census']} days old), skipping fetch.")
        print("Use --force to re-fetch.")
        sys.exit(0)

    gdf = fetch_durham_census_tracts()

    print(f"\nFetched {len(gdf)} census tracts")
    print(f"Income range: ${gdf['median_income'].min():,.0f} - ${gdf['median_income'].max():,.0f}")
    print(f"Population range: {gdf['total_population'].min():,.0f} - {gdf['total_population'].max():,.0f}")
    print("\nData acquisition complete!")
