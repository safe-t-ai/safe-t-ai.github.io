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
    INFRASTRUCTURE_PROJECT_TYPES, INFRASTRUCTURE_DEFAULT_BUDGET,
    DANGER_SCORE_CONFIG, DEFAULT_RANDOM_SEED, QUINTILE_LABELS,
)


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
                "infrastructure_df is required. Run fetch_osm_infrastructure.py first."
            )
        self.census_gdf = census_gdf.copy()
        self.infrastructure_df = infrastructure_df
        self.total_budget = total_budget
        self.danger_scores = None
        self.ai_recommendations = None
        self.need_based_recommendations = None

    def simulate_danger_scores(self, seed: int = DEFAULT_RANDOM_SEED) -> pd.DataFrame:
        """
        Simulate crash/danger scores by census tract.

        Pattern: Higher danger in low-income areas (matches real-world data).

        Returns:
            DataFrame with danger scores by tract
        """
        np.random.seed(seed)

        danger_data = []
        for idx, tract in self.census_gdf.iterrows():
            tract_id = tract['tract_id']
            median_income = tract['median_income']
            population = tract['total_population']

            # Base danger score (crashes per 10k residents per year)
            base_danger = DANGER_SCORE_CONFIG['base_danger']

            # Income effect: Lower income = higher danger (inverse relationship)
            # Normalized income: 0 (lowest) to 1 (highest)
            income_range = self.census_gdf['median_income'].max() - self.census_gdf['median_income'].min()
            norm_income = (median_income - self.census_gdf['median_income'].min()) / income_range
            multiplier_range = DANGER_SCORE_CONFIG['income_multiplier_max'] - DANGER_SCORE_CONFIG['income_multiplier_min']
            income_multiplier = DANGER_SCORE_CONFIG['income_multiplier_min'] + (1.0 - norm_income) * multiplier_range

            # Population effect: Higher population = slightly higher danger
            pop_multiplier = 1.0 + (population / 10000) * 0.1

            # Random variation (±20%)
            noise = np.random.uniform(0.8, 1.2)

            danger_score = base_danger * income_multiplier * pop_multiplier * noise

            # Estimate annual crashes
            annual_crashes = (danger_score * population / 10000)

            danger_data.append({
                'tract_id': tract_id,
                'danger_score': round(danger_score, 2),
                'annual_crashes': round(annual_crashes, 1),
                'median_income': median_income,
                'population': population
            })

        self.danger_scores = pd.DataFrame(danger_data)
        return self.danger_scores

    def _select_project_type_for_gap(self, tract_id: str) -> str:
        """Pick the project type addressing the tract's biggest infrastructure gap."""
        # Map OSM density columns to project types
        density_to_project = {
            'crossings_density': 'crosswalk',
            'bike_infra_density': 'bike_lane',
            'traffic_signals_density': 'traffic_signal',
            'speed_calming_density': 'speed_reduction',
        }

        row = self.infrastructure_df[self.infrastructure_df['tract_id'] == tract_id]
        if row.empty:
            return 'crosswalk'  # default for unmatched tracts

        row = row.iloc[0]
        lowest_density = None
        best_project = 'crosswalk'
        for density_col, project_type in density_to_project.items():
            val = row.get(density_col, 0)
            if lowest_density is None or val < lowest_density:
                lowest_density = val
                best_project = project_type

        return best_project

    def _merge_danger_data(self, seed: int) -> pd.DataFrame:
        """Merge danger scores with census data, computing scores if needed."""
        if self.danger_scores is None:
            self.simulate_danger_scores(seed)
        danger_subset = self.danger_scores[['tract_id', 'danger_score', 'annual_crashes']]
        return self.census_gdf.merge(danger_subset, on='tract_id')

    def simulate_ai_recommendations(self, bias_strength: float = 0.6, seed: int = DEFAULT_RANDOM_SEED) -> pd.DataFrame:
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

        def gini_coefficient(values):
            sorted_values = np.sort(values)
            n = len(values)
            cumsum = np.cumsum(sorted_values)
            return (2 * np.sum((np.arange(1, n+1)) * sorted_values)) / (n * cumsum[-1]) - (n + 1) / n

        ai_gini = gini_coefficient(ai_with_quintiles['cost'].values)
        need_gini = gini_coefficient(need_with_quintiles['cost'].values)

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
