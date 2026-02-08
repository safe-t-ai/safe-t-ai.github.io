"""
Tests for suppressed demand analyzer model.
"""

import pytest
import pandas as pd
from models.demand_analyzer import SuppressedDemandAnalyzer
from config import SUPPRESSED_DEMAND_CONFIG


def test_demand_analyzer_initialization(sample_census_gdf):
    """Test demand analyzer initialization."""
    analyzer = SuppressedDemandAnalyzer(sample_census_gdf)

    assert analyzer.census_gdf is not None


def test_suppressed_demand_config():
    """Test suppressed demand configuration."""
    assert 'base_rate' in SUPPRESSED_DEMAND_CONFIG
    assert 'infrastructure_quality_correlation' in SUPPRESSED_DEMAND_CONFIG
    assert 0 <= SUPPRESSED_DEMAND_CONFIG['base_rate'] <= 1
    assert 0 <= SUPPRESSED_DEMAND_CONFIG['infrastructure_quality_correlation'] <= 1
