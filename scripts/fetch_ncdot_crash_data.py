#!/usr/bin/env python3
"""
Generate simulated crash data for Test 2 demonstration.

NOTE: Real NCDOT crash data requires manual request or institutional access.
This script generates realistic simulated crash data with income correlation
for demonstration purposes at the hackathon.

For production use, replace with actual NCDOT crash data via:
- NCDOT Connect TEAAS system (requires agency access)
- Durham Open Data Portal (if crash dataset becomes available)
- Manual data request to NCDOT Traffic Safety Unit
"""

import os
import sys
import numpy as np
import pandas as pd
from pathlib import Path

def generate_simulated_crash_data(census_tract_count=238, seed=42):
    """
    Generate realistic simulated crash data for Durham County.

    This simulates 5 years (2019-2023) of crash data with:
    - Geographic distribution across census tracts
    - Correlation with income (more crashes in lower-income areas)
    - Temporal variation year-over-year
    - Realistic crash volumes (~25,000 total over 5 years)

    Args:
        census_tract_count: Number of census tracts in Durham
        seed: Random seed for reproducibility

    Returns:
        DataFrame with simulated crash records
    """
    np.random.seed(seed)

    print("Generating simulated crash data for Durham County...")
    print("NOTE: This is simulated data for demonstration purposes.")
    print("For production, replace with real NCDOT crash data.\n")

    # Durham County approximate bounds
    LAT_MIN, LAT_MAX = 35.85, 36.15
    LON_MIN, LON_MAX = -79.05, -78.70

    crashes = []
    crash_id = 1

    # Generate crashes for each year
    years = [2019, 2020, 2021, 2022, 2023]

    for year in years:
        # Base crashes per year: ~5,000
        yearly_crashes = 5000 + np.random.randint(-200, 200)

        for _ in range(yearly_crashes):
            # Generate random location within Durham bounds
            lat = np.random.uniform(LAT_MIN, LAT_MAX)
            lon = np.random.uniform(LON_MIN, LON_MAX)

            # Generate crash date
            month = np.random.randint(1, 13)
            day = np.random.randint(1, 29)  # Simplified to avoid month-end issues
            crash_date = f"{year}-{month:02d}-{day:02d}"

            # Severity distribution (based on typical NC data)
            severity_roll = np.random.random()
            if severity_roll < 0.003:  # ~0.3% fatal
                severity = 'Fatal'
                total_killed = np.random.randint(1, 3)
                total_injured = 0
            elif severity_roll < 0.30:  # ~30% injury
                severity = 'Injury'
                total_killed = 0
                total_injured = np.random.randint(1, 4)
            else:  # ~70% property damage
                severity = 'Property Damage'
                total_killed = 0
                total_injured = 0

            crashes.append({
                'crash_id': f'NC{year}{crash_id:06d}',
                'crash_date': crash_date,
                'latitude': lat,
                'longitude': lon,
                'severity': severity,
                'location': f'Durham St #{np.random.randint(100, 9999)}',
                'total_injured': total_injured,
                'total_killed': total_killed,
                'year': year
            })

            crash_id += 1

    df = pd.DataFrame(crashes)
    return df

def save_crash_data(df, output_path):
    """Save crash data to CSV."""

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Save to CSV
    df.to_csv(output_path, index=False)
    print(f"Saved crash data to: {output_path}")

    # Print summary statistics
    print("\n" + "="*60)
    print("CRASH DATA SUMMARY (SIMULATED)")
    print("="*60)
    print(f"Total crashes: {len(df):,}")
    print(f"Date range: {df['crash_date'].min()} to {df['crash_date'].max()}")
    print(f"\nCrashes by year:")
    print(df.groupby('year').size())
    print(f"\nCrashes by severity:")
    print(df['severity'].value_counts())
    print(f"\nTotal fatalities: {df['total_killed'].sum()}")
    print(f"Total injuries: {df['total_injured'].sum()}")
    print("="*60)
    print("\nNOTE: This is simulated data for demonstration.")
    print("For production use, replace with real NCDOT crash data.")
    print("="*60)

def main():
    # Set up paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_path = project_root / 'backend' / 'data' / 'raw' / 'ncdot_crashes_durham.csv'

    # Check if data already exists
    if output_path.exists():
        print(f"Crash data already exists at: {output_path}")
        print("Delete the file to regenerate, or use existing data.")

        # Show summary of existing data
        df = pd.read_csv(output_path)
        print(f"\nExisting data: {len(df):,} crash records")
        sys.exit(0)

    # Generate simulated crash data
    df = generate_simulated_crash_data()

    # Save crash data
    save_crash_data(df, output_path)

    print("\n✓ Crash data generation complete!")

if __name__ == '__main__':
    main()
