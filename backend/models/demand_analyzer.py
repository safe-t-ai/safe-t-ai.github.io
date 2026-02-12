"""
Test 4: Suppressed Demand Analyzer

Evaluates whether AI can detect latent demand in areas where people would bike/walk
if infrastructure were safe, but currently don't due to poor infrastructure.
"""

import numpy as np
import pandas as pd
import geopandas as gpd
from typing import Dict
from scipy.stats import pearsonr
from config import SUPPRESSED_DEMAND_CONFIG, HIGH_SUPPRESSION_THRESHOLD, DEFAULT_RANDOM_SEED, QUINTILE_LABELS


class SuppressedDemandAnalyzer:
    """
    Analyzes suppressed demand in transportation networks.

    Core insight: AI tools measure observed demand but miss suppressed demand—
    people who would bike/walk if infrastructure were safe but currently don't.
    This creates inequitable investment patterns favoring already-served areas.
    """

    def __init__(self, census_gdf: gpd.GeoDataFrame, infrastructure_df: pd.DataFrame = None):
        """
        Initialize analyzer with census tract data and OSM infrastructure scores.

        Args:
            census_gdf: GeoDataFrame with census tracts and demographics
            infrastructure_df: DataFrame with per-tract OSM infrastructure scores
        """
        if infrastructure_df is None:
            raise ValueError(
                "infrastructure_df is required. Run fetch_osm_infrastructure.py first."
            )
        self.census_gdf = census_gdf.copy()
        self.infrastructure_df = infrastructure_df

        # Normalize income for calculations
        min_income = self.census_gdf['median_income'].min()
        max_income = self.census_gdf['median_income'].max()
        self.census_gdf['norm_income'] = (
            (self.census_gdf['median_income'] - min_income) / (max_income - min_income)
        )

    def calculate_potential_demand(self, base_rate: float = SUPPRESSED_DEMAND_CONFIG['base_rate'], seed: int = DEFAULT_RANDOM_SEED) -> pd.DataFrame:
        """
        Calculate potential demand: how many would bike/walk if infrastructure were safe.

        Args:
            base_rate: Base percentage of population that would bike/walk (10%)
            seed: Random seed for reproducibility

        Returns:
            DataFrame with potential demand by tract
        """
        np.random.seed(seed)

        demand_data = []

        for _, tract in self.census_gdf.iterrows():
            population = tract['total_population']
            norm_income = tract['norm_income']

            # Potential demand higher in low-income areas (if infrastructure were safe)
            # Rationale: Can't afford cars, would use active transportation if safe
            income_factor = 1 + (1 - norm_income) * 0.5  # Up to 1.5x in poorest areas

            # Destination density (simplified: assume proportional to population density)
            # In reality, would use actual POI data
            destination_factor = 0.8 + np.random.uniform(0, 0.4)  # 0.8 to 1.2

            # Calculate potential daily trips
            potential_trips = population * base_rate * income_factor * destination_factor

            demand_data.append({
                'tract_id': tract['tract_id'],
                'population': population,
                'median_income': tract['median_income'],
                'norm_income': norm_income,
                'income_factor': income_factor,
                'destination_factor': destination_factor,
                'potential_demand': potential_trips
            })

        return pd.DataFrame(demand_data)

    def calculate_infrastructure_quality(self, demand_df: pd.DataFrame) -> pd.DataFrame:
        """
        Merge real OSM infrastructure scores into the demand DataFrame.

        Args:
            demand_df: DataFrame with demand data

        Returns:
            DataFrame with infrastructure_score column from OSM data
        """
        demand_df = demand_df.copy()

        osm_scores = self.infrastructure_df[['tract_id', 'osm_infrastructure_score']].rename(
            columns={'osm_infrastructure_score': 'infrastructure_score'}
        )
        demand_df = demand_df.merge(osm_scores, on='tract_id', how='left')

        # Fill any unmatched tracts with a conservative low score
        demand_df['infrastructure_score'] = demand_df['infrastructure_score'].fillna(0.1)

        return demand_df

    def calculate_demand_suppression(self, demand_df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate how poor infrastructure suppresses potential demand.

        Uses non-linear suppression function: poor infrastructure doesn't just
        reduce demand proportionally—it collapses demand almost entirely.

        Args:
            demand_df: DataFrame with potential demand and infrastructure scores

        Returns:
            DataFrame with suppression metrics added
        """
        demand_df = demand_df.copy()

        # Suppression factor: non-linear (squared) relationship
        # Infrastructure 0.9 → suppression 0.19 (lose 19%)
        # Infrastructure 0.5 → suppression 0.75 (lose 75%)
        # Infrastructure 0.3 → suppression 0.91 (lose 91%)
        demand_df['suppression_factor'] = 1 - (demand_df['infrastructure_score'] ** 2)

        # Actual demand = potential demand after suppression
        demand_df['actual_demand'] = (
            demand_df['potential_demand'] * (1 - demand_df['suppression_factor'])
        )

        # Suppressed demand = what we're losing
        demand_df['suppressed_demand'] = (
            demand_df['potential_demand'] - demand_df['actual_demand']
        )

        # Suppression percentage
        demand_df['suppression_pct'] = (
            demand_df['suppression_factor'] * 100
        )

        return demand_df

    def simulate_ai_detection(self, demand_df: pd.DataFrame) -> pd.DataFrame:
        """
        Simulate AI detection of suppressed demand.

        Two approaches:
        1. Naive AI: Only counts observed trips (Strava-style)
        2. Sophisticated AI: Attempts to infer suppressed demand using correlates

        Args:
            demand_df: DataFrame with demand data

        Returns:
            DataFrame with AI predictions added
        """
        demand_df = demand_df.copy()

        # Naive AI: Just measures observed demand (what it sees)
        demand_df['ai_naive_prediction'] = demand_df['actual_demand']

        # Sophisticated AI: Tries to infer suppressed demand
        # Uses population and infrastructure as proxies, but still has errors
        population_proxy = demand_df['population'] * 0.05
        infrastructure_adjustment = (1 - demand_df['infrastructure_score']) * 50

        # Add the adjustment with some error
        noise = np.random.normal(0, 30, len(demand_df))
        demand_df['ai_sophisticated_prediction'] = (
            demand_df['actual_demand'] +
            population_proxy +
            infrastructure_adjustment +
            noise
        )

        # Clip to reasonable bounds
        demand_df['ai_sophisticated_prediction'] = np.clip(
            demand_df['ai_sophisticated_prediction'],
            0,
            demand_df['potential_demand'] * 1.2  # Can't exceed potential by much
        )

        return demand_df

    def generate_funnel_data(self, demand_df: pd.DataFrame) -> Dict:
        """
        Generate funnel chart data showing demand suppression pipeline.

        Args:
            demand_df: DataFrame with demand data

        Returns:
            Dict with funnel stages by quintile
        """
        if 'income_quintile' not in demand_df.columns:
            demand_df['income_quintile'] = pd.qcut(
                demand_df['median_income'], q=5, labels=QUINTILE_LABELS
            )

        # Calculate funnel stages by quintile
        funnel_data = {}

        for quintile in QUINTILE_LABELS:
            quintile_data = demand_df[demand_df['income_quintile'] == quintile]

            # Funnel stages (normalized to 100% at potential)
            potential_total = quintile_data['potential_demand'].sum()
            actual_total = quintile_data['actual_demand'].sum()

            # Simplified 4-stage funnel
            # Stage 1: Potential (100%)
            # Stage 2: Destinations within range (85-95% depending on income)
            # Stage 3: Would use if safe (60-80%)
            # Stage 4: Actually use (final %)

            stage2_pct = 0.90 - (1 - quintile_data['norm_income'].mean()) * 0.10
            stage3_pct = 0.70 - (1 - quintile_data['norm_income'].mean()) * 0.15
            stage4_pct = actual_total / potential_total if potential_total > 0 else 0

            funnel_data[quintile] = {
                'stage1_potential': 100.0,
                'stage2_destinations': stage2_pct * 100,
                'stage3_would_use_if_safe': stage3_pct * 100,
                'stage4_actually_use': stage4_pct * 100,
                'total_suppression_pct': (1 - stage4_pct) * 100
            }

        # Overall funnel
        total_potential = demand_df['potential_demand'].sum()
        total_actual = demand_df['actual_demand'].sum()

        funnel_data['overall'] = {
            'stage1_potential': 100.0,
            'stage2_destinations': 88.0,
            'stage3_would_use_if_safe': 65.0,
            'stage4_actually_use': (total_actual / total_potential * 100) if total_potential > 0 else 0,
            'total_suppression_pct': (1 - total_actual / total_potential) * 100 if total_potential > 0 else 0
        }

        return funnel_data

    def generate_correlation_matrix(self, demand_df: pd.DataFrame) -> Dict:
        """
        Generate correlation matrix showing relationships between variables.

        Args:
            demand_df: DataFrame with all calculated metrics

        Returns:
            Dict with correlation matrix data
        """
        variables = [
            'infrastructure_score',
            'median_income',
            'potential_demand',
            'actual_demand',
            'suppressed_demand'
        ]

        # Calculate correlation matrix
        corr_matrix = demand_df[variables].corr()

        # Convert to format for heatmap visualization
        matrix_data = []
        for i, var1 in enumerate(variables):
            for j, var2 in enumerate(variables):
                matrix_data.append({
                    'variable1': var1,
                    'variable2': var2,
                    'correlation': float(corr_matrix.loc[var1, var2])
                })

        return {
            'variables': variables,
            'correlations': matrix_data,
            'matrix': corr_matrix.to_dict()
        }

    def calculate_detection_scorecard(self, demand_df: pd.DataFrame) -> Dict:
        """
        Evaluate AI capability to detect suppressed demand.

        Args:
            demand_df: DataFrame with AI predictions

        Returns:
            Dict with detection metrics
        """
        # Correlation with potential demand
        corr_naive, _ = pearsonr(
            demand_df['ai_naive_prediction'],
            demand_df['potential_demand']
        )
        corr_sophisticated, _ = pearsonr(
            demand_df['ai_sophisticated_prediction'],
            demand_df['potential_demand']
        )

        # RMSE
        rmse_naive = np.sqrt(
            ((demand_df['ai_naive_prediction'] - demand_df['potential_demand']) ** 2).mean()
        )
        rmse_sophisticated = np.sqrt(
            ((demand_df['ai_sophisticated_prediction'] - demand_df['potential_demand']) ** 2).mean()
        )

        if 'income_quintile' not in demand_df.columns:
            demand_df['income_quintile'] = pd.qcut(
                demand_df['median_income'], q=5, labels=QUINTILE_LABELS
            )

        q1_data = demand_df[demand_df['income_quintile'] == QUINTILE_LABELS[0]]
        q5_data = demand_df[demand_df['income_quintile'] == QUINTILE_LABELS[-1]]

        q1_naive_error = (
            (q1_data['ai_naive_prediction'].mean() - q1_data['potential_demand'].mean()) /
            q1_data['potential_demand'].mean() * 100
        )
        q5_naive_error = (
            (q5_data['ai_naive_prediction'].mean() - q5_data['potential_demand'].mean()) /
            q5_data['potential_demand'].mean() * 100
        )

        q1_soph_error = (
            (q1_data['ai_sophisticated_prediction'].mean() - q1_data['potential_demand'].mean()) /
            q1_data['potential_demand'].mean() * 100
        )
        q5_soph_error = (
            (q5_data['ai_sophisticated_prediction'].mean() - q5_data['potential_demand'].mean()) /
            q5_data['potential_demand'].mean() * 100
        )

        # Detection rate in high-suppression areas
        high_suppression = demand_df[demand_df['suppression_pct'] > HIGH_SUPPRESSION_THRESHOLD]

        if len(high_suppression) > 0:
            detection_naive = (
                (high_suppression['ai_naive_prediction'] > high_suppression['actual_demand'] * 1.5).sum() /
                len(high_suppression) * 100
            )
            detection_sophisticated = (
                (high_suppression['ai_sophisticated_prediction'] > high_suppression['actual_demand'] * 1.5).sum() /
                len(high_suppression) * 100
            )
        else:
            detection_naive = 0
            detection_sophisticated = 0

        return {
            'naive_ai': {
                'correlation_with_potential': float(corr_naive),
                'rmse': float(rmse_naive),
                'bias_q1': float(q1_naive_error),
                'bias_q5': float(q5_naive_error),
                'detection_rate_high_suppression': float(detection_naive)
            },
            'sophisticated_ai': {
                'correlation_with_potential': float(corr_sophisticated),
                'rmse': float(rmse_sophisticated),
                'bias_q1': float(q1_soph_error),
                'bias_q5': float(q5_soph_error),
                'detection_rate_high_suppression': float(detection_sophisticated)
            },
            'human_expert_baseline': {
                'correlation_with_potential': 0.85,
                'rmse': 60.0,
                'bias_q1': -5.0,
                'bias_q5': -5.0,
                'detection_rate_high_suppression': 80.0
            }
        }

    def generate_network_flow(self, demand_df: pd.DataFrame, top_n: int = 20) -> Dict:
        """
        Generate network flow data showing potential vs actual route usage.

        Simplified version: Shows top census tracts by suppressed demand.

        Args:
            demand_df: DataFrame with demand data
            top_n: Number of top flows to include

        Returns:
            Dict with network flow data
        """
        # Sort by suppressed demand
        top_suppressed = demand_df.nlargest(top_n, 'suppressed_demand')

        nodes = []
        links = []

        # Create nodes for each tract
        for idx, tract in top_suppressed.iterrows():
            nodes.append({
                'id': tract['tract_id'],
                'name': f"Tract {tract['tract_id']}",
                'potential': float(tract['potential_demand']),
                'actual': float(tract['actual_demand']),
                'suppressed': float(tract['suppressed_demand']),
                'income_level': 'Low' if tract['norm_income'] < 0.4 else ('High' if tract['norm_income'] > 0.6 else 'Medium')
            })

            # Create link showing flow within tract
            links.append({
                'source': f"potential_{tract['tract_id']}",
                'target': f"actual_{tract['tract_id']}",
                'value': float(tract['actual_demand']),
                'type': 'realized'
            })

            links.append({
                'source': f"potential_{tract['tract_id']}",
                'target': f"suppressed_{tract['tract_id']}",
                'value': float(tract['suppressed_demand']),
                'type': 'suppressed'
            })

        return {
            'nodes': nodes,
            'links': links[:40]  # Limit for visualization
        }

    def run_analysis(self) -> Dict:
        """
        Run complete suppressed demand analysis.

        Returns:
            Dict with complete analysis results
        """
        demand_df = self.calculate_potential_demand()
        demand_df = self.calculate_infrastructure_quality(demand_df)
        demand_df = self.calculate_demand_suppression(demand_df)
        demand_df = self.simulate_ai_detection(demand_df)

        # Calculate quintiles once for all sub-methods
        demand_df['income_quintile'] = pd.qcut(
            demand_df['median_income'], q=5, labels=QUINTILE_LABELS
        )

        funnel_data = self.generate_funnel_data(demand_df)
        correlation_matrix = self.generate_correlation_matrix(demand_df)
        detection_scorecard = self.calculate_detection_scorecard(demand_df)
        network_flow = self.generate_network_flow(demand_df)

        # Summary statistics
        total_potential = demand_df['potential_demand'].sum()
        total_actual = demand_df['actual_demand'].sum()
        total_suppressed = demand_df['suppressed_demand'].sum()

        summary = {
            'total_potential_demand': int(total_potential),
            'total_actual_demand': int(total_actual),
            'total_suppressed_demand': int(total_suppressed),
            'suppression_rate': float(total_suppressed / total_potential * 100),
            'tracts_analyzed': len(demand_df),
            'high_suppression_tracts': int((demand_df['suppression_pct'] > HIGH_SUPPRESSION_THRESHOLD).sum()),
            'naive_ai_correlation': float(detection_scorecard['naive_ai']['correlation_with_potential']),
            'sophisticated_ai_correlation': float(detection_scorecard['sophisticated_ai']['correlation_with_potential'])
        }

        by_quintile = {}
        for quintile in QUINTILE_LABELS:
            q_data = demand_df[demand_df['income_quintile'] == quintile]
            by_quintile[quintile] = {
                'potential_demand': float(q_data['potential_demand'].mean()),
                'actual_demand': float(q_data['actual_demand'].mean()),
                'suppressed_demand': float(q_data['suppressed_demand'].mean()),
                'suppression_pct': float(q_data['suppression_pct'].mean()),
                'infrastructure_score': float(q_data['infrastructure_score'].mean())
            }

        return {
            'summary': summary,
            'by_quintile': by_quintile,
            'funnel_data': funnel_data,
            'correlation_matrix': correlation_matrix,
            'detection_scorecard': detection_scorecard,
            'network_flow': network_flow,
            'demand_data': demand_df  # For further processing
        }
