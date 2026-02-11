#!/usr/bin/env python3
"""
Generate simulated crash data for Durham County, calibrated to real NCDOT volumes.

Queries the NC Vision Zero Power BI API for the actual Durham County crash total,
then generates simulated crash records at that volume. Falls back to a cached
calibration file if the API is unavailable.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))
from config import (
    CRASH_ANALYSIS_YEARS,
    DEFAULT_RANDOM_SEED,
    DURHAM_BOUNDS,
    NCDOT_DATA_YEARS,
    NCDOT_DATASET_ID,
    NCDOT_MODEL_ID,
    NCDOT_POWERBI_API,
    NCDOT_REPORT_ID,
    RAW_DATA_DIR,
)

CALIBRATION_PATH = RAW_DATA_DIR / 'ncdot_calibration.json'
OUTPUT_PATH = RAW_DATA_DIR / 'ncdot_crashes_durham.csv'


def fetch_durham_crash_count():
    """
    Query COUNTNONBLANK(CNTY_NM) filtered to DURHAM from the Power BI API.

    Returns the total crash count across all years in the dataset, or None
    if the API is unavailable.
    """
    query = {
        "version": "1.0.0",
        "queries": [{
            "Query": {
                "Commands": [{
                    "SemanticQueryDataShapeCommand": {
                        "Query": {
                            "Version": 2,
                            "From": [{
                                "Name": "c",
                                "Entity": "CT_ACCIDENT",
                                "Type": 0
                            }],
                            "Select": [{
                                "Aggregation": {
                                    "Expression": {
                                        "Column": {
                                            "Expression": {"SourceRef": {"Source": "c"}},
                                            "Property": "CNTY_NM"
                                        }
                                    },
                                    "Function": 5  # COUNTNONBLANK
                                },
                                "Name": "CountNonBlank(CT_ACCIDENT.CNTY_NM)"
                            }],
                            "Where": [{
                                "Condition": {
                                    "In": {
                                        "Expressions": [{
                                            "Column": {
                                                "Expression": {"SourceRef": {"Source": "c"}},
                                                "Property": "CNTY_NM"
                                            }
                                        }],
                                        "Values": [[{"Literal": {"Value": "'DURHAM'"}}]]
                                    }
                                }
                            }]
                        }
                    }
                }]
            },
            "QueryId": "",
            "ApplicationContext": {
                "DatasetId": NCDOT_DATASET_ID,
                "Sources": [{"ReportId": NCDOT_REPORT_ID}]
            }
        }],
        "cancelQueries": [],
        "modelId": NCDOT_MODEL_ID
    }

    try:
        response = requests.post(
            NCDOT_POWERBI_API,
            json=query,
            headers={
                'Content-Type': 'application/json',
                'X-PowerBI-ResourceKey': NCDOT_REPORT_ID
            },
            timeout=30
        )

        if response.status_code != 200:
            print(f"Warning: NCDOT API returned status {response.status_code}")
            return None

        data = response.json()
        result = data['results'][0]['result']['data']
        ds = result['dsr']['DS']
        count = ds[0]['PH'][0]['DM0'][0]['M0']
        return int(count)

    except requests.exceptions.Timeout:
        print("Warning: NCDOT API request timed out")
        return None
    except (requests.exceptions.ConnectionError, requests.exceptions.RequestException) as e:
        print(f"Warning: NCDOT API request failed: {e}")
        return None
    except (KeyError, IndexError, TypeError) as e:
        print(f"Warning: unexpected NCDOT API response structure: {e}")
        return None


def get_crashes_per_year():
    """
    Get the calibrated crashes-per-year value.

    Tries the live API first. On success, caches the result. On failure,
    falls back to the cached calibration file. If neither is available,
    fails explicitly.
    """
    total = fetch_durham_crash_count()

    if total is not None:
        per_year = total // NCDOT_DATA_YEARS
        calibration = {
            "total": total,
            "per_year": per_year,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "api_accessible": True
        }
        CALIBRATION_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(CALIBRATION_PATH, 'w') as f:
            json.dump(calibration, f, indent=2)
        print(f"NCDOT API: {total:,} total Durham crashes across ~{NCDOT_DATA_YEARS} years ({per_year:,}/year)")
        return per_year

    # Fallback to cached calibration
    if CALIBRATION_PATH.exists():
        with open(CALIBRATION_PATH) as f:
            calibration = json.load(f)
        per_year = calibration['per_year']
        print(f"Using cached calibration from {calibration['fetched_at']}: {per_year:,} crashes/year")
        return per_year

    raise RuntimeError(
        "NCDOT API unavailable and no cached calibration exists. "
        "Run with API access at least once to create ncdot_calibration.json."
    )


def generate_crash_data(crashes_per_year, seed=DEFAULT_RANDOM_SEED):
    """Generate simulated crash records calibrated to the given annual volume."""
    np.random.seed(seed)

    lat_min, lat_max = DURHAM_BOUNDS['south'], DURHAM_BOUNDS['north']
    lon_min, lon_max = DURHAM_BOUNDS['west'], DURHAM_BOUNDS['east']

    crashes = []
    crash_id = 1

    for year in CRASH_ANALYSIS_YEARS:
        yearly_count = crashes_per_year + np.random.randint(-200, 200)

        for _ in range(yearly_count):
            lat = np.random.uniform(lat_min, lat_max)
            lon = np.random.uniform(lon_min, lon_max)

            month = np.random.randint(1, 13)
            day = np.random.randint(1, 29)
            crash_date = f"{year}-{month:02d}-{day:02d}"

            severity_roll = np.random.random()
            if severity_roll < 0.003:
                severity = 'Fatal'
                total_killed = np.random.randint(1, 3)
                total_injured = 0
            elif severity_roll < 0.30:
                severity = 'Injury'
                total_killed = 0
                total_injured = np.random.randint(1, 4)
            else:
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

    return pd.DataFrame(crashes)


def main():
    crashes_per_year = get_crashes_per_year()

    # Always regenerate to reflect current calibration
    if OUTPUT_PATH.exists():
        OUTPUT_PATH.unlink()

    df = generate_crash_data(crashes_per_year)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)

    print(f"\nSaved {len(df):,} crash records to {OUTPUT_PATH}")
    print(f"  Years: {df['year'].min()}-{df['year'].max()}")
    print(f"  Per year: {df.groupby('year').size().to_dict()}")
    print(f"  Severity: {df['severity'].value_counts().to_dict()}")


if __name__ == '__main__':
    main()
