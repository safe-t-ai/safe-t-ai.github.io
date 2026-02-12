"""Shared data-loading helpers used by pipeline scripts."""

import json

import pandas as pd

from config import RAW_DATA_DIR


def load_infrastructure_data() -> pd.DataFrame:
    """Load OSM infrastructure scores from the raw data directory."""
    infra_path = RAW_DATA_DIR / 'osm_infrastructure.json'
    if not infra_path.exists():
        raise FileNotFoundError(
            f"Infrastructure data not found at {infra_path}. "
            "Run fetch_osm_infrastructure.py first."
        )

    with open(infra_path) as f:
        data = json.load(f)

    return pd.DataFrame(data['tracts'])
