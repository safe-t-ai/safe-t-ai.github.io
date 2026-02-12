"""
Temporal validation utilities for data freshness and time-based splits.
"""

from datetime import datetime
import pandas as pd


def validate_data_freshness(fetch_date_str, max_age_days=365):
    """
    Check if data is recent enough.

    Args:
        fetch_date_str: ISO format date string
        max_age_days: Maximum allowed age in days

    Returns:
        Dict with validation result, age, and message
    """
    fetch_date = datetime.fromisoformat(fetch_date_str)
    age = (datetime.now() - fetch_date).days

    if age > max_age_days:
        return {
            'valid': False,
            'age_days': age,
            'message': f'Data is {age} days old (max: {max_age_days})'
        }

    return {
        'valid': True,
        'age_days': age,
        'message': f'Data is {age} days old'
    }


def validate_temporal_coverage(df, date_column, expected_years):
    """
    Ensure data covers expected date range.

    Args:
        df: DataFrame with date column
        date_column: Name of date column
        expected_years: List of years that should be present

    Returns:
        Dict with validation result and coverage details
    """
    df[date_column] = pd.to_datetime(df[date_column])
    years_present = df[date_column].dt.year.unique()

    missing_years = set(expected_years) - set(years_present)

    return {
        'valid': len(missing_years) == 0,
        'years_present': sorted(years_present.tolist()),
        'missing_years': sorted(list(missing_years)),
        'min_date': df[date_column].min().isoformat(),
        'max_date': df[date_column].max().isoformat(),
    }


def validate_temporal_split(train_df, test_df, date_column):
    """
    Ensure temporal split has no leakage.

    Args:
        train_df: Training data
        test_df: Test data
        date_column: Name of date column

    Returns:
        Dict with validation result and split details
    """
    train_max = train_df[date_column].max()
    test_min = test_df[date_column].min()

    has_leakage = train_max >= test_min

    return {
        'valid': not has_leakage,
        'train_max_date': train_max.isoformat(),
        'test_min_date': test_min.isoformat(),
        'message': 'Temporal leakage detected' if has_leakage else 'Clean temporal split'
    }
