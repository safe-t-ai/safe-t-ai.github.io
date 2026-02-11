import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / 'data'
RAW_DATA_DIR = DATA_DIR / 'raw'
SIMULATED_DATA_DIR = DATA_DIR / 'simulated'

DURHAM_BOUNDS = {
    'north': 36.1399,
    'south': 35.8699,
    'east': -78.7699,
    'west': -79.0199
}

CENSUS_API_KEY = os.getenv('CENSUS_API_KEY', '')

BIAS_PARAMETERS = {
    'low_income_undercount': 0.25,
    'high_income_overcount': 0.08,
    'minority_undercount': 0.20,
    'base_noise': 0.05
}

# Temporal configuration
CRASH_ANALYSIS_YEARS = [2019, 2020, 2021, 2022, 2023]
CRASH_TRAINING_YEARS = [2019, 2020, 2021, 2022]
CRASH_TEST_YEARS = [2023]

# Infrastructure project types
INFRASTRUCTURE_PROJECT_TYPES = {
    'bike_lane': {'cost': 500_000, 'safety_impact': 0.85},
    'crosswalk': {'cost': 50_000, 'safety_impact': 0.70},
    'traffic_signal': {'cost': 300_000, 'safety_impact': 0.90},
    'speed_reduction': {'cost': 100_000, 'safety_impact': 0.75},
}
INFRASTRUCTURE_DEFAULT_BUDGET = 5_000_000

# Danger score parameters
DANGER_SCORE_CONFIG = {
    'base_danger': 15.0,
    'income_multiplier_min': 1.0,
    'income_multiplier_max': 1.8,
    'seed': 42,
}

# Model reproducibility
DEFAULT_RANDOM_SEED = 42

# Suppressed demand parameters
SUPPRESSED_DEMAND_CONFIG = {
    'base_rate': 0.10,
    'infrastructure_quality_correlation': 0.65,
}
