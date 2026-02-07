"""
Infrastructure Recommendation Equity Auditor

Tests whether AI infrastructure recommendation systems allocate resources
equitably across demographic groups, or favor wealthy neighborhoods with
vocal advocacy over high-danger corridors in underserved communities.
"""

import numpy as np
import pandas as pd
import geopandas as gpd
from typing import Dict, List, Tuple


class InfrastructureRecommendationAuditor:
    """Audit AI infrastructure recommendations for demographic bias."""

    # Project types with costs and safety impact
    PROJECT_TYPES = {
        'crosswalk': {'cost': 50000, 'safety_impact': 0.15},  # 15% crash reduction
        'bike_lane': {'cost': 200000, 'safety_impact': 0.25},  # 25% reduction
        'traffic_signal': {'cost': 150000, 'safety_impact': 0.30},  # 30% reduction
        'speed_reduction': {'cost': 75000, 'safety_impact': 0.20},  # 20% reduction
    }

    def __init__(self, census_gdf: gpd.GeoDataFrame, total_budget: float = 5_000_000):
        """
        Initialize auditor with census data.

        Args:
            census_gdf: GeoDataFrame with census tracts and demographics
            total_budget: Total infrastructure budget to allocate ($)
        """
        self.census_gdf = census_gdf.copy()
        self.total_budget = total_budget
        self.danger_scores = None
        self.ai_recommendations = None
        self.need_based_recommendations = None

    def simulate_danger_scores(self, seed: int = 42) -> pd.DataFrame:
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
            base_danger = 15.0

            # Income effect: Lower income = higher danger (inverse relationship)
            # Normalized income: 0 (lowest) to 1 (highest)
            income_range = self.census_gdf['median_income'].max() - self.census_gdf['median_income'].min()
            norm_income = (median_income - self.census_gdf['median_income'].min()) / income_range
            income_multiplier = 1.0 + (1.0 - norm_income) * 0.8  # Up to 1.8x in poorest areas

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

    def simulate_ai_recommendations(self, bias_strength: float = 0.6, seed: int = 42) -> pd.DataFrame:
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

        if self.danger_scores is None:
            self.simulate_danger_scores(seed)

        # Merge danger scores with census data
        # Only merge danger_score and annual_crashes (other fields already in census_gdf)
        danger_subset = self.danger_scores[['tract_id', 'danger_score', 'annual_crashes']]
        data = self.census_gdf.merge(danger_subset, on='tract_id')

        # Normalize scores for comparison
        danger_norm = (data['danger_score'] - data['danger_score'].min()) / (data['danger_score'].max() - data['danger_score'].min())
        income_norm = (data['median_income'] - data['median_income'].min()) / (data['median_income'].max() - data['median_income'].min())

        # AI priority score: Weighted combination favoring wealth over danger
        # High bias_strength = favor income, low = favor danger
        data['ai_priority'] = (1 - bias_strength) * danger_norm + bias_strength * income_norm

        # Add random "advocacy score" (wealthy areas have higher advocacy)
        advocacy_boost = income_norm * np.random.uniform(0.8, 1.2, len(data))
        data['ai_priority'] = data['ai_priority'] * (1 + advocacy_boost * 0.3)

        # Rank tracts by AI priority
        data = data.sort_values('ai_priority', ascending=False).reset_index(drop=True)

        # Allocate budget top-down until exhausted
        recommendations = []
        remaining_budget = self.total_budget

        for idx, tract in data.iterrows():
            if remaining_budget <= 0:
                break

            # Determine project type based on income (bias!)
            # Wealthy areas get expensive projects
            if tract['median_income'] > data['median_income'].quantile(0.75):
                project_type = 'bike_lane'
            elif tract['median_income'] > data['median_income'].median():
                project_type = 'traffic_signal'
            else:
                project_type = 'crosswalk'

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

    def simulate_need_based_recommendations(self, seed: int = 42) -> pd.DataFrame:
        """
        Simulate need-based (equitable) infrastructure recommendations.

        Allocates based purely on danger scores (actual need).

        Returns:
            DataFrame with need-based recommendations by tract
        """
        np.random.seed(seed)

        if self.danger_scores is None:
            self.simulate_danger_scores(seed)

        # Merge danger scores with census data
        # Only merge danger_score and annual_crashes (other fields already in census_gdf)
        danger_subset = self.danger_scores[['tract_id', 'danger_score', 'annual_crashes']]
        data = self.census_gdf.merge(danger_subset, on='tract_id')

        # Rank tracts by danger score (highest danger first)
        data = data.sort_values('danger_score', ascending=False).reset_index(drop=True)

        # Allocate budget top-down until exhausted
        recommendations = []
        remaining_budget = self.total_budget

        for idx, tract in data.iterrows():
            if remaining_budget <= 0:
                break

            # Determine project type based on danger level (equitable!)
            if tract['danger_score'] > data['danger_score'].quantile(0.75):
                project_type = 'bike_lane'  # Highest danger gets most effective
            elif tract['danger_score'] > data['danger_score'].median():
                project_type = 'traffic_signal'
            else:
                project_type = 'speed_reduction'

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

        # Add income quintiles to census data
        self.census_gdf['income_quintile'] = pd.qcut(
            self.census_gdf['median_income'],
            q=5,
            labels=['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)']
        )

        # Merge recommendations with quintiles
        ai_with_quintiles = self.ai_recommendations.merge(
            self.census_gdf[['tract_id', 'income_quintile']],
            on='tract_id'
        )
        need_with_quintiles = self.need_based_recommendations.merge(
            self.census_gdf[['tract_id', 'income_quintile']],
            on='tract_id'
        )

        # Budget allocation by quintile
        ai_by_quintile = ai_with_quintiles.groupby('income_quintile')['cost'].sum()
        need_by_quintile = need_with_quintiles.groupby('income_quintile')['cost'].sum()

        # Budget per capita by quintile
        pop_by_quintile = self.census_gdf.groupby('income_quintile')['total_population'].sum()
        ai_per_capita = ai_by_quintile / pop_by_quintile
        need_per_capita = need_by_quintile / pop_by_quintile

        # Disparate impact ratio (Q1 vs Q5)
        ai_disparate_impact = ai_per_capita['Q1 (Poorest)'] / ai_per_capita['Q5 (Richest)']
        need_disparate_impact = need_per_capita['Q1 (Poorest)'] / need_per_capita['Q5 (Richest)']

        # Gini coefficient for budget distribution
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

        ai_q1_pct = equity_metrics['ai_allocation']['by_quintile']['Q1 (Poorest)'] / self.total_budget
        if ai_q1_pct < 0.15:
            findings.append(
                f"Poorest quintile receives only {ai_q1_pct:.1%} of total budget despite "
                f"having highest crash rates"
            )

        return findings
