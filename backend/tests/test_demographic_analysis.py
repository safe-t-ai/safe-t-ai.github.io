"""
Tests for demographic analysis utilities.
"""

import pytest
import pandas as pd
import numpy as np
from utils.demographic_analysis import (
    calculate_income_quintiles,
    calculate_minority_category,
    calculate_error_metrics,
    equity_gap_analysis,
    disparate_impact_ratio,
    calculate_gini_coefficient,
    demographic_stratified_analysis,
)


def test_calculate_income_quintiles():
    """Test income quintile calculation."""
    df = pd.DataFrame({
        'median_income': [20000, 40000, 60000, 80000, 100000]
    })
    result = calculate_income_quintiles(df)

    assert 'income_quintile' in result.columns
    assert result['income_quintile'].nunique() == 5
    assert result['income_quintile'].min() == 1
    assert result['income_quintile'].max() == 5


def test_calculate_income_quintiles_with_nan():
    """Test quintile calculation handles NaN values."""
    df = pd.DataFrame({
        'median_income': [20000, np.nan, 60000, 80000, 100000]
    })
    result = calculate_income_quintiles(df)

    assert result['income_quintile'].isna().sum() == 1
    assert result['income_quintile'].notna().sum() == 4


def test_calculate_minority_category():
    """Test minority category assignment."""
    df = pd.DataFrame({
        'pct_minority': [10, 35, 75]
    })
    result = calculate_minority_category(df)

    assert result.loc[0, 'minority_category'] == 'Low (<30%)'
    assert result.loc[1, 'minority_category'] == 'Medium (30-60%)'
    assert result.loc[2, 'minority_category'] == 'High (>60%)'


def test_calculate_error_metrics():
    """Test error metrics calculation."""
    df = pd.DataFrame({
        'true_volume': [100, 200, 300],
        'predicted_volume': [110, 180, 320],
    })
    metrics = calculate_error_metrics(
        df['true_volume'],
        df['predicted_volume']
    )

    assert 'mae' in metrics
    assert 'rmse' in metrics
    assert 'mape' in metrics
    assert 'bias' in metrics
    assert 'r_squared' in metrics

    assert metrics['mae'] > 0
    assert metrics['rmse'] >= metrics['mae']
    assert 0 <= metrics['r_squared'] <= 1


def test_calculate_error_metrics_perfect_prediction():
    """Test metrics with perfect predictions."""
    true_values = [100, 200, 300]
    predicted_values = [100, 200, 300]

    metrics = calculate_error_metrics(true_values, predicted_values)

    assert metrics['mae'] == 0
    assert metrics['rmse'] == 0
    assert metrics['r_squared'] == 1.0


def test_equity_gap_analysis(sample_census_gdf):
    """Test equity gap analysis."""
    df = sample_census_gdf.copy()
    df = calculate_income_quintiles(df)
    df['error'] = [10, 15, 20, 25, 30]

    gap = equity_gap_analysis(df, 'error', 'income_quintile')

    assert gap is not None
    assert 'best_group' in gap
    assert 'worst_group' in gap
    assert 'gap' in gap
    assert 'gap_pct' in gap
    assert 'p_value' in gap
    assert gap['gap'] > 0


def test_equity_gap_analysis_insufficient_groups():
    """Test gap analysis with insufficient groups."""
    df = pd.DataFrame({
        'metric': [10, 20],
        'group': ['A', 'A']
    })

    gap = equity_gap_analysis(df, 'metric', 'group')
    assert gap is None


def test_disparate_impact_ratio():
    """Test disparate impact ratio calculation."""
    result = disparate_impact_ratio(0.6, 0.8)

    assert 'ratio' in result
    assert 'passes_80_percent_rule' in result
    assert abs(result['ratio'] - 0.75) < 0.01
    assert result['passes_80_percent_rule'] is False


def test_disparate_impact_ratio_passes():
    """Test disparate impact ratio that passes 80% rule."""
    result = disparate_impact_ratio(0.85, 1.0)

    assert result['ratio'] == 0.85
    assert result['passes_80_percent_rule'] is True


def test_disparate_impact_ratio_zero_reference():
    """Test disparate impact with zero reference rate."""
    result = disparate_impact_ratio(0.5, 0.0)
    assert result is None


def test_calculate_gini_coefficient():
    """Test Gini coefficient calculation."""
    # Perfect equality
    equal_values = [10, 10, 10, 10]
    gini_equal = calculate_gini_coefficient(equal_values)
    assert gini_equal < 0.1

    # Perfect inequality
    unequal_values = [0, 0, 0, 100]
    gini_unequal = calculate_gini_coefficient(unequal_values)
    assert gini_unequal > 0.7


def test_calculate_gini_coefficient_with_nan():
    """Test Gini coefficient handles NaN values."""
    values = [10, 20, np.nan, 40, 50]
    gini = calculate_gini_coefficient(values)
    assert gini is not None
    assert 0 <= gini <= 1


def test_calculate_gini_coefficient_empty():
    """Test Gini coefficient with empty array."""
    values = [np.nan, np.nan]
    gini = calculate_gini_coefficient(values)
    assert gini is None


def test_demographic_stratified_analysis(sample_census_gdf):
    """Test full demographic stratified analysis."""
    df = sample_census_gdf.copy()
    df['metric'] = [10, 20, 30, 40, 50]

    results = demographic_stratified_analysis(df, 'metric')

    assert 'by_income_quintile' in results
    assert 'by_minority_category' in results
    assert 'overall' in results
    assert 'equity_gaps' in results

    assert len(results['by_income_quintile']) > 0
    assert 'mean' in results['overall']
    assert results['equity_gaps']['income'] is not None
