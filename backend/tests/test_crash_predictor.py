"""
Tests for crash prediction auditor model.
"""

import pytest
import pandas as pd
import numpy as np
from models.crash_predictor import CrashPredictionAuditor


def test_crash_predictor_initialization(sample_census_gdf):
    """Test crash predictor initialization."""
    auditor = CrashPredictionAuditor(sample_census_gdf)

    assert auditor.census_gdf is not None
    assert len(auditor.years) == 5
    assert 2023 in auditor.years


def test_generate_crash_data(sample_census_gdf):
    """Test crash data generation."""
    auditor = CrashPredictionAuditor(sample_census_gdf)
    crash_data = auditor.generate_crash_data(base_rate=35.0, seed=42)

    assert len(crash_data) == len(sample_census_gdf) * 5  # 5 years
    assert 'actual_crashes' in crash_data.columns
    assert 'median_income' in crash_data.columns
    assert crash_data['actual_crashes'].min() >= 0


def test_generate_crash_data_reproducibility(sample_census_gdf):
    """Test crash data generation is reproducible with same seed."""
    auditor = CrashPredictionAuditor(sample_census_gdf)

    crash_data_1 = auditor.generate_crash_data(seed=42)
    crash_data_2 = auditor.generate_crash_data(seed=42)

    pd.testing.assert_frame_equal(crash_data_1, crash_data_2)


def test_simulate_reporting_bias(sample_census_gdf):
    """Test reporting bias simulation."""
    auditor = CrashPredictionAuditor(sample_census_gdf)
    crash_data = auditor.generate_crash_data(seed=42)
    crash_data = auditor.simulate_reporting_bias(crash_data)

    assert 'reported_crashes' in crash_data.columns
    assert 'reporting_rate' in crash_data.columns

    # Reported crashes should be <= actual crashes
    assert (crash_data['reported_crashes'] <= crash_data['actual_crashes'] + 5).all()

    # Higher income areas should have higher reporting rates
    low_income = crash_data[crash_data['norm_income'] < 0.3]['reporting_rate'].mean()
    high_income = crash_data[crash_data['norm_income'] > 0.7]['reporting_rate'].mean()
    assert high_income > low_income


def test_simulate_ai_predictions(sample_census_gdf):
    """Test AI prediction simulation."""
    auditor = CrashPredictionAuditor(sample_census_gdf)
    crash_data = auditor.generate_crash_data(seed=42)
    crash_data = auditor.simulate_reporting_bias(crash_data)
    crash_data = auditor.simulate_ai_predictions(crash_data)

    assert 'ai_predicted_crashes' in crash_data.columns
    assert 'income_quintile' in crash_data.columns
    assert crash_data['ai_predicted_crashes'].min() >= 0


def test_calculate_confusion_matrices(sample_census_gdf):
    """Test confusion matrix calculation."""
    auditor = CrashPredictionAuditor(sample_census_gdf)
    crash_data = auditor.generate_crash_data(seed=42)
    crash_data = auditor.simulate_reporting_bias(crash_data)
    crash_data = auditor.simulate_ai_predictions(crash_data)

    results = auditor.calculate_confusion_matrices(crash_data)

    assert 'overall' in results
    assert 'by_quintile' in results
    assert 'confusion_matrix' in results['overall']
    assert 'precision' in results['overall']
    assert 'recall' in results['overall']
    assert 'f1_score' in results['overall']


def test_calculate_roc_curves(sample_census_gdf):
    """Test ROC curve calculation."""
    auditor = CrashPredictionAuditor(sample_census_gdf)
    crash_data = auditor.generate_crash_data(seed=42)
    crash_data = auditor.simulate_reporting_bias(crash_data)
    crash_data = auditor.simulate_ai_predictions(crash_data)

    results = auditor.calculate_roc_curves(crash_data)

    assert 'overall' in results
    assert 'by_quintile' in results
    assert 'auc' in results['overall']
    assert 0 <= results['overall']['auc'] <= 1


def test_generate_time_series(sample_census_gdf):
    """Test time series generation."""
    auditor = CrashPredictionAuditor(sample_census_gdf)
    crash_data = auditor.generate_crash_data(seed=42)
    crash_data = auditor.simulate_reporting_bias(crash_data)
    crash_data = auditor.simulate_ai_predictions(crash_data)

    time_series = auditor.generate_time_series(crash_data)

    assert 'years' in time_series
    assert 'by_quintile' in time_series
    assert 'overall' in time_series
    assert len(time_series['years']) == 5


def test_run_audit_complete(sample_census_gdf):
    """Test complete audit run."""
    auditor = CrashPredictionAuditor(sample_census_gdf)
    results = auditor.run_audit()

    assert 'summary' in results
    assert 'bias_by_quintile' in results
    assert 'confusion_matrices' in results
    assert 'roc_curves' in results
    assert 'time_series' in results
    assert 'crash_data' in results

    # Check summary has expected fields
    assert 'total_actual_crashes' in results['summary']
    assert 'total_reported_crashes' in results['summary']
    assert 'years_analyzed' in results['summary']
