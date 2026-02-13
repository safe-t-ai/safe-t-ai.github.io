"""
Tests for crash prediction auditor model.
"""

import pandas as pd
from config import CRASH_ANALYSIS_YEARS
from models.crash_predictor import CrashPredictionAuditor


def test_crash_predictor_initialization(sample_census_gdf):
    """Test crash predictor initialization."""
    auditor = CrashPredictionAuditor(sample_census_gdf)

    assert auditor.census_gdf is not None
    assert len(auditor.years) == len(CRASH_ANALYSIS_YEARS)
    assert max(CRASH_ANALYSIS_YEARS) in auditor.years


def test_load_real_crash_data(sample_census_gdf, tmp_path):
    """Test loading and geocoding real crash data from CSV."""
    auditor = CrashPredictionAuditor(sample_census_gdf)

    # Create a minimal CSV matching ArcGIS column names
    crash_csv = tmp_path / "crashes.csv"
    crash_csv.write_text(
        "CrashDate,CrashYear,Latitude,Longitude\n"
        "2023-03-15,2023,0.5,0.5\n"
        "2023-06-20,2023,1.5,0.5\n"
        "2022-01-10,2022,0.5,0.5\n"
        "2021-08-05,2021,2.5,0.5\n"
        "2020-12-01,2020,3.5,0.5\n"
        "2019-04-22,2019,4.5,0.5\n"
    )

    crash_by_tract = auditor.load_real_crash_data(crash_csv)

    assert 'crash_count' in crash_by_tract.columns
    assert 'income_quintile' in crash_by_tract.columns
    assert 'tract_id' in crash_by_tract.columns
    assert crash_by_tract['crash_count'].min() >= 0


def test_train_ai_on_real_data(sample_census_gdf, tmp_path):
    """Test AI model training on real crash data and prediction evaluation."""
    auditor = CrashPredictionAuditor(sample_census_gdf)

    # Create crash data spanning training and test years
    rows = []
    for year in CRASH_ANALYSIS_YEARS:
        for lat, lon in [(0.5, 0.5), (1.5, 0.5), (2.5, 0.5), (3.5, 0.5), (4.5, 0.5)]:
            rows.append(f"{year}-06-15,{year},{lat},{lon}")

    crash_csv = tmp_path / "crashes.csv"
    crash_csv.write_text(
        "CrashDate,CrashYear,Latitude,Longitude\n" + "\n".join(rows) + "\n"
    )

    crash_df = auditor.load_real_crash_data(crash_csv)
    predictions = auditor.train_ai_on_real_data(crash_df)

    assert 'ai_predicted_crashes' in predictions.columns
    assert 'prediction_error' in predictions.columns
    assert 'prediction_error_abs' in predictions.columns
    assert 'prediction_error_pct' in predictions.columns
    assert predictions['ai_predicted_crashes'].min() >= 0
    assert auditor.ai_model is not None
