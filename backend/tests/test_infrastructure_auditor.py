"""
Tests for infrastructure recommendation auditor model.
"""

import pytest
import pandas as pd
from models.infrastructure_auditor import InfrastructureRecommendationAuditor
from config import INFRASTRUCTURE_PROJECT_TYPES, INFRASTRUCTURE_DEFAULT_BUDGET


def test_infrastructure_auditor_initialization(sample_census_gdf, sample_infrastructure_df):
    """Test infrastructure auditor initialization."""
    auditor = InfrastructureRecommendationAuditor(sample_census_gdf, sample_infrastructure_df)
    assert auditor.census_gdf is not None
    assert auditor.total_budget == INFRASTRUCTURE_DEFAULT_BUDGET


def test_infrastructure_auditor_requires_infrastructure_df(sample_census_gdf):
    """Test that missing infrastructure_df raises ValueError."""
    with pytest.raises(ValueError, match="infrastructure_df is required"):
        InfrastructureRecommendationAuditor(sample_census_gdf)


def test_select_project_type_for_gap(sample_census_gdf, sample_infrastructure_df):
    """Test that gap-based project selection picks the type with lowest density."""
    auditor = InfrastructureRecommendationAuditor(sample_census_gdf, sample_infrastructure_df)

    # Tract '001' has densities: crossings=0.5, bike=0.0, signals=0.2, calming=0.0
    # Lowest is bike_infra_density=0.0 and speed_calming_density=0.0
    # First lowest encountered wins: bike_infra_density -> bike_lane
    # Actually let's check: iteration order matters
    result = auditor._select_project_type_for_gap('001')
    # bike_infra_density (0.0) ties with speed_calming_density (0.0)
    # but bike_infra_density comes first in iteration
    assert result in ('bike_lane', 'speed_reduction')

    # Tract '005' has highest densities across all categories
    # crossings=5.0, bike=3.0, signals=3.5, calming=1.5
    # Lowest is speed_calming_density=1.5 -> speed_reduction
    result = auditor._select_project_type_for_gap('005')
    assert result == 'speed_reduction'


def test_infrastructure_project_types_from_config():
    """Test that project types are loaded from config."""
    assert 'bike_lane' in INFRASTRUCTURE_PROJECT_TYPES
    assert 'crosswalk' in INFRASTRUCTURE_PROJECT_TYPES
    assert 'cost' in INFRASTRUCTURE_PROJECT_TYPES['bike_lane']
    assert 'safety_impact' in INFRASTRUCTURE_PROJECT_TYPES['bike_lane']


def test_infrastructure_budget_from_config():
    """Test that budget is loaded from config."""
    assert INFRASTRUCTURE_DEFAULT_BUDGET > 0
    assert isinstance(INFRASTRUCTURE_DEFAULT_BUDGET, int)
