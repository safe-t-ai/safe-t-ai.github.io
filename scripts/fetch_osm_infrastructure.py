"""
Fetch pedestrian and cyclist infrastructure data from OpenStreetMap via Overpass API.

Queries crossings, bike infrastructure, traffic signals, speed calming, and footways
within Durham County bounds, then spatial-joins to census tracts to produce per-tract
infrastructure density scores.

Depends on durham_census_tracts.geojson existing (run fetch_durham_data.py first).
"""

import sys
import json
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent / 'backend'))

import requests
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

from config import (
    RAW_DATA_DIR, DURHAM_BOUNDS, OVERPASS_API, OVERPASS_TIMEOUT,
    OSM_INFRASTRUCTURE_FEATURES,
)

RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)


def build_overpass_query() -> str:
    """Build a single Overpass QL query for all infrastructure feature types."""
    s, w, n, e = (
        DURHAM_BOUNDS['south'], DURHAM_BOUNDS['west'],
        DURHAM_BOUNDS['north'], DURHAM_BOUNDS['east'],
    )
    bbox = f"{s},{w},{n},{e}"

    statements = []
    for category, spec in OSM_INFRASTRUCTURE_FEATURES.items():
        tags = spec['tags']
        statements.append(f'  node{tags}({bbox});')
        statements.append(f'  way{tags}({bbox});')

    query = f"""[out:json][timeout:{OVERPASS_TIMEOUT}];
(
{"".join(chr(10) + s for s in statements)}
);
out center;"""
    return query


def classify_element(element: dict) -> str | None:
    """Classify an OSM element into an infrastructure category based on tags."""
    tags = element.get('tags', {})

    highway = tags.get('highway', '')
    if highway == 'crossing':
        return 'crossings'
    if highway == 'traffic_signals':
        return 'traffic_signals'
    if highway == 'footway':
        return 'footways'
    if highway in ('cycleway', 'path') and tags.get('bicycle') != 'no':
        return 'bike_infra'
    if 'traffic_calming' in tags:
        return 'speed_calming'

    return None


def element_to_point(element: dict) -> Point | None:
    """Extract a Point geometry from an OSM element (node or way center)."""
    if element['type'] == 'node':
        return Point(element['lon'], element['lat'])
    center = element.get('center')
    if center:
        return Point(center['lon'], center['lat'])
    return None


def fetch_osm_infrastructure():
    """Fetch OSM infrastructure data, spatial-join to tracts, compute scores."""
    # Load census tracts
    tracts_path = RAW_DATA_DIR / 'durham_census_tracts.geojson'
    if not tracts_path.exists():
        raise FileNotFoundError(
            f"Census tracts not found at {tracts_path}. "
            "Run fetch_durham_data.py first."
        )

    tracts_gdf = gpd.read_file(tracts_path)
    # Ensure projected CRS for area calculation
    tracts_projected = tracts_gdf.to_crs(epsg=3857)
    tracts_gdf['area_km2'] = tracts_projected.geometry.area / 1e6

    # Query Overpass API
    query = build_overpass_query()
    print("Querying Overpass API for Durham infrastructure...")
    response = requests.post(OVERPASS_API, data={'data': query}, timeout=OVERPASS_TIMEOUT + 30)
    response.raise_for_status()

    data = response.json()
    elements = data.get('elements', [])
    print(f"  Received {len(elements)} OSM elements")

    # Classify elements and extract geometries
    records = []
    for el in elements:
        category = classify_element(el)
        if category is None:
            continue
        point = element_to_point(el)
        if point is None:
            continue
        records.append({'category': category, 'geometry': point})

    if not records:
        raise RuntimeError("No infrastructure elements found in Overpass response")

    infra_gdf = gpd.GeoDataFrame(records, crs='EPSG:4326')
    print(f"  Classified {len(infra_gdf)} elements into categories:")
    for cat, count in infra_gdf['category'].value_counts().items():
        print(f"    {cat}: {count}")

    # Spatial join: assign each infrastructure element to a census tract
    joined = gpd.sjoin(infra_gdf, tracts_gdf[['tract_id', 'geometry']], how='left', predicate='within')

    # Count features per tract per category
    categories = list(OSM_INFRASTRUCTURE_FEATURES.keys())
    tract_ids = tracts_gdf['tract_id'].unique()

    # Initialize with zeros for all tracts
    tract_data = {tid: {cat: 0 for cat in categories} for tid in tract_ids}

    for _, row in joined.iterrows():
        tid = row.get('tract_id')
        if pd.isna(tid):
            continue
        tract_data[tid][row['category']] += 1

    # Build per-tract DataFrame
    rows = []
    for tid in tract_ids:
        area_km2 = tracts_gdf.loc[tracts_gdf['tract_id'] == tid, 'area_km2'].iloc[0]
        row = {'tract_id': tid, 'area_km2': float(area_km2)}
        for cat in categories:
            count = tract_data[tid][cat]
            row[f'{cat}_count'] = count
            row[f'{cat}_density'] = count / area_km2 if area_km2 > 0 else 0.0
        rows.append(row)

    result_df = pd.DataFrame(rows)

    # Compute composite score: weighted min-max normalized densities
    for cat in categories:
        density_col = f'{cat}_density'
        col_min = result_df[density_col].min()
        col_max = result_df[density_col].max()
        col_range = col_max - col_min
        if col_range > 0:
            result_df[f'{cat}_norm'] = (result_df[density_col] - col_min) / col_range
        else:
            result_df[f'{cat}_norm'] = 0.0

    result_df['osm_infrastructure_score'] = sum(
        result_df[f'{cat}_norm'] * OSM_INFRASTRUCTURE_FEATURES[cat]['weight']
        for cat in categories
    )

    # Clip to [0.05, 0.95] — no tract has truly zero or perfect infrastructure
    result_df['osm_infrastructure_score'] = np.clip(
        result_df['osm_infrastructure_score'], 0.05, 0.95
    )

    # Summary stats
    print(f"\n  Per-tract infrastructure scores:")
    print(f"    Mean: {result_df['osm_infrastructure_score'].mean():.3f}")
    print(f"    Range: {result_df['osm_infrastructure_score'].min():.3f} - {result_df['osm_infrastructure_score'].max():.3f}")

    # Save with provenance
    output = {
        '_provenance': {
            'data_type': 'real',
            'source': 'OpenStreetMap via Overpass API',
            'features_queried': list(OSM_INFRASTRUCTURE_FEATURES.keys()),
            'bounds': DURHAM_BOUNDS,
            'total_elements': len(infra_gdf),
        },
        'totals': {cat: int(result_df[f'{cat}_count'].sum()) for cat in categories},
        'tracts': result_df.to_dict(orient='records'),
    }

    output_path = RAW_DATA_DIR / 'osm_infrastructure.json'
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\n  Saved to {output_path}")

    return result_df


if __name__ == '__main__':
    print("OpenStreetMap Infrastructure Data Acquisition")
    print("=" * 50)
    df = fetch_osm_infrastructure()
    print(f"\nProcessed {len(df)} census tracts")
    print("Data acquisition complete!")
