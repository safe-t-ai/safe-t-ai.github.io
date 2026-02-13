#!/usr/bin/env python3
"""
Fetch geocoded non-motorist crash data for Durham County from NCDOT's
public ArcGIS Feature Service.

Covers pedestrian, bicycle, and other non-motorist crashes from 2007-present.
Paginates through the API (max 2000 records per request) and saves as CSV.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))

import pandas as pd
import requests

from config import NCDOT_NONMOTORIST_SERVICE, RAW_DATA_DIR, DATA_FRESHNESS
from utils.freshness import is_fresh, write_meta

RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_PATH = RAW_DATA_DIR / 'ncdot_nonmotorist_durham.csv'

# Fields to fetch (subset of 65 available — enough for crash analysis)
OUT_FIELDS = [
    'CrashID', 'CrashDate', 'CrashYear', 'CrashMonth', 'CrashHour',
    'Latitude', 'Longitude',
    'CrashSevr', 'CrashType', 'CrashTypGr', 'CrashAlcoh',
    'NM_Type', 'NM_Age', 'NM_Sex', 'NM_Race', 'NM_Inj', 'NM_AlcDrg',
    'NM_NumTot', 'NM_NumK', 'NM_NumA', 'NM_NumB', 'NM_NumC', 'NM_NumU',
    'DrvrAge', 'DrvrSex', 'DrvrRace', 'DrvrVehTyp',
    'SpeedLimit', 'RdClass', 'LightCond', 'Weather',
    'County', 'City',
]

MAX_RECORDS = 2000  # ArcGIS service limit per query


def fetch_durham_nonmotorist_crashes():
    """
    Query the NCDOT Non-Motorist Crash Feature Service for Durham County.

    Paginates with resultOffset since the service returns max 2000 per request.
    """
    base_params = {
        'where': "County='DURHAM'",
        'outFields': ','.join(OUT_FIELDS),
        'returnGeometry': 'false',
        'orderByFields': 'CrashID',
        'f': 'json',
    }

    all_features = []
    offset = 0

    while True:
        params = {**base_params, 'resultOffset': offset}
        print(f"  Fetching records {offset}\u2013{offset + MAX_RECORDS}...")

        response = requests.get(
            f"{NCDOT_NONMOTORIST_SERVICE}/query",
            params=params,
            timeout=60,
        )
        response.raise_for_status()

        data = response.json()

        if 'error' in data:
            raise RuntimeError(f"ArcGIS query error: {data['error']}")

        features = data.get('features', [])
        all_features.extend(f['attributes'] for f in features)

        if len(features) < MAX_RECORDS:
            break
        offset += MAX_RECORDS

    return all_features


def main():
    force = '--force' in sys.argv

    print("Fetching NCDOT non-motorist crash data for Durham County...")

    if not force and is_fresh(OUTPUT_PATH, DATA_FRESHNESS['ncdot_crashes']):
        print(f"Crash data is fresh (< {DATA_FRESHNESS['ncdot_crashes']} days old), skipping fetch.")
        print("Use --force to re-fetch.")
        return

    records = fetch_durham_nonmotorist_crashes()

    if not records:
        raise RuntimeError("No records returned from NCDOT Feature Service")

    df = pd.DataFrame(records)

    # Convert CrashDate from epoch ms to date string
    if 'CrashDate' in df.columns:
        df['CrashDate'] = pd.to_datetime(df['CrashDate'], unit='ms').dt.strftime('%Y-%m-%d')

    # Drop records missing coordinates
    before = len(df)
    df = df.dropna(subset=['Latitude', 'Longitude'])
    dropped = before - len(df)
    if dropped:
        print(f"  Dropped {dropped} records with missing coordinates")

    df.to_csv(OUTPUT_PATH, index=False)

    year_min = int(df['CrashYear'].min())
    year_max = int(df['CrashYear'].max())

    write_meta(OUTPUT_PATH,
               source_url=NCDOT_NONMOTORIST_SERVICE,
               record_count=len(df),
               extra={'year_range': [year_min, year_max]})

    print(f"\nSaved {len(df):,} geocoded crash records to {OUTPUT_PATH}")
    print(f"  Years: {year_min}\u2013{year_max}")
    print(f"  NM types: {df['NM_Type'].value_counts().to_dict()}")
    print(f"  Severity: {df['CrashSevr'].value_counts().to_dict()}")


if __name__ == '__main__':
    main()
