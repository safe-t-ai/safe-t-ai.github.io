"""
Tests for suppressed demand analyzer model.
"""

import pytest
import pandas as pd
from models.demand_analyzer import SuppressedDemandAnalyzer
from config import SUPPRESSED_DEMAND_CONFIG


def test_demand_analyzer_initialization(sample_census_gdf, sample_infrastructure_df):
    """Test demand analyzer initialization."""
    analyzer = SuppressedDemandAnalyzer(sample_census_gdf, sample_infrastructure_df)
    assert analyzer.census_gdf is not None
    assert analyzer.infrastructure_df is not None


def test_demand_analyzer_requires_infrastructure_df(sample_census_gdf):
    """Test that missing infrastructure_df raises ValueError."""
    with pytest.raises(ValueError, match="infrastructure_df is required"):
        SuppressedDemandAnalyzer(sample_census_gdf)


def test_infrastructure_scores_from_osm(sample_census_gdf, sample_infrastructure_df):
    """Test that infrastructure scores come from OSM data, not synthetic."""
    analyzer = SuppressedDemandAnalyzer(sample_census_gdf, sample_infrastructure_df)
    results = analyzer.run_analysis()
    demand_df = results['demand_data']

    # Merge expected scores for comparison
    expected = sample_infrastructure_df.set_index('tract_id')['osm_infrastructure_score']
    for _, row in demand_df.iterrows():
        assert row['infrastructure_score'] == pytest.approx(
            expected[row['tract_id']], abs=1e-6
        )


def test_suppressed_demand_config():
    """Test suppressed demand configuration."""
    assert 'base_rate' in SUPPRESSED_DEMAND_CONFIG
    assert 'infrastructure_quality_correlation' in SUPPRESSED_DEMAND_CONFIG
    assert 0 <= SUPPRESSED_DEMAND_CONFIG['base_rate'] <= 1
    assert 0 <= SUPPRESSED_DEMAND_CONFIG['infrastructure_quality_correlation'] <= 1
