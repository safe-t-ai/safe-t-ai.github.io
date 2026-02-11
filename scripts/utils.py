"""Shared utilities for simulation scripts."""

import geopandas as gpd
from config import RAW_DATA_DIR


CENSUS_FILE = RAW_DATA_DIR / 'durham_census_tracts.geojson'

REQUIRED_CENSUS_COLUMNS = ['tract_id', 'median_income', 'total_population', 'pct_minority', 'geometry']


def load_census_data():
    """Load Durham census tract data with validation."""
    if not CENSUS_FILE.exists():
        raise FileNotFoundError(
            f"Census data not found at {CENSUS_FILE}. "
            "Run fetch_durham_data.py first."
        )

    gdf = gpd.read_file(CENSUS_FILE)
    print(f"Loaded {len(gdf)} census tracts")

    missing = [col for col in REQUIRED_CENSUS_COLUMNS if col not in gdf.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    return gdf
