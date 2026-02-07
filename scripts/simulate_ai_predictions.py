"""
Generate simulated AI predictions with documented demographic biases.

Simulates outputs from tools like Strava Metro and StreetLight Data:
- Undercount volume in low-income areas (15-30%)
- Overcount volume in high-income areas (5-10%)
- Undercount in minority communities (15-25%)
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / 'backend'))

import json
import numpy as np
import pandas as pd
import geopandas as gpd
from config import RAW_DATA_DIR, SIMULATED_DATA_DIR, BIAS_PARAMETERS

SIMULATED_DATA_DIR.mkdir(parents=True, exist_ok=True)

def generate_ground_truth_counters(census_gdf):
    """Generate ground truth bike/ped counter data"""

    # Select 15 counter locations distributed across income levels
    num_counters = 15

    counters = []

    for idx in range(num_counters):
        # Pick a random tract
        tract = census_gdf.iloc[idx % len(census_gdf)]

        # Generate counter location within tract
        centroid = tract.geometry.centroid

        # Generate realistic daily volume based on population density
        base_volume = tract['total_population'] / 100  # ~1% of pop bikes/walks daily

        # Add variation by time of year
        seasonal_factor = np.random.uniform(0.8, 1.2)
        daily_volume = int(base_volume * seasonal_factor)

        counter = {
            'counter_id': f'CTR{idx+1:03d}',
            'tract_id': tract['tract_id'],
            'lat': centroid.y,
            'lon': centroid.x,
            'daily_volume': daily_volume,
            'median_income': tract['median_income'],
            'pct_minority': tract['pct_minority'],
            'type': 'real' if idx < 3 else 'simulated'  # First 3 are "real"
        }

        counters.append(counter)

    df = pd.DataFrame(counters)

    # Save ground truth
    output_file = SIMULATED_DATA_DIR / 'ground_truth_counters.json'
    df.to_json(output_file, orient='records', indent=2)
    print(f"Generated {len(counters)} counter locations")
    print(f"Saved to {output_file}")

    return df

def apply_ai_bias(ground_truth_df, census_gdf):
    """Apply documented bias patterns to create AI predictions"""

    ai_predictions = []

    for _, counter in ground_truth_df.iterrows():
        true_volume = counter['daily_volume']
        income = counter['median_income']
        pct_minority = counter['pct_minority']

        # Calculate bias multiplier based on demographics

        # Income bias
        income_quintile = get_income_quintile(income, census_gdf)
        if income_quintile <= 2:  # Low income (bottom 40%)
            income_bias = 1.0 - BIAS_PARAMETERS['low_income_undercount']
        elif income_quintile >= 4:  # High income (top 40%)
            income_bias = 1.0 + BIAS_PARAMETERS['high_income_overcount']
        else:
            income_bias = 1.0

        # Racial bias
        if pct_minority > 60:
            racial_bias = 1.0 - BIAS_PARAMETERS['minority_undercount']
        elif pct_minority < 30:
            racial_bias = 1.0 + 0.05
        else:
            racial_bias = 1.0

        # Combined bias
        total_bias = income_bias * racial_bias

        # Add base noise
        noise = np.random.normal(1.0, BIAS_PARAMETERS['base_noise'])

        # Calculate predicted volume
        predicted_volume = int(true_volume * total_bias * noise)

        prediction = {
            'counter_id': counter['counter_id'],
            'tract_id': counter['tract_id'],
            'true_volume': true_volume,
            'predicted_volume': predicted_volume,
            'error': predicted_volume - true_volume,
            'error_pct': ((predicted_volume - true_volume) / true_volume * 100),
            'income_quintile': income_quintile,
            'pct_minority': pct_minority,
            'bias_applied': total_bias,
        }

        ai_predictions.append(prediction)

    df = pd.DataFrame(ai_predictions)

    # Calculate summary statistics
    print("\nAI Prediction Bias Summary:")
    print("=" * 50)

    low_income = df[df['income_quintile'] <= 2]
    high_income = df[df['income_quintile'] >= 4]

    print(f"Low-income areas (Q1-Q2):")
    print(f"  Mean error: {low_income['error_pct'].mean():.1f}%")
    print(f"  (Undercount by {abs(low_income['error_pct'].mean()):.1f}%)")

    print(f"\nHigh-income areas (Q4-Q5):")
    print(f"  Mean error: {high_income['error_pct'].mean():.1f}%")
    print(f"  (Overcount by {high_income['error_pct'].mean():.1f}%)")

    high_minority = df[df['pct_minority'] > 60]
    low_minority = df[df['pct_minority'] < 30]

    print(f"\nHigh-minority areas (>60%):")
    print(f"  Mean error: {high_minority['error_pct'].mean():.1f}%")

    print(f"\nLow-minority areas (<30%):")
    print(f"  Mean error: {low_minority['error_pct'].mean():.1f}%")

    # Save predictions
    output_file = SIMULATED_DATA_DIR / 'ai_volume_predictions.json'
    df.to_json(output_file, orient='records', indent=2)
    print(f"\nSaved AI predictions to {output_file}")

    return df

def get_income_quintile(income, census_gdf):
    """Calculate income quintile (1=lowest, 5=highest)"""
    quintiles = census_gdf['median_income'].quantile([0.2, 0.4, 0.6, 0.8])

    if income <= quintiles[0.2]:
        return 1
    elif income <= quintiles[0.4]:
        return 2
    elif income <= quintiles[0.6]:
        return 3
    elif income <= quintiles[0.8]:
        return 4
    else:
        return 5

if __name__ == '__main__':
    print("AI Prediction Simulation - Volume Estimation Bias")
    print("=" * 60)

    # Load census data
    census_file = RAW_DATA_DIR / 'durham_census_tracts.geojson'

    if not census_file.exists():
        print("Error: Census data not found. Run fetch_durham_data.py first.")
        sys.exit(1)

    census_gdf = gpd.read_file(census_file)
    print(f"Loaded {len(census_gdf)} census tracts")

    # Generate ground truth counters
    print("\n1. Generating ground truth counter data...")
    ground_truth = generate_ground_truth_counters(census_gdf)

    # Apply AI bias
    print("\n2. Applying documented AI bias patterns...")
    ai_predictions = apply_ai_bias(ground_truth, census_gdf)

    print("\n✓ Simulation complete!")
