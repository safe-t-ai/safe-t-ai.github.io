"""
Fetch real Durham NC data from public sources:
- Census demographics (US Census API)
- Road network (OpenStreetMap)
- Generate census tract boundaries
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / 'backend'))

import requests
import json
import geopandas as gpd
from shapely.geometry import shape, Point
import pandas as pd
from config import RAW_DATA_DIR, DURHAM_BOUNDS, CENSUS_API_KEY

RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

def fetch_durham_census_tracts():
    """Fetch Durham County census tracts with demographic data"""

    # Durham County FIPS code: 37063
    state_fips = '37'
    county_fips = '063'

    # ACS 5-Year Estimates (2022)
    # Variables: B01003_001E (Total Pop), B19013_001E (Median Income),
    #            B02001_002E (White Alone), B02001_003E (Black/AA)
    base_url = "https://api.census.gov/data/2022/acs/acs5"

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

    if CENSUS_API_KEY:
        params['key'] = CENSUS_API_KEY

    print("Fetching census demographic data...")
    response = requests.get(base_url, params=params)

    if response.status_code != 200:
        print(f"Warning: Census API returned {response.status_code}")
        print("Generating synthetic census data instead...")
        return generate_synthetic_census_data()

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
    tiger_url = f"https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/6/query"

    tiger_params = {
        'where': f"STATE='{state_fips}' AND COUNTY='{county_fips}'",
        'outFields': '*',
        'f': 'geojson',
        'returnGeometry': 'true',
    }

    geom_response = requests.get(tiger_url, params=tiger_params)

    if geom_response.status_code == 200:
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
    else:
        print("Warning: Could not fetch tract geometries, generating synthetic boundaries...")
        gdf = generate_synthetic_boundaries(df)

    # Save to file
    output_file = RAW_DATA_DIR / 'durham_census_tracts.geojson'
    gdf.to_file(output_file, driver='GeoJSON')
    print(f"Saved census data to {output_file}")

    return gdf

def generate_synthetic_census_data():
    """Generate synthetic Durham census data for demo purposes"""
    import numpy as np

    print("Generating synthetic census data...")

    # Create 25 synthetic census tracts in a 5x5 grid
    num_tracts = 25
    grid_size = 5

    data = []
    tract_num = 1

    for i in range(grid_size):
        for j in range(grid_size):
            # Create spatial pattern: wealthy areas in center/north,
            # lower-income areas in south/east
            distance_from_center = np.sqrt((i - 2)**2 + (j - 2)**2)

            # Income pattern (higher in center)
            base_income = 80000 - (distance_from_center * 15000)
            median_income = int(base_income + np.random.normal(0, 10000))
            median_income = max(25000, min(150000, median_income))

            # Population
            total_pop = int(np.random.uniform(2000, 6000))

            # Racial demographics (correlated with income)
            if median_income > 70000:
                pct_white = np.random.uniform(60, 80)
            else:
                pct_white = np.random.uniform(20, 50)

            pct_black = np.random.uniform(15, 60) * (1 - pct_white/100)
            pct_hispanic = 100 - pct_white - pct_black

            tract_data = {
                'tract_id': f'37063{tract_num:06d}',
                'NAME': f'Census Tract {tract_num}, Durham County, NC',
                'total_population': total_pop,
                'median_income': median_income,
                'pct_white': round(pct_white, 1),
                'pct_black': round(pct_black, 1),
                'pct_hispanic': round(pct_hispanic, 1),
                'pct_minority': round(100 - pct_white, 1),
                'grid_i': i,
                'grid_j': j,
            }

            data.append(tract_data)
            tract_num += 1

    df = pd.DataFrame(data)
    gdf = generate_synthetic_boundaries(df)

    output_file = RAW_DATA_DIR / 'durham_census_tracts.geojson'
    gdf.to_file(output_file, driver='GeoJSON')
    print(f"Saved synthetic census data to {output_file}")

    return gdf

def generate_synthetic_boundaries(df):
    """Generate rectangular census tract boundaries in a grid"""
    from shapely.geometry import Polygon

    if 'grid_i' in df.columns:
        # Use grid coordinates
        grid_size = 5

        # Durham approximate bounds
        lat_min, lat_max = 35.87, 36.14
        lon_min, lon_max = -79.02, -78.77

        lat_step = (lat_max - lat_min) / grid_size
        lon_step = (lon_max - lon_min) / grid_size

        geometries = []
        for _, row in df.iterrows():
            i, j = row['grid_i'], row['grid_j']

            lat_south = lat_min + i * lat_step
            lat_north = lat_south + lat_step
            lon_west = lon_min + j * lon_step
            lon_east = lon_west + lon_step

            poly = Polygon([
                (lon_west, lat_south),
                (lon_east, lat_south),
                (lon_east, lat_north),
                (lon_west, lat_north),
                (lon_west, lat_south)
            ])
            geometries.append(poly)

        gdf = gpd.GeoDataFrame(df, geometry=geometries, crs='EPSG:4326')
    else:
        # Random polygons
        geometries = []
        for _ in range(len(df)):
            center_lon = np.random.uniform(-79.02, -78.77)
            center_lat = np.random.uniform(35.87, 36.14)

            radius = 0.02
            poly = Point(center_lon, center_lat).buffer(radius)
            geometries.append(poly)

        gdf = gpd.GeoDataFrame(df, geometry=geometries, crs='EPSG:4326')

    return gdf

if __name__ == '__main__':
    print("Durham Transportation Safety Data Acquisition")
    print("=" * 50)

    # Fetch census data
    gdf = fetch_durham_census_tracts()

    print(f"\nFetched {len(gdf)} census tracts")
    print(f"Income range: ${gdf['median_income'].min():,.0f} - ${gdf['median_income'].max():,.0f}")
    print(f"Population range: {gdf['total_population'].min():,.0f} - {gdf['total_population'].max():,.0f}")
    print("\nData acquisition complete!")
