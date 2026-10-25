"""
Tests for crash prediction auditor model.
"""

from config import CRASH_ANALYSIS_YEARS, CRASH_BACKTEST_YEARS
from models.crash_predictor import CrashPredictionAuditor, wilson_interval


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


def _crash_csv(tmp_path, per_tract_counts):
    """per_tract_counts: {(lat, lon): count per year}"""
    rows = []
    for year in CRASH_ANALYSIS_YEARS:
        for (lat, lon), n in per_tract_counts.items():
            rows += [f"{year}-06-15,{year},{lat},{lon}"] * n
    path = tmp_path / "crashes.csv"
    path.write_text("CrashDate,CrashYear,Latitude,Longitude\n" + "\n".join(rows) + "\n")
    return path


def test_backtest_uses_only_earlier_years(sample_census_gdf, tmp_path):
    auditor = CrashPredictionAuditor(sample_census_gdf)
    crash_df = auditor.load_real_crash_data(_crash_csv(tmp_path, {(0.5, 0.5): 4, (1.5, 0.5): 1}))
    bt = auditor.backtest(crash_df)

    assert sorted(bt['year'].unique()) == CRASH_BACKTEST_YEARS
    # Constant history: prediction equals the yearly count
    assert (bt[bt['tract_id'] == '001']['predicted'] == 4).all()


def test_high_risk_uses_one_citywide_threshold(sample_census_gdf, tmp_path):
    auditor = CrashPredictionAuditor(sample_census_gdf)
    crash_df = auditor.load_real_crash_data(_crash_csv(tmp_path, {(0.5, 0.5): 5, (1.5, 0.5): 1}))
    bt = auditor.backtest(crash_df)

    # Only the busiest tract clears the citywide cut, whatever its quintile
    assert set(bt[bt['high_risk']]['tract_id']) == {'001'}
    detection = auditor.detection_by_quintile(bt)
    assert detection['Q1 (Poorest)']['flagged'] == detection['Q1 (Poorest)']['high_risk'] == len(CRASH_BACKTEST_YEARS)


def test_wilson_interval_bounds():
    lo, hi = wilson_interval(2, 7)
    assert 0 < lo < 2 / 7 < hi < 1
    assert wilson_interval(0, 0) == (0.0, 0.0)
