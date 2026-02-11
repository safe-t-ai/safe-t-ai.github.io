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
    'crosswalk': {'cost': 50_000, 'safety_impact': 0.15},
    'bike_lane': {'cost': 200_000, 'safety_impact': 0.25},
    'traffic_signal': {'cost': 150_000, 'safety_impact': 0.30},
    'speed_reduction': {'cost': 75_000, 'safety_impact': 0.20},
}
INFRASTRUCTURE_DEFAULT_BUDGET = 5_000_000

# Danger score parameters
DANGER_SCORE_CONFIG = {
    'base_danger': 15.0,
    'income_multiplier_min': 1.0,
    'income_multiplier_max': 1.8,
}

# Model reproducibility
DEFAULT_RANDOM_SEED = 42

# Volume simulation parameters
VOLUME_SIMULATION_CONFIG = {
    'num_counters': 15,
    'base_active_transport_rate': 0.03,
    'density_thresholds': [
        (5000, 1.2),   # Urban core
        (2000, 1.1),   # Urban
        (500, 0.95),   # Suburban
    ],
    'density_default_factor': 0.8,   # Rural
    'minority_high_threshold': 60,
    'minority_low_threshold': 30,
    'minority_low_overcount': 0.05,
    'aggregate_noise_std': 0.03,
}

# Suppressed demand parameters
SUPPRESSED_DEMAND_CONFIG = {
    'base_rate': 0.10,
    'infrastructure_quality_correlation': 0.65,
}

HIGH_SUPPRESSION_THRESHOLD = 70  # Suppression % that defines "high suppression"

QUINTILE_LABELS = ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)']
