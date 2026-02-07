"""
Generate simulated crash prediction data for Test 2.

This script:
1. Loads Durham census data
2. Generates realistic crash data with income correlation
3. Simulates reporting bias (enforcement bias)
4. Simulates AI predictions trained on biased data
5. Exports audit results for frontend visualization
"""

import sys
import os
import json

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import geopandas as gpd
import pandas as pd
from models.crash_predictor import CrashPredictionAuditor


def load_census_data():
    """Load Durham census tract data."""
    census_path = os.path.join(
        os.path.dirname(__file__),
        '../backend/data/raw/durham_census_tracts.geojson'
    )

    if not os.path.exists(census_path):
        raise FileNotFoundError(
            f"Census data not found at {census_path}. "
            "Run fetch_durham_data.py first."
        )

    gdf = gpd.read_file(census_path)
    print(f"Loaded {len(gdf)} census tracts")

    # Verify required columns
    required = ['tract_id', 'median_income', 'total_population', 'pct_minority', 'geometry']
    missing = [col for col in required if col not in gdf.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    return gdf


def main():
    print("=" * 80)
    print("Test 2: Crash Prediction Bias Simulation")
    print("=" * 80)

    # Load census data
    print("\n1. Loading census data...")
    census_gdf = load_census_data()

    # Run crash prediction audit
    print("\n2. Running crash prediction audit...")
    auditor = CrashPredictionAuditor(census_gdf)
    results = auditor.run_audit()

    # Print summary
    print("\n3. Summary Statistics:")
    print(f"   Total actual crashes (5 years): {results['summary']['total_actual_crashes']:,}")
    print(f"   Total reported crashes: {results['summary']['total_reported_crashes']:,}")
    print(f"   Total AI predicted: {results['summary']['total_predicted_crashes']:,}")
    print(f"   Overall reporting rate: {results['summary']['overall_reporting_rate']:.1%}")

    print("\n4. Bias by Income Quintile:")
    print(f"   {'Quintile':<15} {'Actual':>10} {'Reported':>10} {'AI Pred':>10} {'Bias %':>10}")
    print("   " + "-" * 60)
    for quintile, metrics in results['bias_by_quintile'].items():
        print(f"   {quintile:<15} {metrics['actual_crashes']:>10.1f} "
              f"{metrics['reported_crashes']:>10.1f} "
              f"{metrics['ai_predicted_crashes']:>10.1f} "
              f"{metrics['prediction_bias_pct']:>9.1f}%")

    print("\n5. Model Performance by Quintile:")
    print(f"   {'Quintile':<15} {'Precision':>10} {'Recall':>10} {'F1':>10} {'AUC':>10}")
    print("   " + "-" * 60)
    for quintile in ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)']:
        if quintile in results['confusion_matrices']['by_quintile']:
            cm_metrics = results['confusion_matrices']['by_quintile'][quintile]
            roc_metrics = results['roc_curves']['by_quintile'].get(quintile, {})
            print(f"   {quintile:<15} {cm_metrics['precision']:>10.3f} "
                  f"{cm_metrics['recall']:>10.3f} "
                  f"{cm_metrics['f1_score']:>10.3f} "
                  f"{roc_metrics.get('auc', 0):>10.3f}")

    # Create output directory
    output_dir = os.path.join(
        os.path.dirname(__file__),
        '../backend/data/simulated'
    )
    os.makedirs(output_dir, exist_ok=True)

    # Export crash report
    print("\n6. Exporting crash prediction audit report...")
    crash_report = {
        'summary': results['summary'],
        'bias_by_quintile': results['bias_by_quintile'],
        'findings': [
            f"AI underpredicts crashes in low-income areas by "
            f"{abs(results['bias_by_quintile']['Q1 (Poorest)']['prediction_bias_pct']):.1f}%",
            f"Reporting bias: {results['bias_by_quintile']['Q1 (Poorest)']['reporting_rate']:.1%} "
            f"in Q1 vs {results['bias_by_quintile']['Q5 (Richest)']['reporting_rate']:.1%} in Q5",
            f"Model performance disparity: Q1 AUC = "
            f"{results['roc_curves']['by_quintile'].get('Q1 (Poorest)', {}).get('auc', 0):.3f}, "
            f"Q5 AUC = {results['roc_curves']['by_quintile'].get('Q5 (Richest)', {}).get('auc', 0):.3f}",
            "AI trained on biased reporting data systematically underpredicts danger in underpoliced areas"
        ],
        'overall_metrics': results['confusion_matrices']['overall']
    }

    with open(os.path.join(output_dir, 'crash_predictions.json'), 'w') as f:
        json.dump(crash_report, f, indent=2)

    print(f"   ✓ Exported crash_predictions.json")

    # Export confusion matrices
    print("\n7. Exporting confusion matrices...")
    with open(os.path.join(output_dir, 'confusion_matrices.json'), 'w') as f:
        json.dump(results['confusion_matrices'], f, indent=2)
    print(f"   ✓ Exported confusion_matrices.json")

    # Export ROC curves
    print("\n8. Exporting ROC curves...")
    with open(os.path.join(output_dir, 'roc_curves.json'), 'w') as f:
        json.dump(results['roc_curves'], f, indent=2)
    print(f"   ✓ Exported roc_curves.json")

    # Export time series
    print("\n9. Exporting time series data...")
    with open(os.path.join(output_dir, 'crash_time_series.json'), 'w') as f:
        json.dump(results['time_series'], f, indent=2)
    print(f"   ✓ Exported crash_time_series.json")

    # Export geospatial crash data for maps
    print("\n10. Exporting geospatial crash data...")
    crash_data = results['crash_data']

    # Aggregate by tract (average across years)
    tract_summary = crash_data.groupby('tract_id').agg({
        'actual_crashes': 'mean',
        'reported_crashes': 'mean',
        'ai_predicted_crashes': 'mean',
        'reporting_rate': 'mean',
        'median_income': 'first',
        'income_quintile': 'first'
    }).reset_index()

    # Calculate prediction bias
    tract_summary['prediction_bias'] = (
        tract_summary['ai_predicted_crashes'] - tract_summary['actual_crashes']
    )
    tract_summary['prediction_bias_pct'] = (
        tract_summary['prediction_bias'] / tract_summary['actual_crashes'] * 100
    )

    # Merge with geometry
    crash_geo = census_gdf[['tract_id', 'geometry']].merge(
        tract_summary,
        on='tract_id'
    )

    # Simplify geometry for web
    crash_geo['geometry'] = crash_geo['geometry'].simplify(0.001)

    # Export as GeoJSON
    crash_geo_dict = json.loads(crash_geo.to_json())

    with open(os.path.join(output_dir, 'crash_geo_data.json'), 'w') as f:
        json.dump(crash_geo_dict, f)

    print(f"   ✓ Exported crash_geo_data.json ({len(crash_geo)} tracts)")

    print("\n" + "=" * 80)
    print("Crash prediction simulation complete!")
    print("=" * 80)


if __name__ == '__main__':
    main()
