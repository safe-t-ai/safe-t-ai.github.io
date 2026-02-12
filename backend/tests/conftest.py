"""
Shared pytest fixtures for test suite.
"""

import pytest
import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon, Point


@pytest.fixture
def sample_census_gdf():
    """Minimal census GeoDataFrame for testing."""
    return gpd.GeoDataFrame({
        'tract_id': ['001', '002', '003', '004', '005'],
        'median_income': [30000, 45000, 60000, 75000, 90000],
        'pct_minority': [70, 55, 40, 25, 15],
        'total_population': [5000, 4000, 3000, 2500, 2000],
    }, geometry=[
        Polygon([(0, 0), (0, 1), (1, 1), (1, 0)]),
        Polygon([(1, 0), (1, 1), (2, 1), (2, 0)]),
        Polygon([(2, 0), (2, 1), (3, 1), (3, 0)]),
        Polygon([(3, 0), (3, 1), (4, 1), (4, 0)]),
        Polygon([(4, 0), (4, 1), (5, 1), (5, 0)]),
    ], crs='EPSG:4326')


@pytest.fixture
def sample_predictions_df():
    """Sample AI predictions for testing."""
    return pd.DataFrame({
        'counter_id': ['c1', 'c2', 'c3', 'c4', 'c5'],
        'tract_id': ['001', '002', '003', '004', '005'],
        'predicted_volume': [100, 200, 300, 400, 500],
        'true_volume': [110, 180, 320, 380, 510],
    })


@pytest.fixture
def sample_crash_data():
    """Sample crash data for testing."""
    return pd.DataFrame({
        'crash_id': range(1, 101),
        'latitude': [35.9 + i * 0.001 for i in range(100)],
        'longitude': [-78.9 + i * 0.001 for i in range(100)],
        'crash_date': pd.date_range('2023-01-01', periods=100, freq='D'),
        'year': [2023] * 100,
    })


@pytest.fixture
def sample_infrastructure_df():
    """Sample OSM infrastructure data matching sample_census_gdf tract_ids."""
    return pd.DataFrame({
        'tract_id': ['001', '002', '003', '004', '005'],
        'osm_infrastructure_score': [0.15, 0.30, 0.50, 0.70, 0.85],
        'crossings_count': [2, 5, 10, 15, 20],
        'bike_infra_count': [0, 1, 3, 8, 12],
        'traffic_signals_count': [1, 3, 6, 10, 14],
        'speed_calming_count': [0, 0, 2, 4, 6],
        'footways_count': [1, 4, 8, 14, 22],
        'crossings_density': [0.5, 1.2, 2.5, 3.8, 5.0],
        'bike_infra_density': [0.0, 0.3, 0.8, 2.0, 3.0],
        'traffic_signals_density': [0.2, 0.8, 1.5, 2.5, 3.5],
        'speed_calming_density': [0.0, 0.0, 0.5, 1.0, 1.5],
        'footways_density': [0.2, 1.0, 2.0, 3.5, 5.5],
    })


@pytest.fixture
def sample_temporal_data():
    """Sample temporal data for validation testing."""
    return pd.DataFrame({
        'date': pd.date_range('2019-01-01', '2023-12-31', freq='M'),
        'value': range(60),
    })
