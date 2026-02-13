"""
Tests for temporal validation utilities.
"""

import pytest
from datetime import datetime, timedelta
import pandas as pd
from config import CRASH_ANALYSIS_YEARS
from utils.temporal_validation import (
    validate_data_freshness,
    validate_temporal_coverage,
    validate_temporal_split,
)


def test_validate_data_freshness_recent():
    """Test freshness validation with recent data."""
    yesterday = (datetime.now() - timedelta(days=1)).isoformat()
    result = validate_data_freshness(yesterday, max_age_days=7)

    assert result['valid'] is True
    assert result['age_days'] == 1


def test_validate_data_freshness_stale():
    """Test freshness validation with stale data."""
    old_date = (datetime.now() - timedelta(days=400)).isoformat()
    result = validate_data_freshness(old_date, max_age_days=365)

    assert result['valid'] is False
    assert result['age_days'] == 400
    assert 'max: 365' in result['message']


def test_validate_temporal_coverage_complete(sample_temporal_data):
    """Test temporal coverage with all expected years."""
    result = validate_temporal_coverage(sample_temporal_data, 'date', CRASH_ANALYSIS_YEARS)

    assert result['valid'] is True
    assert result['missing_years'] == []
    assert set(result['years_present']) == set(CRASH_ANALYSIS_YEARS)


def test_validate_temporal_coverage_missing():
    """Test temporal coverage with missing years."""
    df = pd.DataFrame({
        'date': pd.date_range('2019-01-01', '2021-12-31', freq='M')
    })
    result = validate_temporal_coverage(df, 'date', CRASH_ANALYSIS_YEARS)

    assert result['valid'] is False
    missing = set(CRASH_ANALYSIS_YEARS) - {2019, 2020, 2021}
    assert set(result['missing_years']) == missing
    assert set(result['years_present']) == {2019, 2020, 2021}


def test_validate_temporal_split_no_leakage():
    """Test temporal split validation without leakage."""
    train_df = pd.DataFrame({
        'date': pd.date_range('2019-01-01', '2022-12-31', freq='M')
    })
    test_df = pd.DataFrame({
        'date': pd.date_range('2023-01-01', '2023-12-31', freq='M')
    })

    result = validate_temporal_split(train_df, test_df, 'date')

    assert result['valid'] is True
    assert 'Clean temporal split' in result['message']


def test_validate_temporal_split_with_leakage():
    """Test temporal split validation with leakage."""
    train_df = pd.DataFrame({
        'date': pd.date_range('2019-01-01', '2023-06-30', freq='M')
    })
    test_df = pd.DataFrame({
        'date': pd.date_range('2023-01-01', '2023-12-31', freq='M')
    })

    result = validate_temporal_split(train_df, test_df, 'date')

    assert result['valid'] is False
    assert 'Temporal leakage detected' in result['message']
