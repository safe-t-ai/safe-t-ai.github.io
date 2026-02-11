"""
Analyze suppressed demand for Test 4.

This script:
1. Loads Durham census data
2. Calculates potential vs actual demand
3. Analyzes infrastructure-driven demand suppression
4. Tests AI capability to detect suppressed demand
5. Exports analysis results for frontend visualization
"""

import sys
import os
import json

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import geopandas as gpd
from config import HIGH_SUPPRESSION_THRESHOLD, RAW_DATA_DIR
from models.demand_analyzer import SuppressedDemandAnalyzer


def load_census_data():
    """Load Durham census tract data."""
    census_path = RAW_DATA_DIR / 'durham_census_tracts.geojson'
    if not census_path.exists():
        raise FileNotFoundError(
            f"Census data not found at {census_path}. "
            "Run fetch_durham_data.py first."
        )

    gdf = gpd.read_file(census_path)
    print(f"Loaded {len(gdf)} census tracts")

    required = ['tract_id', 'median_income', 'total_population', 'geometry']
    missing = [col for col in required if col not in gdf.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    return gdf


def main():
    print("=" * 80)
    print("Test 4: Suppressed Demand Analysis")
    print("=" * 80)

    # Load census data
    print("\n1. Loading census data...")
    census_gdf = load_census_data()

    # Run suppressed demand analysis
    print("\n2. Running suppressed demand analysis...")
    analyzer = SuppressedDemandAnalyzer(census_gdf)
    results = analyzer.run_analysis()

    # Print summary
    print("\n3. Summary Statistics:")
    print(f"   Total potential demand: {results['summary']['total_potential_demand']:,} trips/day")
    print(f"   Total actual demand: {results['summary']['total_actual_demand']:,} trips/day")
    print(f"   Total suppressed demand: {results['summary']['total_suppressed_demand']:,} trips/day")
    print(f"   Overall suppression rate: {results['summary']['suppression_rate']:.1f}%")
    print(f"   High-suppression tracts (>{HIGH_SUPPRESSION_THRESHOLD}%): {results['summary']['high_suppression_tracts']}")

    print("\n4. Demand by Income Quintile:")
    print(f"   {'Quintile':<15} {'Potential':>10} {'Actual':>10} {'Suppressed':>10} {'Supp %':>8}")
    print("   " + "-" * 60)
    for quintile, metrics in results['by_quintile'].items():
        print(f"   {quintile:<15} {metrics['potential_demand']:>10.1f} "
              f"{metrics['actual_demand']:>10.1f} "
              f"{metrics['suppressed_demand']:>10.1f} "
              f"{metrics['suppression_pct']:>7.1f}%")

    print("\n5. AI Detection Capability:")
    print(f"   {'Model':<20} {'Correlation':>12} {'RMSE':>10} {'Q1 Bias':>10} {'Detection Rate':>15}")
    print("   " + "-" * 75)

    naive = results['detection_scorecard']['naive_ai']
    soph = results['detection_scorecard']['sophisticated_ai']
    expert = results['detection_scorecard']['human_expert_baseline']

    print(f"   {'Naive AI':<20} {naive['correlation_with_potential']:>12.3f} "
          f"{naive['rmse']:>10.1f} {naive['bias_q1']:>9.1f}% "
          f"{naive['detection_rate_high_suppression']:>14.1f}%")
    print(f"   {'Sophisticated AI':<20} {soph['correlation_with_potential']:>12.3f} "
          f"{soph['rmse']:>10.1f} {soph['bias_q1']:>9.1f}% "
          f"{soph['detection_rate_high_suppression']:>14.1f}%")
    print(f"   {'Human Expert':<20} {expert['correlation_with_potential']:>12.3f} "
          f"{expert['rmse']:>10.1f} {expert['bias_q1']:>9.1f}% "
          f"{expert['detection_rate_high_suppression']:>14.1f}%")

    # Create output directory
    output_dir = os.path.join(
        os.path.dirname(__file__),
        '../backend/data/simulated'
    )
    os.makedirs(output_dir, exist_ok=True)

    # Export demand report
    print("\n6. Exporting demand analysis report...")
    demand_report = {
        'summary': results['summary'],
        'high_suppression_threshold': HIGH_SUPPRESSION_THRESHOLD,
        'by_quintile': results['by_quintile'],
        'findings': [
            f"{results['summary']['suppression_rate']:.1f}% of potential active transportation demand is suppressed by poor infrastructure",
            f"Q1 (poorest) areas have {results['by_quintile']['Q1 (Poorest)']['suppression_pct']:.1f}% suppression vs {results['by_quintile']['Q5 (Richest)']['suppression_pct']:.1f}% in Q5",
            f"Naive AI has only {naive['correlation_with_potential']:.2f} correlation with potential demand (fails to detect suppressed demand)",
            f"Sophisticated AI achieves {soph['correlation_with_potential']:.2f} correlation but still undercounts by {abs(soph['bias_q1']):.1f}% in Q1",
            "Standard AI tools (Strava Metro) perpetuate inequity by measuring observed demand instead of potential need"
        ]
    }

    with open(os.path.join(output_dir, 'demand_analysis.json'), 'w') as f:
        json.dump(demand_report, f, indent=2)

    print(f"   ✓ Exported demand_analysis.json")

    # Export funnel data
    print("\n7. Exporting demand suppression funnel...")
    with open(os.path.join(output_dir, 'demand_funnel.json'), 'w') as f:
        json.dump(results['funnel_data'], f, indent=2)
    print(f"   ✓ Exported demand_funnel.json")

    # Export correlation matrix
    print("\n8. Exporting correlation matrix...")
    with open(os.path.join(output_dir, 'correlation_matrix.json'), 'w') as f:
        json.dump(results['correlation_matrix'], f, indent=2)
    print(f"   ✓ Exported correlation_matrix.json")

    # Export detection scorecard
    print("\n9. Exporting AI detection scorecard...")
    with open(os.path.join(output_dir, 'detection_scorecard.json'), 'w') as f:
        json.dump(results['detection_scorecard'], f, indent=2)
    print(f"   ✓ Exported detection_scorecard.json")

    # Export network flow (simplified)
    print("\n10. Exporting network flow data...")
    with open(os.path.join(output_dir, 'network_flow.json'), 'w') as f:
        json.dump(results['network_flow'], f, indent=2)
    print(f"   ✓ Exported network_flow.json")

    # Export geospatial demand data
    print("\n11. Exporting geospatial demand data...")
    demand_data = results['demand_data']

    # Merge with geometry
    demand_geo = census_gdf[['tract_id', 'geometry']].merge(
        demand_data[[
            'tract_id', 'potential_demand', 'actual_demand', 'suppressed_demand',
            'suppression_pct', 'infrastructure_score', 'income_quintile'
        ]],
        on='tract_id'
    )

    # Simplify geometry for web
    demand_geo['geometry'] = demand_geo['geometry'].simplify(0.001)

    # Export as GeoJSON
    demand_geo_dict = json.loads(demand_geo.to_json())

    with open(os.path.join(output_dir, 'demand_geo_data.json'), 'w') as f:
        json.dump(demand_geo_dict, f)

    print(f"   ✓ Exported demand_geo_data.json ({len(demand_geo)} tracts)")

    print("\n" + "=" * 80)
    print("Suppressed demand analysis complete!")
    print("=" * 80)


if __name__ == '__main__':
    main()
