"""
Shared statistical functions for demographic equity analysis.
Used across all benchmark tests.
"""

import numpy as np
import pandas as pd
from scipy import stats

def calculate_income_quintiles(df, income_column='median_income'):
    """
    Assign income quintiles (1=lowest, 5=highest)
    """
    quintiles = df[income_column].quantile([0.2, 0.4, 0.6, 0.8])

    def get_quintile(income):
        if pd.isna(income):
            return None
        if income <= quintiles[0.2]:
            return 1
        elif income <= quintiles[0.4]:
            return 2
        elif income <= quintiles[0.6]:
            return 3
        elif income <= quintiles[0.8]:
            return 4
        else:
            return 5

    df['income_quintile'] = df[income_column].apply(get_quintile)
    return df

def calculate_minority_category(df, minority_column='pct_minority'):
    """
    Categorize areas by minority percentage
    """
    def get_category(pct):
        if pd.isna(pct):
            return None
        if pct < 30:
            return 'Low (<30%)'
        elif pct < 60:
            return 'Medium (30-60%)'
        else:
            return 'High (>60%)'

    df['minority_category'] = df[minority_column].apply(get_category)
    return df

def calculate_error_metrics(true_values, predicted_values):
    """
    Calculate comprehensive error metrics
    """
    true_values = np.array(true_values)
    predicted_values = np.array(predicted_values)

    errors = predicted_values - true_values
    abs_errors = np.abs(errors)
    pct_errors = (errors / true_values) * 100

    metrics = {
        'mae': float(np.mean(abs_errors)),
        'mape': float(np.mean(np.abs(pct_errors))),
        'rmse': float(np.sqrt(np.mean(errors**2))),
        'mean_error': float(np.mean(errors)),
        'mean_pct_error': float(np.mean(pct_errors)),
        'bias': float(np.mean(pct_errors)),  # Positive = overestimate
        'r_squared': float(calculate_r_squared(true_values, predicted_values)),
    }

    return metrics

def calculate_r_squared(true_values, predicted_values):
    """Calculate R² coefficient of determination"""
    correlation = np.corrcoef(true_values, predicted_values)[0, 1]
    return correlation ** 2

def equity_gap_analysis(df, metric_column, group_column):
    """
    Calculate equity gaps between demographic groups

    Returns:
        dict with gap analysis between highest and lowest performing groups
    """
    grouped = df.groupby(group_column)[metric_column].agg(['mean', 'std', 'count'])

    if len(grouped) < 2:
        return None

    best_group = grouped['mean'].idxmax()
    worst_group = grouped['mean'].idxmin()

    gap = grouped.loc[best_group, 'mean'] - grouped.loc[worst_group, 'mean']
    gap_pct = (gap / grouped.loc[worst_group, 'mean']) * 100

    # Statistical significance test
    best_data = df[df[group_column] == best_group][metric_column]
    worst_data = df[df[group_column] == worst_group][metric_column]

    t_stat, p_value = stats.ttest_ind(best_data, worst_data)

    return {
        'best_group': str(best_group),
        'worst_group': str(worst_group),
        'best_group_mean': float(grouped.loc[best_group, 'mean']),
        'worst_group_mean': float(grouped.loc[worst_group, 'mean']),
        'gap': float(gap),
        'gap_pct': float(gap_pct),
        'statistically_significant': bool(p_value < 0.05),
        'p_value': float(p_value),
    }

def disparate_impact_ratio(favorable_outcome_rate_protected, favorable_outcome_rate_reference):
    """
    Calculate disparate impact ratio (80% rule)

    Ratio < 0.8 indicates potential discrimination
    """
    if favorable_outcome_rate_reference == 0:
        return None

    ratio = favorable_outcome_rate_protected / favorable_outcome_rate_reference

    return {
        'ratio': float(ratio),
        'passes_80_percent_rule': bool(ratio >= 0.8),
        'protected_rate': float(favorable_outcome_rate_protected),
        'reference_rate': float(favorable_outcome_rate_reference),
    }

def calculate_gini_coefficient(values):
    """
    Calculate Gini coefficient (0=perfect equality, 1=perfect inequality)
    """
    values = np.array(values)
    values = values[~np.isnan(values)]

    if len(values) == 0:
        return None

    values = np.sort(values)
    n = len(values)
    index = np.arange(1, n + 1)

    gini = (2 * np.sum(index * values)) / (n * np.sum(values)) - (n + 1) / n

    return float(gini)

def demographic_stratified_analysis(df, metric_column, income_column='median_income',
                                    minority_column='pct_minority'):
    """
    Perform stratified analysis by income and race

    Returns summary statistics for each demographic segment
    """
    df = calculate_income_quintiles(df, income_column)
    df = calculate_minority_category(df, minority_column)

    results = {
        'by_income_quintile': {},
        'by_minority_category': {},
        'overall': {}
    }

    # By income quintile
    for quintile in [1, 2, 3, 4, 5]:
        subset = df[df['income_quintile'] == quintile]
        if len(subset) > 0:
            results['by_income_quintile'][f'Q{quintile}'] = {
                'mean': float(subset[metric_column].mean()),
                'std': float(subset[metric_column].std()),
                'count': int(len(subset)),
                'median': float(subset[metric_column].median()),
            }

    # By minority category
    for category in ['Low (<30%)', 'Medium (30-60%)', 'High (>60%)']:
        subset = df[df['minority_category'] == category]
        if len(subset) > 0:
            results['by_minority_category'][category] = {
                'mean': float(subset[metric_column].mean()),
                'std': float(subset[metric_column].std()),
                'count': int(len(subset)),
                'median': float(subset[metric_column].median()),
            }

    # Overall
    results['overall'] = {
        'mean': float(df[metric_column].mean()),
        'std': float(df[metric_column].std()),
        'count': int(len(df)),
        'median': float(df[metric_column].median()),
    }

    # Calculate equity gaps
    income_gap = equity_gap_analysis(df, metric_column, 'income_quintile')
    minority_gap = equity_gap_analysis(df, metric_column, 'minority_category')

    results['equity_gaps'] = {
        'income': income_gap,
        'minority': minority_gap,
    }

    return results
