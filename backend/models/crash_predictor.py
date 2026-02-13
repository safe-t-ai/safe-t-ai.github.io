"""
Test 2: Crash Prediction Bias Auditor

Evaluates whether AI crash prediction models accurately predict actual danger
or simply reflect enforcement/reporting bias.
"""

import pandas as pd
import geopandas as gpd
from pathlib import Path
from sklearn.metrics import mean_absolute_error
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
        Load real NCDOT non-motorist crash data and geocode to census tracts.

        Args:
            crash_csv_path: Path to ncdot_nonmotorist_durham.csv

        Returns:
            DataFrame with crashes aggregated by tract and year
        """
        print("Loading NCDOT non-motorist crash data...")

        # Load crash data (ArcGIS column names)
        crash_df = pd.read_csv(crash_csv_path)
        crash_df = crash_df.rename(columns={
            'CrashDate': 'crash_date',
            'CrashYear': 'year',
            'Latitude': 'latitude',
            'Longitude': 'longitude',
        })
        crash_df['crash_date'] = pd.to_datetime(crash_df['crash_date'])
        crash_df['year'] = crash_df['year'].astype(int)

        # Filter to analysis window (real data spans 2007-2024)
        crash_df = crash_df[crash_df['year'].isin(self.years)]

        print(f"Loaded {len(crash_df)} crash records ({min(self.years)}-{max(self.years)})")

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
        Train AI prediction model on real crash data and predict the test year(s).

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
