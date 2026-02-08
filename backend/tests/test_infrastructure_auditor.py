"""
Tests for infrastructure recommendation auditor model.
"""

import pytest
import pandas as pd
from models.infrastructure_auditor import InfrastructureRecommendationAuditor
from config import INFRASTRUCTURE_PROJECT_TYPES, INFRASTRUCTURE_DEFAULT_BUDGET


def test_infrastructure_auditor_initialization(sample_census_gdf):
    """Test infrastructure auditor initialization."""
    auditor = InfrastructureRecommendationAuditor(sample_census_gdf)

    assert auditor.census_gdf is not None
    assert auditor.total_budget == INFRASTRUCTURE_DEFAULT_BUDGET


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
