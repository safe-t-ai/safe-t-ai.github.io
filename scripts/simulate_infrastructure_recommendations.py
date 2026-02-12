#!/usr/bin/env python3
"""
Simulate AI infrastructure recommendations with documented bias.

Generates:
- Danger scores by census tract
- Biased AI recommendations (favor high-income)
- Need-based recommendations (equitable baseline)
- Equity analysis comparing both approaches
"""

import sys
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))

import pandas as pd
import geopandas as gpd
from config import INFRASTRUCTURE_DEFAULT_BUDGET, DEFAULT_RANDOM_SEED, RAW_DATA_DIR
from models.infrastructure_auditor import InfrastructureRecommendationAuditor


def load_infrastructure_data():
    """Load OSM infrastructure scores."""
    infra_path = RAW_DATA_DIR / 'osm_infrastructure.json'
    if not infra_path.exists():
        raise FileNotFoundError(
            f"Infrastructure data not found at {infra_path}. "
            "Run fetch_osm_infrastructure.py first."
        )

    with open(infra_path) as f:
        data = json.load(f)

    return pd.DataFrame(data['tracts'])


def main():
    """Run infrastructure recommendation simulation."""
    print("="*60)
    print("AI Infrastructure Recommendation Simulation")
    print("Testing for demographic bias in resource allocation")
    print("="*60)

    # Paths
    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / 'backend' / 'data'
    census_file = data_dir / 'raw' / 'durham_census_tracts.geojson'
    output_dir = data_dir / 'simulated'
    output_file = output_dir / 'infrastructure_recommendations.json'

    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load census data
    print(f"\nLoading census data from: {census_file}")
    if not census_file.exists():
        print(f"ERROR: Census file not found. Run fetch_durham_data.py first.")
        sys.exit(1)

    census_gdf = gpd.read_file(census_file)
    print(f"Loaded {len(census_gdf)} census tracts")

    # Load infrastructure data
    print("\nLoading OSM infrastructure data...")
    infrastructure_df = load_infrastructure_data()
    print(f"Loaded infrastructure scores for {len(infrastructure_df)} tracts")

    # Initialize auditor
    print(f"\nInitializing auditor with ${INFRASTRUCTURE_DEFAULT_BUDGET:,} total budget")
    auditor = InfrastructureRecommendationAuditor(census_gdf, infrastructure_df)

    # Simulate danger scores
    print("\nSimulating crash/danger scores by tract...")
    danger_scores = auditor.simulate_danger_scores(seed=DEFAULT_RANDOM_SEED)
    print(f"  Average danger score: {danger_scores['danger_score'].mean():.1f} crashes/10k/year")
    print(f"  Range: {danger_scores['danger_score'].min():.1f} - {danger_scores['danger_score'].max():.1f}")

    # Correlation check: Lower income should have higher danger
    # danger_scores already includes median_income from census data
    income_danger_corr = danger_scores['median_income'].corr(danger_scores['danger_score'])
    print(f"  Income-Danger correlation: {income_danger_corr:.3f} (negative = correct pattern)")

    # Simulate AI recommendations (biased toward wealth)
    print("\nSimulating AI recommendations (biased toward high-income)...")
    ai_recs = auditor.simulate_ai_recommendations(bias_strength=0.6, seed=DEFAULT_RANDOM_SEED)
    print(f"  Projects recommended: {len(ai_recs)}")
    print(f"  Budget allocated: ${ai_recs['cost'].sum():,}")
    print(f"  Average project cost: ${ai_recs['cost'].mean():,.0f}")

    # Project type breakdown
    print("\n  Project types:")
    for project_type, count in ai_recs['project_type'].value_counts().items():
        total_cost = ai_recs[ai_recs['project_type'] == project_type]['cost'].sum()
        print(f"    {project_type}: {count} projects (${total_cost:,})")

    # Simulate need-based recommendations (equitable)
    print("\nSimulating need-based recommendations (equitable baseline)...")
    need_recs = auditor.simulate_need_based_recommendations(seed=DEFAULT_RANDOM_SEED)
    print(f"  Projects recommended: {len(need_recs)}")
    print(f"  Budget allocated: ${need_recs['cost'].sum():,}")
    print(f"  Average project cost: ${need_recs['cost'].mean():,.0f}")

    # Calculate equity metrics
    print("\nCalculating equity metrics...")
    equity_metrics = auditor.calculate_equity_metrics()

    print("\n  AI Allocation (biased):")
    print(f"    Disparate Impact Ratio: {equity_metrics['ai_allocation']['disparate_impact_ratio']:.3f}")
    print(f"    Gini Coefficient: {equity_metrics['ai_allocation']['gini_coefficient']:.3f}")

    print("\n  Need-Based Allocation (equitable):")
    print(f"    Disparate Impact Ratio: {equity_metrics['need_based_allocation']['disparate_impact_ratio']:.3f}")
    print(f"    Gini Coefficient: {equity_metrics['need_based_allocation']['gini_coefficient']:.3f}")

    print("\n  Comparison:")
    print(f"    Equity Gap: {equity_metrics['comparison']['equity_gap']:.3f}")
    print(f"    Gini Improvement: {equity_metrics['comparison']['gini_improvement']:.3f}")

    # Per-capita allocation by quintile
    print("\n  Budget per capita by income quintile:")
    print("    AI Allocation:")
    for quintile, per_capita in equity_metrics['ai_allocation']['per_capita'].items():
        print(f"      {quintile}: ${per_capita:.2f}/person")

    print("    Need-Based Allocation:")
    for quintile, per_capita in equity_metrics['need_based_allocation']['per_capita'].items():
        print(f"      {quintile}: ${per_capita:.2f}/person")

    # Generate full report
    print("\nGenerating full audit report...")
    report = auditor.generate_report()

    report['_provenance'] = {
        'data_type': 'mixed',
        'real': ['infrastructure gap analysis (OpenStreetMap)'],
        'simulated': ['danger scores', 'AI recommendations', 'need-based recommendations'],
        'parameters': {'budget': INFRASTRUCTURE_DEFAULT_BUDGET, 'seed': DEFAULT_RANDOM_SEED},
    }

    # Export to JSON
    print(f"\nExporting results to: {output_file}")
    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2)

    print(f"\n{'='*60}")
    print("✓ Infrastructure recommendation simulation complete")
    print(f"{'='*60}\n")

    # Print key findings
    if report['findings']:
        print("KEY FINDINGS:")
        for finding in report['findings']:
            print(f"  • {finding}")
        print()


if __name__ == '__main__':
    main()
