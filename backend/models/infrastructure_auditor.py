"""
Infrastructure Recommendation Equity Auditor

Tests whether AI infrastructure recommendation systems allocate resources
equitably across demographic groups, or favor wealthy neighborhoods with
vocal advocacy over high-danger corridors in underserved communities.
"""

import numpy as np
import pandas as pd
import geopandas as gpd
from typing import Dict, List
from config import (
    INFRASTRUCTURE_PROJECT_TYPES, INFRASTRUCTURE_DEFAULT_BUDGET, INFRASTRUCTURE_AI_INCOME_WEIGHT,
    DEFAULT_RANDOM_SEED, QUINTILE_LABELS,
)
from utils.demographic_analysis import calculate_gini_coefficient


class InfrastructureRecommendationAuditor:
    """Audit AI infrastructure recommendations for demographic bias."""

    PROJECT_TYPES = INFRASTRUCTURE_PROJECT_TYPES

    def __init__(self, census_gdf: gpd.GeoDataFrame, infrastructure_df: pd.DataFrame = None,
                 total_budget: float = INFRASTRUCTURE_DEFAULT_BUDGET):
        """
        Initialize auditor with census data and OSM infrastructure scores.

        Args:
            census_gdf: GeoDataFrame with census tracts and demographics
            infrastructure_df: DataFrame with per-tract OSM infrastructure densities
            total_budget: Total infrastructure budget to allocate ($)
        """
        if infrastructure_df is None:
            raise ValueError(
                "infrastructure_df is required. Run notebooks/01_fetch_data.ipynb first."
            )
        self.census_gdf = census_gdf.copy()
        self.infrastructure_df = infrastructure_df
        self.total_budget = total_budget
        self.danger_scores = None
        self.ai_recommendations = None
        self.need_based_recommendations = None

    def load_danger_scores(self, crash_csv_path) -> pd.DataFrame:
        """Danger score: real NCDOT pedestrian and cyclist crashes per 1,000 residents per year."""
        from models.crash_predictor import CrashPredictionAuditor

        crash_df = CrashPredictionAuditor(self.census_gdf).load_real_crash_data(crash_csv_path)
        per_tract = crash_df.groupby('tract_id').agg(
            annual_crashes=('crash_count', 'mean'),
            population=('total_population', 'first'),
            median_income=('median_income', 'first'),
        ).reset_index()
        per_tract['danger_score'] = (per_tract['annual_crashes'] / per_tract['population'] * 1_000).round(3)
        per_tract['annual_crashes'] = per_tract['annual_crashes'].round(1)
        self.danger_scores = per_tract
        return self.danger_scores

    # Map OSM density columns to project types
    DENSITY_TO_PROJECT = {
        'crossings_density': 'crosswalk',
        'bike_infra_density': 'bike_lane',
        'traffic_signals_density': 'traffic_signal',
        'speed_calming_density': 'speed_reduction',
    }

    def _select_project_type_for_gap(self, tract_id: str) -> str:
        """Pick the project type addressing the tract's biggest infrastructure gap."""
        row = self.infrastructure_df[self.infrastructure_df['tract_id'] == tract_id]
        if row.empty:
            return 'crosswalk'

        row = row.iloc[0]
        weakest = min(self.DENSITY_TO_PROJECT, key=lambda col: row.get(col, 0))
        return self.DENSITY_TO_PROJECT[weakest]

    def _merge_danger_data(self, seed: int) -> pd.DataFrame:
        if self.danger_scores is None:
            raise ValueError("Call load_danger_scores() first.")
        danger_subset = self.danger_scores[['tract_id', 'danger_score', 'annual_crashes']]
        return self.census_gdf.merge(danger_subset, on='tract_id')

    def simulate_ai_recommendations(self, bias_strength: float = INFRASTRUCTURE_AI_INCOME_WEIGHT, seed: int = DEFAULT_RANDOM_SEED) -> pd.DataFrame:
        """
        Simulate biased AI infrastructure recommendations.

        Bias: Favors high-income areas (proxy for vocal advocacy) over actual danger.

        Args:
            bias_strength: How much to favor income over danger (0=pure danger, 1=pure income)
            seed: Random seed

        Returns:
            DataFrame with AI recommendations by tract
        """
        np.random.seed(seed)
        data = self._merge_danger_data(seed)

        danger_norm = (data['danger_score'] - data['danger_score'].min()) / (data['danger_score'].max() - data['danger_score'].min())
        income_norm = (data['median_income'] - data['median_income'].min()) / (data['median_income'].max() - data['median_income'].min())

        # AI priority score: Weighted combination favoring wealth over danger
        # High bias_strength = favor income, low = favor danger
        data['ai_priority'] = (1 - bias_strength) * danger_norm + bias_strength * income_norm

        # Add random "advocacy score" (wealthy areas have higher advocacy)
        advocacy_boost = income_norm * np.random.uniform(0.8, 1.2, len(data))
        data['ai_priority'] = data['ai_priority'] * (1 + advocacy_boost * 0.3)

        data = data.sort_values('ai_priority', ascending=False).reset_index(drop=True)
        recommendations = []
        remaining_budget = self.total_budget

        for idx, tract in data.iterrows():
            if remaining_budget <= 0:
                break

            # Project type based on actual infrastructure gap
            project_type = self._select_project_type_for_gap(tract['tract_id'])

            project_cost = self.PROJECT_TYPES[project_type]['cost']

            if project_cost <= remaining_budget:
                recommendations.append({
                    'tract_id': tract['tract_id'],
                    'project_type': project_type,
                    'cost': project_cost,
                    'safety_impact': self.PROJECT_TYPES[project_type]['safety_impact'],
                    'ai_priority': round(tract['ai_priority'], 3),
                    'danger_score': tract['danger_score'],
                    'median_income': tract['median_income'],
                    'population': tract['total_population']
                })
                remaining_budget -= project_cost

        self.ai_recommendations = pd.DataFrame(recommendations)
        return self.ai_recommendations

    def simulate_need_based_recommendations(self, seed: int = DEFAULT_RANDOM_SEED) -> pd.DataFrame:
        """
        Simulate need-based (equitable) infrastructure recommendations.

        Allocates based purely on danger scores (actual need).

        Returns:
            DataFrame with need-based recommendations by tract
        """
        np.random.seed(seed)
        data = self._merge_danger_data(seed)

        data = data.sort_values('danger_score', ascending=False).reset_index(drop=True)
        recommendations = []
        remaining_budget = self.total_budget

        for idx, tract in data.iterrows():
            if remaining_budget <= 0:
                break

            # Project type based on actual infrastructure gap
            project_type = self._select_project_type_for_gap(tract['tract_id'])

            project_cost = self.PROJECT_TYPES[project_type]['cost']

            if project_cost <= remaining_budget:
                recommendations.append({
                    'tract_id': tract['tract_id'],
                    'project_type': project_type,
                    'cost': project_cost,
                    'safety_impact': self.PROJECT_TYPES[project_type]['safety_impact'],
                    'danger_score': tract['danger_score'],
                    'median_income': tract['median_income'],
                    'population': tract['total_population']
                })
                remaining_budget -= project_cost

        self.need_based_recommendations = pd.DataFrame(recommendations)
        return self.need_based_recommendations

    def calculate_equity_metrics(self) -> Dict:
        """
        Calculate equity metrics comparing AI vs need-based allocation.

        Returns:
            Dict with equity metrics
        """
        if self.ai_recommendations is None or self.need_based_recommendations is None:
            raise ValueError("Must simulate recommendations first")

        self.census_gdf['income_quintile'] = pd.qcut(
            self.census_gdf['median_income'],
            q=5,
            labels=QUINTILE_LABELS
        )

        ai_with_quintiles = self.ai_recommendations.merge(
            self.census_gdf[['tract_id', 'income_quintile']],
            on='tract_id'
        )
        need_with_quintiles = self.need_based_recommendations.merge(
            self.census_gdf[['tract_id', 'income_quintile']],
            on='tract_id'
        )

        ai_by_quintile = ai_with_quintiles.groupby('income_quintile')['cost'].sum()
        need_by_quintile = need_with_quintiles.groupby('income_quintile')['cost'].sum()

        pop_by_quintile = self.census_gdf.groupby('income_quintile')['total_population'].sum()
        ai_per_capita = ai_by_quintile / pop_by_quintile
        need_per_capita = need_by_quintile / pop_by_quintile

        ai_disparate_impact = ai_per_capita[QUINTILE_LABELS[0]] / ai_per_capita[QUINTILE_LABELS[-1]]
        need_disparate_impact = need_per_capita[QUINTILE_LABELS[0]] / need_per_capita[QUINTILE_LABELS[-1]]

        # Gini over per-tract total allocation (tracts receiving no projects count as 0)
        all_tract_ids = self.census_gdf['tract_id']
        ai_by_tract = self.ai_recommendations.groupby('tract_id')['cost'].sum()
        need_by_tract = self.need_based_recommendations.groupby('tract_id')['cost'].sum()
        ai_per_tract = all_tract_ids.map(ai_by_tract).fillna(0).values
        need_per_tract = all_tract_ids.map(need_by_tract).fillna(0).values
        ai_gini = calculate_gini_coefficient(ai_per_tract)
        need_gini = calculate_gini_coefficient(need_per_tract)

        return {
            'ai_allocation': {
                'by_quintile': ai_by_quintile.to_dict(),
                'per_capita': ai_per_capita.to_dict(),
                'disparate_impact_ratio': float(ai_disparate_impact),
                'gini_coefficient': float(ai_gini)
            },
            'need_based_allocation': {
                'by_quintile': need_by_quintile.to_dict(),
                'per_capita': need_per_capita.to_dict(),
                'disparate_impact_ratio': float(need_disparate_impact),
                'gini_coefficient': float(need_gini)
            },
            'comparison': {
                'equity_gap': float(need_disparate_impact - ai_disparate_impact),
                'gini_improvement': float(need_gini - ai_gini)
            }
        }

    def generate_report(self) -> Dict:
        """
        Generate complete audit report.

        Returns:
            Dict with full audit results
        """
        if self.ai_recommendations is None:
            self.simulate_ai_recommendations()
        if self.need_based_recommendations is None:
            self.simulate_need_based_recommendations()

        equity_metrics = self.calculate_equity_metrics()

        return {
            'summary': {
                'total_budget': self.total_budget,
                'ai_projects': len(self.ai_recommendations),
                'need_based_projects': len(self.need_based_recommendations),
                'budget_allocated_ai': float(self.ai_recommendations['cost'].sum()),
                'budget_allocated_need': float(self.need_based_recommendations['cost'].sum())
            },
            'danger_scores': self.danger_scores.to_dict(orient='records'),
            'ai_recommendations': self.ai_recommendations.to_dict(orient='records'),
            'need_based_recommendations': self.need_based_recommendations.to_dict(orient='records'),
            'equity_metrics': equity_metrics,
            'findings': self._generate_findings(equity_metrics)
        }

    def _generate_findings(self, equity_metrics: Dict) -> List[str]:
        """Generate narrative findings from metrics."""
        findings = []

        ai_ratio = equity_metrics['ai_allocation']['disparate_impact_ratio']
        need_ratio = equity_metrics['need_based_allocation']['disparate_impact_ratio']

        if ai_ratio < 0.8:
            findings.append(
                f"AI allocation shows severe inequity: poorest quintile receives "
                f"{ai_ratio:.1%} as much per capita as richest quintile"
            )

        if ai_ratio < need_ratio:
            gap = (need_ratio - ai_ratio) / need_ratio
            findings.append(
                f"AI allocation is {gap:.0%} less equitable than need-based allocation"
            )

        ai_q1_pct = equity_metrics['ai_allocation']['by_quintile'][QUINTILE_LABELS[0]] / self.total_budget
        if ai_q1_pct < 0.15:
            findings.append(
                f"Poorest quintile receives only {ai_q1_pct:.1%} of total budget despite "
                f"having highest crash rates"
            )

        return findings
