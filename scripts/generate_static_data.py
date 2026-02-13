#!/usr/bin/env python3
"""
Generate static JSON files for gh-pages deployment.
Pre-generates all API responses so frontend can work without backend.
"""

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
import json
import pandas as pd

# Add backend to path
backend_dir = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

from config import (
    RAW_DATA_DIR, SIMULATED_DATA_DIR, PLAUSIBILITY_RANGES,
    CENSUS_VINTAGE, CRASH_ANALYSIS_YEARS,
)
from utils.freshness import read_meta
from models.volume_estimator import VolumeEstimationAuditor, load_test1_data
from utils.geospatial import geojson_to_dict, simplify_geometry
from utils.demographic_analysis import calculate_income_quintiles, calculate_minority_category


def copy_json(source_path, dest_path, indent=2):
    """Copy a JSON file from source to dest, returning the parsed data."""
    with open(source_path, 'r') as f:
        data = json.load(f)
    with open(dest_path, 'w') as f:
        json.dump(data, f, indent=indent)
    return data


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
    with open(output_dir / 'volume-report.json', 'w') as f:
        json.dump(report, f, indent=2)

    # 4. Choropleth data
    print("Generating choropleth data...")
    tract_predictions_file = SIMULATED_DATA_DIR / 'tract_volume_predictions.json'
    tract_predictions = pd.read_json(tract_predictions_file)
    tract_predictions['tract_id'] = tract_predictions['tract_id'].astype(str)
    census_gdf['tract_id'] = census_gdf['tract_id'].astype(str)

    print("  Preparing tract-level geometries...")
    tract_geoms = census_gdf.dissolve(by='tract_id', aggfunc='first')[['geometry']]
    tract_geoms = tract_geoms.reset_index()

    tract_errors_gdf = tract_geoms.merge(
        tract_predictions[['tract_id', 'error_pct', 'error', 'true_volume', 'predicted_volume',
                          'median_income', 'pct_minority', 'total_population']],
        on='tract_id',
        how='left'
    )

    print(f"  Created {len(tract_errors_gdf)} census tract polygons")

    # Add demographic categories for cross-filtering
    tract_errors_gdf = calculate_income_quintiles(tract_errors_gdf)
    tract_errors_gdf = calculate_minority_category(tract_errors_gdf)

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

    # ===== TEST 3: Infrastructure Recommendations =====
    print("\n" + "=" * 60)
    print("Generating Test 3 data (Infrastructure Recommendations)...")
    print("=" * 60)

    infrastructure_file = SIMULATED_DATA_DIR / 'infrastructure_recommendations.json'
    infrastructure_data = copy_json(infrastructure_file, output_dir / 'infrastructure-report.json')

    print("Generating danger scores map data...")
    danger_scores = infrastructure_data['danger_scores']
    danger_gdf = census_gdf.merge(
        pd.DataFrame(danger_scores),
        on='tract_id'
    )
    # Add income quintile for cross-filtering
    income_col = 'median_income_y' if 'median_income_y' in danger_gdf.columns else 'median_income'
    danger_gdf['income_quintile'] = pd.qcut(
        danger_gdf[income_col], q=5,
        labels=['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)']
    )
    danger_gdf = simplify_geometry(danger_gdf, tolerance=0.001)
    danger_geojson = geojson_to_dict(danger_gdf)
    with open(output_dir / 'danger-scores.json', 'w') as f:
        json.dump(danger_geojson, f)

    print("Generating budget allocation data...")
    allocation_comparison = {
        'ai_allocation': infrastructure_data['equity_metrics']['ai_allocation'],
        'need_based_allocation': infrastructure_data['equity_metrics']['need_based_allocation'],
        'comparison': infrastructure_data['equity_metrics']['comparison']
    }
    with open(output_dir / 'budget-allocation.json', 'w') as f:
        json.dump(allocation_comparison, f, indent=2)

    print("Generating recommendations map data...")
    ai_recs_df = pd.DataFrame(infrastructure_data['ai_recommendations'])
    need_recs_df = pd.DataFrame(infrastructure_data['need_based_recommendations'])

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

    # ===== TEST 2: Crash Prediction Bias =====
    print("\n" + "=" * 60)
    print("Generating Test 2 data (Crash Prediction Bias)...")
    print("=" * 60)

    crash_report_file = SIMULATED_DATA_DIR / 'crash_predictions.json'
    copy_json(crash_report_file, output_dir / 'crash-report.json')

    crash_files = {
        'confusion_matrices.json': 'confusion-matrices.json',
        'crash_time_series.json': 'crash-time-series.json',
        'crash_geo_data.json': 'crash-geo-data.json',
    }
    for src_name, dest_name in crash_files.items():
        indent = 2 if dest_name != 'crash-geo-data.json' else None
        copy_json(SIMULATED_DATA_DIR / src_name, output_dir / dest_name, indent=indent)

    # ===== TEST 4: Suppressed Demand Analysis =====
    print("\n" + "=" * 60)
    print("Generating Test 4 data (Suppressed Demand Analysis)...")
    print("=" * 60)

    demand_report_file = SIMULATED_DATA_DIR / 'demand_analysis.json'
    copy_json(demand_report_file, output_dir / 'demand-report.json')

    demand_files = {
        'demand_funnel.json': 'demand-funnel.json',
        'detection_scorecard.json': 'detection-scorecard.json',
        'demand_geo_data.json': 'demand-geo-data.json',
    }
    for src_name, dest_name in demand_files.items():
        indent = 2 if dest_name != 'demand-geo-data.json' else None
        copy_json(SIMULATED_DATA_DIR / src_name, output_dir / dest_name, indent=indent)

    # ===== DATA MANIFEST & METADATA =====
    print("\n" + "=" * 60)
    print("Generating data manifest and metadata...")
    print("=" * 60)

    # Read fetch metadata for temporal coverage
    census_meta = read_meta(RAW_DATA_DIR / 'durham_census_tracts.geojson')
    crash_meta = read_meta(RAW_DATA_DIR / 'ncdot_nonmotorist_durham.csv')
    osm_meta = read_meta(RAW_DATA_DIR / 'osm_infrastructure.json')

    analysis_range = f"{min(CRASH_ANALYSIS_YEARS)}-{max(CRASH_ANALYSIS_YEARS)}"
    census_coverage = f"{CENSUS_VINTAGE - 4}-{CENSUS_VINTAGE}"

    manifest = {
        'sources': {
            'census_demographics': {
                'type': 'real',
                'provider': f'US Census Bureau ACS {CENSUS_VINTAGE}',
                'temporal_coverage': census_coverage,
                'fetched_at': (census_meta or {}).get('fetched_at'),
                'files': ['census-tracts.json', 'choropleth-data.json'],
            },
            'crash_volumes': {
                'type': 'real',
                'provider': 'NCDOT Non-Motorist Crash Database (ArcGIS)',
                'temporal_coverage': analysis_range,
                'fetched_at': (crash_meta or {}).get('fetched_at'),
                'files': ['crash-report.json', 'crash-time-series.json',
                          'confusion-matrices.json', 'crash-geo-data.json'],
            },
            'volume_predictions': {
                'type': 'simulated',
                'rationale': 'Strava Metro / StreetLight Data require institutional license',
                'files': ['volume-report.json', 'counter-locations.json',
                          'accuracy-by-income.json', 'accuracy-by-race.json',
                          'scatter-data.json'],
            },
            'infrastructure_recommendations': {
                'type': 'mixed',
                'real_source': 'OpenStreetMap infrastructure density per tract',
                'fetched_at': (osm_meta or {}).get('fetched_at'),
                'rationale': 'Project selection uses real OSM infrastructure gaps; danger scores and allocation logic are simulated',
                'files': ['infrastructure-report.json', 'danger-scores.json',
                          'budget-allocation.json', 'recommendations.json'],
            },
            'suppressed_demand': {
                'type': 'mixed',
                'real_source': 'OpenStreetMap infrastructure density per tract',
                'fetched_at': (osm_meta or {}).get('fetched_at'),
                'rationale': 'Infrastructure scores from OSM; demand modeling and AI detection are simulated',
                'files': ['demand-report.json', 'demand-funnel.json',
                          'detection-scorecard.json', 'demand-geo-data.json'],
            },
        },
        'plausibility_ranges': PLAUSIBILITY_RANGES,
    }

    with open(output_dir / 'data-manifest.json', 'w') as f:
        json.dump(manifest, f, indent=2)
    print("  Generated data-manifest.json")

    metadata = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'data_hash': os.environ.get('DATA_HASH', 'local'),
        'github_run_url': os.environ.get('GITHUB_RUN_URL', ''),
        'git_sha': os.environ.get('GIT_SHA', ''),
        'sources': {
            'real': [f'US Census ACS {CENSUS_VINTAGE}',
                     'OpenStreetMap infrastructure inventory',
                     'NCDOT non-motorist crashes (ArcGIS)'],
            'simulated': ['volume predictions',
                          'infrastructure recommendations', 'demand analysis'],
        },
    }

    with open(output_dir / 'metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    print("  Generated metadata.json")

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
