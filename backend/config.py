import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / 'data'
RAW_DATA_DIR = DATA_DIR / 'raw'
PROCESSED_DATA_DIR = DATA_DIR / 'processed'
SIMULATED_DATA_DIR = DATA_DIR / 'simulated'

DURHAM_BOUNDS = {
    'north': 36.1399,
    'south': 35.8699,
    'east': -78.7699,
    'west': -79.0199
}

DURHAM_CENTER = {
    'lat': 36.0,
    'lon': -78.9
}

CENSUS_API_KEY = os.getenv('CENSUS_API_KEY', '')

BIAS_PARAMETERS = {
    'low_income_undercount': 0.25,
    'high_income_overcount': 0.08,
    'minority_undercount': 0.20,
    'base_noise': 0.05
}

FLASK_CONFIG = {
    'host': '0.0.0.0',
    'port': 5000,
    'debug': True
}
