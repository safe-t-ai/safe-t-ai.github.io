"""
Tests for volume estimation auditor model.
"""

import pytest
import pandas as pd
import numpy as np
from models.volume_estimator import VolumeEstimationAuditor


@pytest.fixture
def volume_test_data(sample_census_gdf, sample_predictions_df):
    """Prepare test data for volume estimator."""
    return {
        'census': sample_census_gdf,
        'ground_truth': sample_predictions_df[['counter_id', 'tract_id', 'true_volume']],
        'predictions': sample_predictions_df[['counter_id', 'tract_id', 'predicted_volume']],
    }


def test_volume_auditor_initialization(volume_test_data):
    """Test volume auditor initialization."""
    auditor = VolumeEstimationAuditor(
        volume_test_data['census'],
        volume_test_data['ground_truth'],
        volume_test_data['predictions'].merge(
            volume_test_data['ground_truth'],
            on=['counter_id', 'tract_id']
        )
    )

    assert auditor.census_gdf is not None
    assert auditor.ai_predictions_df is not None
    assert 'income_quintile' in auditor.ai_predictions_df.columns


def test_analyze_overall_accuracy(sample_census_gdf, sample_predictions_df):
    """Test overall accuracy analysis."""
    auditor = VolumeEstimationAuditor(
        sample_census_gdf,
        sample_predictions_df,
        sample_predictions_df
    )

    results = auditor.analyze_overall_accuracy()

    assert 'metrics' in results
    assert 'total_counters' in results
    assert results['total_counters'] == len(sample_predictions_df)
    assert 'mae' in results['metrics']


def test_analyze_by_income(sample_census_gdf, sample_predictions_df):
    """Test analysis by income quintile."""
    # Ensure predictions have the required error columns
    df = sample_predictions_df.copy()
    df['error'] = df['predicted_volume'] - df['true_volume']
    df['error_pct'] = (df['error'] / df['true_volume']) * 100

    auditor = VolumeEstimationAuditor(
        sample_census_gdf,
        df,
        df
    )

    results = auditor.analyze_by_income()

    # Check structure
    assert isinstance(results, dict)
    assert 'by_quintile' in results
    assert 'equity_gap' in results
    assert len(results['by_quintile']) > 0


def test_enrich_predictions(sample_census_gdf, sample_predictions_df):
    """Test demographic enrichment of predictions."""
    auditor = VolumeEstimationAuditor(
        sample_census_gdf,
        sample_predictions_df,
        sample_predictions_df
    )

    assert 'median_income' in auditor.ai_predictions_df.columns
    assert 'pct_minority' in auditor.ai_predictions_df.columns
    assert auditor.ai_predictions_df['median_income'].notna().any()
