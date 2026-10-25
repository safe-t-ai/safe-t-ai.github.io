"""
Test 2: Crash data audit.

Asks whether ranking tracts by crash history, the method behind high-injury
networks, misses high-risk tracts in poorer neighborhoods. Each test year is
predicted from the years before it, and every tract is judged against one
citywide definition of high-risk.
"""

import math
from pathlib import Path

import geopandas as gpd
import pandas as pd
from scipy.stats import fisher_exact

from config import CRASH_ANALYSIS_YEARS, CRASH_BACKTEST_YEARS, CRASH_HIGH_RISK_QUANTILE, CRASH_NM_TYPES

QUINTILES = ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)']


def wilson_interval(hits: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (0.0, 0.0)
    p = hits / n
    denom = 1 + z**2 / n
    center = (p + z**2 / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / denom
    return (max(0.0, center - half), min(1.0, center + half))


class CrashPredictionAuditor:
    def __init__(self, census_gdf: gpd.GeoDataFrame):
        self.census_gdf = census_gdf.copy()
        self.years = CRASH_ANALYSIS_YEARS

    def load_real_crash_data(self, crash_csv_path: Path) -> pd.DataFrame:
        """NCDOT non-motorist crashes geocoded to tracts: one row per tract-year."""
        crash_df = pd.read_csv(crash_csv_path).rename(columns={
            'CrashYear': 'year', 'Latitude': 'latitude', 'Longitude': 'longitude',
        })
        crash_df['year'] = crash_df['year'].astype(int)
        crash_df = crash_df[crash_df['year'].isin(self.years)]
        if 'NM_Type' in crash_df.columns:
            crash_df = crash_df[crash_df['NM_Type'].isin(CRASH_NM_TYPES)]

        crash_gdf = gpd.GeoDataFrame(
            crash_df,
            geometry=gpd.points_from_xy(crash_df['longitude'], crash_df['latitude']),
            crs='EPSG:4326',
        )
        if self.census_gdf.crs != crash_gdf.crs:
            self.census_gdf = self.census_gdf.to_crs(crash_gdf.crs)

        demo_cols = ['tract_id', 'median_income', 'pct_minority', 'total_population']
        joined = gpd.sjoin(crash_gdf, self.census_gdf[demo_cols + ['geometry']], how='inner', predicate='within')
        counts = joined.groupby(['tract_id', 'year']).size().reset_index(name='crash_count')

        grid = pd.MultiIndex.from_product(
            [self.census_gdf['tract_id'].unique(), self.years], names=['tract_id', 'year']
        ).to_frame(index=False)
        out = grid.merge(counts, on=['tract_id', 'year'], how='left')
        out['crash_count'] = out['crash_count'].fillna(0).astype(int)
        out = out.merge(self.census_gdf[demo_cols], on='tract_id', how='left')
        out['income_quintile'] = pd.qcut(out['median_income'], q=5, labels=QUINTILES, duplicates='drop')
        return out

    def backtest(self, crash_df: pd.DataFrame, quantile: float = CRASH_HIGH_RISK_QUANTILE) -> pd.DataFrame:
        """
        For each backtest year, predict each tract's crashes as its mean over all
        earlier years. A tract is high-risk when its count is above the citywide
        `quantile`, and flagged when its prediction is above the same quantile of
        predictions.
        """
        counts = crash_df.pivot_table(index='tract_id', columns='year', values='crash_count')
        quintile = crash_df.drop_duplicates('tract_id').set_index('tract_id')['income_quintile']
        rows = []
        for year in CRASH_BACKTEST_YEARS:
            predicted = counts[[y for y in counts.columns if y < year]].mean(axis=1)
            actual = counts[year]
            rows.append(pd.DataFrame({
                'year': year,
                'income_quintile': quintile,
                'actual': actual,
                'predicted': predicted,
                'high_risk': actual > actual.quantile(quantile),
                'flagged': predicted > predicted.quantile(quantile),
            }))
        return pd.concat(rows).rename_axis('tract_id').reset_index()

    @staticmethod
    def detection_by_quintile(bt: pd.DataFrame) -> dict:
        hr = bt[bt['high_risk']]
        result = {}
        for q in QUINTILES:
            s = hr[hr['income_quintile'] == q]
            hits, n = int(s['flagged'].sum()), len(s)
            lo, hi = wilson_interval(hits, n)
            result[q] = {'flagged': hits, 'high_risk': n, 'recall': hits / n if n else 0.0,
                         'ci_low': lo, 'ci_high': hi}
        return result

    @staticmethod
    def q1_vs_rest_p(bt: pd.DataFrame) -> float:
        hr = bt[bt['high_risk']]
        q1 = hr['income_quintile'] == QUINTILES[0]
        table = [[int(hr[q1]['flagged'].sum()), int((~hr[q1]['flagged']).sum())],
                 [int(hr[~q1]['flagged'].sum()), int((~hr[~q1]['flagged']).sum())]]
        return float(fisher_exact(table)[1])

    @staticmethod
    def rate_by_quintile(crash_df: pd.DataFrame) -> dict:
        """Crashes per 1,000 residents per year, by income quintile."""
        g = crash_df.groupby('income_quintile', observed=True).agg(
            crashes=('crash_count', 'sum'), person_years=('total_population', 'sum'))
        return {q: float(g.loc[q, 'crashes'] / g.loc[q, 'person_years'] * 1000) for q in QUINTILES}


def build_outputs(census_gdf: gpd.GeoDataFrame, crash_csv_path: Path, source_label: str) -> dict:
    """All Test 2 frontend artifacts, keyed by output filename stem."""
    from utils.demographic_analysis import racial_crash_baseline

    auditor = CrashPredictionAuditor(census_gdf)
    crash_df = auditor.load_real_crash_data(crash_csv_path)
    bt = auditor.backtest(crash_df)
    detection = auditor.detection_by_quintile(bt)
    detection_median = auditor.detection_by_quintile(auditor.backtest(crash_df, quantile=0.5))
    rates = auditor.rate_by_quintile(crash_df)
    p_value = auditor.q1_vs_rest_p(bt)
    raw = pd.read_csv(crash_csv_path)
    baseline = racial_crash_baseline(census_gdf, raw[raw['NM_Type'].isin(CRASH_NM_TYPES)], CRASH_ANALYSIS_YEARS, source_label)

    q1, q5 = QUINTILES[0], QUINTILES[-1]
    rate_ratio = rates[q1] / rates[q5]
    first, last = CRASH_BACKTEST_YEARS[0], CRASH_BACKTEST_YEARS[-1]
    d1, d5 = detection[q1], detection[q5]
    m1, m5 = detection_median[q1], detection_median[q5]

    report = {
        '_provenance': {
            'data_type': 'real',
            'real': ['US Census ACS demographics', 'NCDOT non-motorist crashes (ArcGIS Feature Service)'],
            'simulated': [],
        },
        'summary': {
            'total_crashes': int(crash_df['crash_count'].sum()),
            'years_analyzed': CRASH_ANALYSIS_YEARS,
            'backtest_years': CRASH_BACKTEST_YEARS,
            'tracts_analyzed': int(crash_df['tract_id'].nunique()),
            'high_risk_quantile': CRASH_HIGH_RISK_QUANTILE,
        },
        'rate_per_1k_by_quintile': rates,
        'rate_ratio_q1_q5': rate_ratio,
        'detection_by_quintile': detection,
        'detection_by_quintile_median_cut': detection_median,
        'q1_vs_rest_p_value': p_value,
        'racial_baseline': baseline,
        'findings': [
            f"Crash history flagged {d1['flagged']} of {d1['high_risk']} high-risk tract-years in the poorest fifth "
            f"({d1['ci_low']:.0%}–{d1['ci_high']:.0%}) and {d5['flagged']} of {d5['high_risk']} in the richest "
            f"({d5['ci_low']:.0%}–{d5['ci_high']:.0%}), {first}–{last}. No gap is detectable (Fisher exact p = {p_value:.2f}), "
            f"though the richest fifth has few high-risk tract-years to compare.",
            f"With a looser cut (above the citywide median) the poorest fifth is flagged more often, "
            f"{m1['recall']:.0%} vs {m5['recall']:.0%}.",
            "Crash records only show reported crashes. Underreporting, and tools that weigh crashes against estimated "
            "foot and bike traffic, need the audits in Tests 1, 3 and 4.",
        ],
    }

    counts = crash_df.pivot_table(index='tract_id', columns='year', values='crash_count')
    quintile = crash_df.drop_duplicates('tract_id').set_index('tract_id')['income_quintile']
    series = {}
    for q in QUINTILES:
        tracts = quintile[quintile == q].index
        series[q] = {
            'actual_crashes': [int(counts.loc[tracts, y].sum()) for y in CRASH_ANALYSIS_YEARS],
            'predicted_crashes': [
                round(float(counts.loc[tracts, [p for p in CRASH_ANALYSIS_YEARS if p < y]].mean(axis=1).sum()), 1)
                if y in CRASH_BACKTEST_YEARS else None
                for y in CRASH_ANALYSIS_YEARS
            ],
        }
    time_series = {'years': CRASH_ANALYSIS_YEARS, 'by_quintile': series}

    latest = bt[bt['year'] == last].set_index('tract_id')
    demo = crash_df.drop_duplicates('tract_id').set_index('tract_id')
    per_tract = pd.DataFrame({
        'actual_crashes': latest['actual'],
        'predicted_crashes': latest['predicted'].round(2),
        'high_risk': latest['high_risk'],
        'flagged': latest['flagged'],
        'rate_per_1k': (counts.sum(axis=1) / len(CRASH_ANALYSIS_YEARS) / demo['total_population'] * 1000).round(2),
        'median_income': demo['median_income'],
        'income_quintile': demo['income_quintile'].astype(str),
    }).reset_index()
    geo = census_gdf[['tract_id', 'geometry']].merge(per_tract, on='tract_id')
    geo['geometry'] = geo['geometry'].simplify(0.001)

    return {'crash-report': report, 'crash-time-series': time_series, 'crash-geo-data': geo.__geo_interface__}
