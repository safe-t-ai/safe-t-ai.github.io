"""
Test 1: Volume Estimation Equity Audit

Analyzes bias in AI volume estimation tools (Strava Metro, StreetLight Data)
by comparing predictions against ground truth counter data, stratified by demographics.
"""

import pandas as pd
import geopandas as gpd

from utils.demographic_analysis import (
    calculate_income_quintiles,
    calculate_minority_category,
    calculate_error_metrics,
    equity_gap_analysis
)

class VolumeEstimationAuditor:
    """
    Audits AI volume estimation tools for demographic bias
    """

    def __init__(self, census_gdf, ground_truth_df, ai_predictions_df):
        self.census_gdf = census_gdf
        self.ground_truth_df = ground_truth_df
        self.ai_predictions_df = ai_predictions_df

        # Enrich data with demographics
        self._enrich_predictions()

    def _enrich_predictions(self):
        """Add demographic data to predictions"""

        # Ensure tract_id is string in both dataframes
        self.ai_predictions_df['tract_id'] = self.ai_predictions_df['tract_id'].astype(str)
        self.census_gdf['tract_id'] = self.census_gdf['tract_id'].astype(str)

        # Check which columns we need to merge (avoid duplicates)
        needed_cols = ['tract_id']
        optional_cols = ['median_income', 'pct_minority', 'total_population', 'pct_white', 'pct_black']

        for col in optional_cols:
            if col not in self.ai_predictions_df.columns and col in self.census_gdf.columns:
                needed_cols.append(col)

        # Only merge if we have columns to add
        if len(needed_cols) > 1:
            self.ai_predictions_df = self.ai_predictions_df.merge(
                self.census_gdf[needed_cols],
                on='tract_id',
                how='left'
            )

        # Calculate quintiles and categories (only if we have the data)
        if 'median_income' in self.ai_predictions_df.columns:
            self.ai_predictions_df = calculate_income_quintiles(self.ai_predictions_df)
        if 'pct_minority' in self.ai_predictions_df.columns:
            self.ai_predictions_df = calculate_minority_category(self.ai_predictions_df)

    def analyze_overall_accuracy(self):
        """Calculate overall prediction accuracy metrics"""

        metrics = calculate_error_metrics(
            self.ai_predictions_df['true_volume'],
            self.ai_predictions_df['predicted_volume']
        )

        return {
            'metrics': metrics,
            'total_counters': len(self.ai_predictions_df),
            'total_true_volume': int(self.ai_predictions_df['true_volume'].sum()),
            'total_predicted_volume': int(self.ai_predictions_df['predicted_volume'].sum()),
        }

    def analyze_by_income(self):
        """Analyze prediction accuracy by income quintile"""

        results = []

        for quintile in [1, 2, 3, 4, 5]:
            subset = self.ai_predictions_df[
                self.ai_predictions_df['income_quintile'] == quintile
            ]

            if len(subset) == 0:
                continue

            metrics = calculate_error_metrics(
                subset['true_volume'],
                subset['predicted_volume']
            )

            median_income = subset['median_income'].median()

            results.append({
                'quintile': quintile,
                'label': f'Q{quintile}',
                'count': len(subset),
                'median_income': float(median_income),
                'mae': metrics['mae'],
                'mape': metrics['mape'],
                'bias': metrics['bias'],
                'mean_error_pct': metrics['mean_pct_error'],
            })

        gap = equity_gap_analysis(
            self.ai_predictions_df,
            'error_pct',
            'income_quintile'
        )

        return {
            'by_quintile': results,
            'equity_gap': gap,
        }

    def analyze_by_race(self):
        """Analyze prediction accuracy by racial composition"""

        results = []

        for category in ['Low (<30%)', 'Medium (30-60%)', 'High (>60%)']:
            subset = self.ai_predictions_df[
                self.ai_predictions_df['minority_category'] == category
            ]

            if len(subset) == 0:
                continue

            metrics = calculate_error_metrics(
                subset['true_volume'],
                subset['predicted_volume']
            )

            results.append({
                'category': category,
                'count': len(subset),
                'mean_minority_pct': float(subset['pct_minority'].mean()),
                'mae': metrics['mae'],
                'mape': metrics['mape'],
                'bias': metrics['bias'],
                'mean_error_pct': metrics['mean_pct_error'],
            })

        gap = equity_gap_analysis(
            self.ai_predictions_df,
            'error_pct',
            'minority_category'
        )

        return {
            'by_category': results,
            'equity_gap': gap,
        }

    def get_scatter_data(self):
        """Get data for predicted vs actual scatter plot"""

        data = []

        for _, row in self.ai_predictions_df.iterrows():
            data.append({
                'true_volume': int(row['true_volume']),
                'predicted_volume': int(row['predicted_volume']),
                'counter_id': row['counter_id'],
                'income_quintile': int(row['income_quintile']),
                'minority_category': row['minority_category'],
                'median_income': float(row['median_income']),
                'pct_minority': float(row['pct_minority']),
            })

        return data

    def get_tract_level_errors(self):
        """
        Calculate average error by census tract for choropleth map

        For tracts with multiple counters, average the errors
        """

        tract_errors = self.ai_predictions_df.groupby('tract_id').agg({
            'error_pct': 'mean',
            'error': 'mean',
            'predicted_volume': 'sum',
            'true_volume': 'sum',
        }).reset_index()

        # Merge with census geometries
        result_gdf = self.census_gdf.merge(
            tract_errors,
            on='tract_id',
            how='left'
        )

        # Fill NaN (tracts without counters)
        result_gdf['error_pct'] = result_gdf['error_pct'].fillna(0)

        return result_gdf

    def generate_full_report(self):
        """Generate complete audit report with all visualizations"""

        report = {
            'overall_accuracy': self.analyze_overall_accuracy(),
            'by_income': self.analyze_by_income(),
            'by_race': self.analyze_by_race(),
            'scatter_data': self.get_scatter_data(),
        }

        # Add interpretation
        income_bias = report['by_income']['equity_gap']
        race_bias = report['by_race']['equity_gap']

        interpretation = []

        if income_bias and income_bias['gap_pct'] > 20:
            interpretation.append(
                f"⚠️ Significant income bias detected: "
                f"{income_bias['worst_group']} areas undercounted by "
                f"{abs(income_bias['worst_group_mean']):.1f}% on average, "
                f"while {income_bias['best_group']} areas overcounted by "
                f"{income_bias['best_group_mean']:.1f}%"
            )

        if race_bias and race_bias['gap_pct'] > 15:
            interpretation.append(
                f"⚠️ Significant racial bias detected: "
                f"{race_bias['worst_group']} areas have "
                f"{abs(race_bias['gap_pct']):.1f}% worse accuracy"
            )

        report['interpretation'] = interpretation

        return report

def load_test1_data(raw_data_dir, simulated_data_dir):
    """Helper function to load all Test 1 data"""

    census_gdf = gpd.read_file(raw_data_dir / 'durham_census_tracts.geojson')

    ground_truth_df = pd.read_json(
        simulated_data_dir / 'ground_truth_counters.json'
    )

    ai_predictions_df = pd.read_json(
        simulated_data_dir / 'ai_volume_predictions.json'
    )

    return census_gdf, ground_truth_df, ai_predictions_df
