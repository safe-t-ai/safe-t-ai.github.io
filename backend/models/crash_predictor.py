"""
Test 2: Crash Prediction Bias Auditor

Evaluates whether AI crash prediction models accurately predict actual danger
or simply reflect enforcement/reporting bias.
"""

import numpy as np
import pandas as pd
import geopandas as gpd
from typing import Dict
from pathlib import Path
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support, mean_absolute_error
from sklearn.linear_model import Ridge
from config import CRASH_ANALYSIS_YEARS, CRASH_TRAINING_YEARS, CRASH_TEST_YEARS


class CrashPredictionAuditor:
    """
    Audits AI crash prediction models for demographic bias.

    The core issue: AI models trained on police-reported crash data inherit
    enforcement bias, learning to predict where crashes are *reported* rather
    than where they actually *occur*.
    """

    def __init__(self, census_gdf: gpd.GeoDataFrame):
        """
        Initialize auditor with census tract data.

        Args:
            census_gdf: GeoDataFrame with census tracts and demographics
        """
        self.census_gdf = census_gdf.copy()
        self.years = CRASH_ANALYSIS_YEARS
        self.ai_model = None

    def load_real_crash_data(self, crash_csv_path: Path) -> pd.DataFrame:
        """
        Load real NCDOT crash data and geocode to census tracts.

        Args:
            crash_csv_path: Path to ncdot_crashes_durham.csv

        Returns:
            DataFrame with crashes aggregated by tract and year
        """
        print("Loading NCDOT crash data...")

        # Load crash data
        crash_df = pd.read_csv(crash_csv_path)
        crash_df['crash_date'] = pd.to_datetime(crash_df['crash_date'])

        print(f"Loaded {len(crash_df)} crash records")

        # Create Point geometries for crashes
        crash_gdf = gpd.GeoDataFrame(
            crash_df,
            geometry=gpd.points_from_xy(crash_df['longitude'], crash_df['latitude']),
            crs='EPSG:4326'
        )

        # Ensure census GDF has same CRS
        if self.census_gdf.crs != crash_gdf.crs:
            self.census_gdf = self.census_gdf.to_crs(crash_gdf.crs)

        print("Geocoding crashes to census tracts...")

        # Spatial join: assign each crash to a census tract
        crashes_with_tracts = gpd.sjoin(
            crash_gdf,
            self.census_gdf[['tract_id', 'geometry', 'median_income', 'pct_minority', 'total_population']],
            how='inner',
            predicate='within'
        )

        print(f"Successfully geocoded {len(crashes_with_tracts)} crashes ({len(crashes_with_tracts)/len(crash_gdf)*100:.1f}%)")

        # Aggregate crashes by tract and year
        crash_counts = crashes_with_tracts.groupby(['tract_id', 'year']).size().reset_index(name='crash_count')

        # Create full grid: all tracts × all years
        all_tracts = self.census_gdf['tract_id'].unique()
        all_years = sorted(crashes_with_tracts['year'].unique())

        full_grid = pd.MultiIndex.from_product(
            [all_tracts, all_years],
            names=['tract_id', 'year']
        ).to_frame(index=False)

        # Merge with crash counts (filling missing with 0)
        crash_by_tract = full_grid.merge(crash_counts, on=['tract_id', 'year'], how='left')
        crash_by_tract['crash_count'] = crash_by_tract['crash_count'].fillna(0).astype(int)

        # Join with demographics
        crash_by_tract = crash_by_tract.merge(
            self.census_gdf[['tract_id', 'median_income', 'pct_minority', 'total_population']],
            on='tract_id',
            how='left'
        )

        # Add income quintiles
        crash_by_tract['income_quintile'] = pd.qcut(
            crash_by_tract['median_income'],
            q=5,
            labels=['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)'],
            duplicates='drop'
        )

        print(f"Aggregated to {len(crash_by_tract)} tract-year observations")

        return crash_by_tract

    def train_ai_on_real_data(self, crash_df: pd.DataFrame) -> pd.DataFrame:
        """
        Train AI prediction model on real crash data (2019-2022) and predict 2023.

        Demonstrates that AI models show worse prediction accuracy in low-income areas.

        Args:
            crash_df: DataFrame with crash counts by tract and year

        Returns:
            DataFrame with AI predictions and error metrics by tract
        """
        print("Training AI model on real crash data...")

        train_data = crash_df[crash_df['year'].isin(CRASH_TRAINING_YEARS)].copy()
        test_data = crash_df[crash_df['year'].isin(CRASH_TEST_YEARS)].copy()

        # Calculate historical features (average crashes over training years)
        train_avg = train_data.groupby('tract_id').agg({
            'crash_count': 'mean',
            'median_income': 'first',
            'pct_minority': 'first',
            'total_population': 'first',
            'income_quintile': 'first'
        }).reset_index()

        train_avg.columns = ['tract_id', 'avg_past_crashes', 'median_income', 'pct_minority', 'total_population', 'income_quintile']

        # Prepare features for training
        feature_cols = ['median_income', 'pct_minority', 'total_population', 'avg_past_crashes']

        # Normalize features
        X_train = train_avg[feature_cols].fillna(train_avg[feature_cols].median())
        X_train_norm = (X_train - X_train.mean()) / X_train.std()

        y_train = train_avg['avg_past_crashes']

        # Train Ridge regression model
        self.ai_model = Ridge(alpha=1.0)
        self.ai_model.fit(X_train_norm, y_train)

        print(f"Model trained. Feature coefficients: {dict(zip(feature_cols, self.ai_model.coef_))}")

        # Prepare test data
        test_with_history = test_data.merge(
            train_avg[['tract_id', 'avg_past_crashes']],
            on='tract_id',
            how='left'
        )

        X_test = test_with_history[feature_cols].fillna(train_avg[feature_cols].median())
        X_test_norm = (X_test - X_train.mean()) / X_train.std()

        # Make predictions
        test_with_history['ai_predicted_crashes'] = self.ai_model.predict(X_test_norm)
        test_with_history['ai_predicted_crashes'] = test_with_history['ai_predicted_crashes'].clip(lower=0)

        # Calculate prediction errors
        test_with_history['prediction_error'] = (
            test_with_history['ai_predicted_crashes'] - test_with_history['crash_count']
        )
        test_with_history['prediction_error_abs'] = test_with_history['prediction_error'].abs()
        test_with_history['prediction_error_pct'] = (
            test_with_history['prediction_error'].abs() / (test_with_history['crash_count'] + 1) * 100
        )

        # Calculate MAE by quintile
        mae_by_quintile = test_with_history.groupby('income_quintile', observed=True).agg({
            'prediction_error_abs': 'mean',
            'crash_count': 'mean',
            'ai_predicted_crashes': 'mean'
        }).round(2)

        print("\nPrediction Error (MAE) by Income Quintile:")
        print(mae_by_quintile)

        # Calculate overall metrics
        overall_mae = mean_absolute_error(test_with_history['crash_count'], test_with_history['ai_predicted_crashes'])
        print(f"\nOverall MAE: {overall_mae:.2f}")

        return test_with_history

    def generate_crash_data(self, base_rate: float = 35.0, seed: int = 42) -> pd.DataFrame:
        """
        Generate realistic crash data with income correlation.

        Ground truth: Low-income areas have worse infrastructure → more crashes.

        Args:
            base_rate: Average crashes per tract per year
            seed: Random seed for reproducibility

        Returns:
            DataFrame with actual crashes by tract and year
        """
        np.random.seed(seed)

        # Normalize income for calculations
        min_income = self.census_gdf['median_income'].min()
        max_income = self.census_gdf['median_income'].max()
        self.census_gdf['norm_income'] = (
            (self.census_gdf['median_income'] - min_income) / (max_income - min_income)
        )

        crash_data = []

        for _, tract in self.census_gdf.iterrows():
            norm_income = tract['norm_income']

            # Income multiplier: 1.5x in poorest areas, 0.7x in richest
            income_multiplier = 1.5 - norm_income * 0.8

            for year in self.years:
                # Base crash rate with income correlation
                expected_crashes = base_rate * income_multiplier

                # Add temporal variation (±10%)
                temporal_noise = np.random.normal(1.0, 0.1)
                actual_crashes = max(0, int(expected_crashes * temporal_noise))

                crash_data.append({
                    'tract_id': tract['tract_id'],
                    'year': year,
                    'actual_crashes': actual_crashes,
                    'median_income': tract['median_income'],
                    'norm_income': norm_income,
                    'total_population': tract['total_population'],
                    'pct_minority': tract['pct_minority']
                })

        return pd.DataFrame(crash_data)

    def simulate_reporting_bias(self, crash_data: pd.DataFrame) -> pd.DataFrame:
        """
        Simulate enforcement bias in crash reporting.

        Wealthier areas have better police coverage → higher reporting rates.

        Args:
            crash_data: DataFrame with actual crashes

        Returns:
            DataFrame with reported crashes added
        """
        crash_data = crash_data.copy()

        # Reporting rate: 60% in poorest areas, 90% in richest areas
        reporting_rate = 0.6 + crash_data['norm_income'] * 0.3

        # Reported crashes = actual crashes * reporting rate (with some noise)
        crash_data['reported_crashes'] = (
            crash_data['actual_crashes'] * reporting_rate
        ).apply(lambda x: max(0, int(np.random.normal(x, x * 0.05))))

        crash_data['reporting_rate'] = reporting_rate

        return crash_data

    def simulate_ai_predictions(self, crash_data: pd.DataFrame) -> pd.DataFrame:
        """
        Simulate AI predictions trained on biased reported data.

        AI learns from reported_crashes (biased), not actual_crashes (ground truth).
        Result: Underpredicts danger in low-income areas.

        Args:
            crash_data: DataFrame with actual and reported crashes

        Returns:
            DataFrame with AI predictions added
        """
        crash_data = crash_data.copy()

        # AI model learns from reported crashes (biased training data)
        # Simple approach: AI predicts based on reported crashes with some error

        # Calculate average reported crashes by income quintile
        crash_data['income_quintile'] = pd.qcut(
            crash_data['median_income'],
            q=5,
            labels=['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)']
        )

        quintile_means = crash_data.groupby('income_quintile', observed=True)['reported_crashes'].mean()

        # AI prediction: Learned pattern from reported data + noise
        def predict_crashes(row):
            # Base prediction from learned quintile mean
            base_prediction = quintile_means[row['income_quintile']]

            # AI adjusts based on local reported data (still biased)
            local_adjustment = (row['reported_crashes'] - base_prediction) * 0.6
            prediction = base_prediction + local_adjustment

            # Add prediction noise
            prediction_noise = np.random.normal(0, prediction * 0.1)
            final_prediction = max(0, prediction + prediction_noise)

            return final_prediction

        crash_data['ai_predicted_crashes'] = crash_data.apply(predict_crashes, axis=1)

        return crash_data

    def calculate_confusion_matrices(self, crash_data: pd.DataFrame) -> Dict:
        """
        Calculate confusion matrices by income quintile.

        Classification task: Predict whether tract is "high-crash" (above median).

        Args:
            crash_data: DataFrame with actual and predicted crashes

        Returns:
            Dict with confusion matrices and metrics by quintile
        """
        # Aggregate by tract (average across years)
        tract_aggregated = crash_data.groupby('tract_id').agg({
            'actual_crashes': 'mean',
            'ai_predicted_crashes': 'mean',
            'income_quintile': 'first',
            'median_income': 'first'
        }).reset_index()

        # Define "high-crash" as above median
        median_crashes = tract_aggregated['actual_crashes'].median()
        tract_aggregated['actual_high_crash'] = (
            tract_aggregated['actual_crashes'] > median_crashes
        ).astype(int)
        tract_aggregated['predicted_high_crash'] = (
            tract_aggregated['ai_predicted_crashes'] > median_crashes
        ).astype(int)

        results = {
            'overall': {},
            'by_quintile': {}
        }

        # Overall metrics
        y_true = tract_aggregated['actual_high_crash']
        y_pred = tract_aggregated['predicted_high_crash']

        cm = confusion_matrix(y_true, y_pred)
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_true, y_pred, average='binary', zero_division=0
        )

        results['overall'] = {
            'confusion_matrix': cm.tolist(),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'accuracy': float((cm[0, 0] + cm[1, 1]) / cm.sum())
        }

        # Per-quintile: use within-quintile median as threshold
        # Global median makes classification trivial (all Q1 tracts below, all Q5 above).
        # Per-quintile median tests whether the model ranks tracts correctly within each income level.
        for quintile in ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)']:
            quintile_data = tract_aggregated[
                tract_aggregated['income_quintile'] == quintile
            ]

            if len(quintile_data) < 4:
                continue

            q_median = quintile_data['actual_crashes'].median()
            y_true_q = (quintile_data['actual_crashes'] > q_median).astype(int)
            y_pred_q = (quintile_data['ai_predicted_crashes'] > q_median).astype(int)

            if y_true_q.nunique() < 2:
                continue

            cm_q = confusion_matrix(y_true_q, y_pred_q)
            prec_q, rec_q, f1_q, _ = precision_recall_fscore_support(
                y_true_q, y_pred_q, average='binary', zero_division=0
            )

            results['by_quintile'][quintile] = {
                'confusion_matrix': cm_q.tolist(),
                'precision': float(prec_q),
                'recall': float(rec_q),
                'f1_score': float(f1_q),
                'accuracy': float((cm_q[0, 0] + cm_q[1, 1]) / cm_q.sum()) if cm_q.sum() > 0 else 0,
                'count': int(len(quintile_data))
            }

        return results

    def generate_time_series(self, crash_data: pd.DataFrame) -> Dict:
        """
        Generate time series data showing crashes over time by quintile.

        Args:
            crash_data: DataFrame with crashes by year

        Returns:
            Dict with time series data
        """
        # Aggregate by year and quintile
        time_series = crash_data.groupby(['year', 'income_quintile'], observed=True).agg({
            'actual_crashes': 'sum',
            'reported_crashes': 'sum',
            'ai_predicted_crashes': 'sum'
        }).reset_index()

        # Pivot to wide format
        result = {
            'years': self.years,
            'by_quintile': {}
        }

        for quintile in ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)']:
            quintile_data = time_series[time_series['income_quintile'] == quintile]

            result['by_quintile'][quintile] = {
                'actual_crashes': quintile_data['actual_crashes'].tolist(),
                'reported_crashes': quintile_data['reported_crashes'].tolist(),
                'ai_predicted_crashes': quintile_data['ai_predicted_crashes'].tolist()
            }

        # Overall totals
        overall = time_series.groupby('year').agg({
            'actual_crashes': 'sum',
            'reported_crashes': 'sum',
            'ai_predicted_crashes': 'sum'
        })

        result['overall'] = {
            'actual_crashes': overall['actual_crashes'].tolist(),
            'reported_crashes': overall['reported_crashes'].tolist(),
            'ai_predicted_crashes': overall['ai_predicted_crashes'].tolist()
        }

        return result

    def run_audit(self) -> Dict:
        """
        Run complete crash prediction bias audit.

        Returns:
            Dict with complete audit results
        """
        # Generate data
        crash_data = self.generate_crash_data()
        crash_data = self.simulate_reporting_bias(crash_data)
        crash_data = self.simulate_ai_predictions(crash_data)

        # Calculate metrics
        confusion_matrices = self.calculate_confusion_matrices(crash_data)
        time_series = self.generate_time_series(crash_data)

        # Summary statistics
        summary = {
            'total_actual_crashes': int(crash_data['actual_crashes'].sum()),
            'total_reported_crashes': int(crash_data['reported_crashes'].sum()),
            'total_predicted_crashes': int(crash_data['ai_predicted_crashes'].sum()),
            'overall_reporting_rate': float(
                crash_data['reported_crashes'].sum() / crash_data['actual_crashes'].sum()
            ),
            'years_analyzed': self.years,
            'tracts_analyzed': len(self.census_gdf)
        }

        # Bias metrics by quintile
        quintile_bias = crash_data.groupby('income_quintile', observed=True).agg({
            'actual_crashes': 'mean',
            'reported_crashes': 'mean',
            'ai_predicted_crashes': 'mean',
            'reporting_rate': 'mean'
        }).to_dict('index')

        # Calculate prediction bias (predicted - actual)
        for quintile, metrics in quintile_bias.items():
            metrics['prediction_bias'] = (
                metrics['ai_predicted_crashes'] - metrics['actual_crashes']
            )
            metrics['prediction_bias_pct'] = (
                metrics['prediction_bias'] / metrics['actual_crashes'] * 100
            )

        return {
            'summary': summary,
            'bias_by_quintile': {k: {k2: float(v2) for k2, v2 in v.items()}
                                 for k, v in quintile_bias.items()},
            'confusion_matrices': confusion_matrices,
            'time_series': time_series,
            'crash_data': crash_data  # For further processing
        }
