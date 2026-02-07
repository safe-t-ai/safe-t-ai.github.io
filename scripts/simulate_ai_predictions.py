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

def generate_tract_level_predictions(census_gdf):
    """
    Generate AI volume predictions for ALL census tracts.

    This simulates how AI tools (Strava Metro, StreetLight) provide estimates
    for entire regions, not just where counters exist.
    """

    predictions = []

    for _, tract in census_gdf.iterrows():
        # Calculate "true" baseline active transportation volume
        # Based on population density, transit access, walkability
        population = tract['total_population']

        # Base active transportation rate: 2-4% of population makes a bike/walk trip daily
        # Higher in denser areas, lower in suburban areas
        base_rate = 0.03  # 3% baseline

        # Adjust for population density (higher density = higher active transport)
        # This creates realistic geographic variation
        area_km2 = tract.geometry.area * 111 * 111  # rough conversion to km²
        density = population / area_km2 if area_km2 > 0 else 0

        # Density adjustment (0.8x to 1.2x)
        if density > 5000:  # Urban core
            density_factor = 1.2
        elif density > 2000:  # Urban
            density_factor = 1.1
        elif density > 500:  # Suburban
            density_factor = 0.95
        else:  # Rural
            density_factor = 0.8

        # Calculate "true" daily active transportation volume
        true_daily_volume = int(population * base_rate * density_factor)

        # Now apply AI bias based on demographics
        income = tract['median_income']
        pct_minority = tract['pct_minority']

        income_quintile = get_income_quintile(income, census_gdf)

        # Income bias
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

        # Combined bias with smaller noise for tract-level (not individual counter noise)
        total_bias = income_bias * racial_bias
        noise = np.random.normal(1.0, 0.03)  # Smaller noise for aggregate

        predicted_daily_volume = int(true_daily_volume * total_bias * noise)

        # Calculate error metrics
        error = predicted_daily_volume - true_daily_volume
        error_pct = (error / true_daily_volume * 100) if true_daily_volume > 0 else 0

        predictions.append({
            'tract_id': tract['tract_id'],
            'true_volume': true_daily_volume,
            'predicted_volume': predicted_daily_volume,
            'error': error,
            'error_pct': error_pct,
            'income_quintile': income_quintile,
            'median_income': income,
            'pct_minority': pct_minority,
            'total_population': population,
            'bias_applied': total_bias
        })

    df = pd.DataFrame(predictions)

    # Print summary statistics
    print("\nTract-Level AI Prediction Summary:")
    print("=" * 60)
    print(f"Total tracts: {len(df)}")
    print(f"Total true volume (daily): {df['true_volume'].sum():,} trips")
    print(f"Total predicted volume (daily): {df['predicted_volume'].sum():,} trips")
    print(f"Overall bias: {df['error_pct'].mean():.1f}%")

    print("\nBias by Income Quintile:")
    for q in [1, 2, 3, 4, 5]:
        q_data = df[df['income_quintile'] == q]
        if len(q_data) > 0:
            print(f"  Q{q}: {q_data['error_pct'].mean():+.1f}% ({len(q_data)} tracts)")

    print("\nBias by Minority Percentage:")
    high_minority = df[df['pct_minority'] > 60]
    low_minority = df[df['pct_minority'] < 30]
    print(f"  High minority (>60%): {high_minority['error_pct'].mean():+.1f}% ({len(high_minority)} tracts)")
    print(f"  Low minority (<30%): {low_minority['error_pct'].mean():+.1f}% ({len(low_minority)} tracts)")

    # Save tract-level predictions
    output_file = SIMULATED_DATA_DIR / 'tract_volume_predictions.json'
    df.to_json(output_file, orient='records', indent=2)
    print(f"\nSaved tract-level predictions to {output_file}")

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

    # Generate ground truth counters (validation points)
    print("\n1. Generating ground truth counter data (validation)...")
    ground_truth = generate_ground_truth_counters(census_gdf)

    # Apply AI bias to counter locations
    print("\n2. Applying AI bias to counter predictions...")
    ai_predictions = apply_ai_bias(ground_truth, census_gdf)

    # Generate tract-level predictions for full map visualization
    print("\n3. Generating tract-level predictions for all areas...")
    tract_predictions = generate_tract_level_predictions(census_gdf)

    print("\n✓ Simulation complete!")
    print(f"\nGenerated:")
    print(f"  - {len(ground_truth)} validation counters")
    print(f"  - {len(tract_predictions)} tract-level predictions")
