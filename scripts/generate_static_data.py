#!/usr/bin/env python3
"""
Generate static JSON files for gh-pages deployment.
Pre-generates all API responses so frontend can work without backend.
"""

import sys
from pathlib import Path
import json
import pandas as pd

# Add backend to path
backend_dir = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

from config import RAW_DATA_DIR, SIMULATED_DATA_DIR
from models.volume_estimator import VolumeEstimationAuditor, load_test1_data
from models.infrastructure_auditor import InfrastructureRecommendationAuditor
from utils.geospatial import geojson_to_dict, simplify_geometry
import geopandas as gpd

def main():
    print("Generating static data for gh-pages deployment...")
    print("=" * 60)

    # Create output directory
    output_dir = Path(__file__).parent.parent / 'frontend' / 'public' / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load data
    print("Loading data...")
    census_gdf, ground_truth, ai_predictions = load_test1_data(
        RAW_DATA_DIR, SIMULATED_DATA_DIR
    )

    auditor = VolumeEstimationAuditor(census_gdf, ground_truth, ai_predictions)

    # Generate all API responses as static files

    # 1. Census tracts
    print("Generating census tracts GeoJSON...")
    census_simplified = simplify_geometry(census_gdf.copy(), tolerance=0.001)
    census_geojson = geojson_to_dict(census_simplified)
    with open(output_dir / 'census-tracts.json', 'w') as f:
        json.dump(census_geojson, f)

    # 2. Counter locations
    print("Generating counter locations...")
    counters = ground_truth.to_dict('records')
    with open(output_dir / 'counter-locations.json', 'w') as f:
        json.dump(counters, f, indent=2)

    # 3. Full report
    print("Generating full report...")
    report = auditor.generate_full_report()
    with open(output_dir / 'report.json', 'w') as f:
        json.dump(report, f, indent=2)

    # 4. Choropleth data
    print("Generating choropleth data...")
    tract_errors_gdf = auditor.get_tract_level_errors()
    tract_errors_gdf = simplify_geometry(tract_errors_gdf, tolerance=0.001)
    choropleth_geojson = geojson_to_dict(tract_errors_gdf)
    with open(output_dir / 'choropleth-data.json', 'w') as f:
        json.dump(choropleth_geojson, f)

    # 5. Accuracy by income
    print("Generating accuracy by income...")
    by_income = auditor.analyze_by_income()
    with open(output_dir / 'accuracy-by-income.json', 'w') as f:
        json.dump(by_income, f, indent=2)

    # 6. Accuracy by race
    print("Generating accuracy by race...")
    by_race = auditor.analyze_by_race()
    with open(output_dir / 'accuracy-by-race.json', 'w') as f:
        json.dump(by_race, f, indent=2)

    # 7. Scatter data
    print("Generating scatter data...")
    scatter_data = auditor.get_scatter_data()
    with open(output_dir / 'scatter-data.json', 'w') as f:
        json.dump(scatter_data, f, indent=2)

    # 8. Error distribution
    print("Generating error distribution...")
    error_dist = auditor.get_error_distribution()
    with open(output_dir / 'error-distribution.json', 'w') as f:
        json.dump(error_dist, f, indent=2)

    # ===== TEST 3: Infrastructure Recommendations =====
    print("\n" + "=" * 60)
    print("Generating Test 3 data (Infrastructure Recommendations)...")
    print("=" * 60)

    # Load infrastructure simulation data
    infrastructure_file = SIMULATED_DATA_DIR / 'infrastructure_recommendations.json'
    if infrastructure_file.exists():
        print("Loading infrastructure recommendations...")
        with open(infrastructure_file, 'r') as f:
            infrastructure_data = json.load(f)

        # 9. Infrastructure full report
        print("Generating infrastructure report...")
        with open(output_dir / 'infrastructure-report.json', 'w') as f:
            json.dump(infrastructure_data, f, indent=2)

        # 10. Danger scores with geography
        print("Generating danger scores map data...")
        danger_scores = infrastructure_data['danger_scores']
        danger_gdf = census_gdf.merge(
            pd.DataFrame(danger_scores),
            on='tract_id'
        )
        danger_gdf = simplify_geometry(danger_gdf, tolerance=0.001)
        danger_geojson = geojson_to_dict(danger_gdf)
        with open(output_dir / 'danger-scores.json', 'w') as f:
            json.dump(danger_geojson, f)

        # 11. Budget allocation comparison
        print("Generating budget allocation data...")
        allocation_comparison = {
            'ai_allocation': infrastructure_data['equity_metrics']['ai_allocation'],
            'need_based_allocation': infrastructure_data['equity_metrics']['need_based_allocation'],
            'comparison': infrastructure_data['equity_metrics']['comparison']
        }
        with open(output_dir / 'budget-allocation.json', 'w') as f:
            json.dump(allocation_comparison, f, indent=2)

        # 12. Recommendations with geography
        print("Generating recommendations map data...")
        ai_recs_df = pd.DataFrame(infrastructure_data['ai_recommendations'])
        need_recs_df = pd.DataFrame(infrastructure_data['need_based_recommendations'])

        # Merge with census for geography
        ai_recs_gdf = census_gdf.merge(ai_recs_df, on='tract_id', how='inner')
        need_recs_gdf = census_gdf.merge(need_recs_df, on='tract_id', how='inner')

        ai_recs_gdf = simplify_geometry(ai_recs_gdf, tolerance=0.001)
        need_recs_gdf = simplify_geometry(need_recs_gdf, tolerance=0.001)

        recommendations_data = {
            'ai_recommendations': geojson_to_dict(ai_recs_gdf),
            'need_based_recommendations': geojson_to_dict(need_recs_gdf)
        }
        with open(output_dir / 'recommendations.json', 'w') as f:
            json.dump(recommendations_data, f, indent=2)

        print("✓ Test 3 data generation complete!")
    else:
        print(f"Warning: Infrastructure data not found at {infrastructure_file}")
        print("Run scripts/simulate_infrastructure_recommendations.py first")

    # Summary
    print("\n" + "=" * 60)
    print("✓ Static data generation complete!")
    print(f"\nGenerated {len(list(output_dir.glob('*.json')))} JSON files in:")
    print(f"  {output_dir}")
    print("\nFiles created:")
    for file in sorted(output_dir.glob('*.json')):
        size = file.stat().st_size
        print(f"  - {file.name} ({size:,} bytes)")

    return 0

if __name__ == '__main__':
    sys.exit(main())
