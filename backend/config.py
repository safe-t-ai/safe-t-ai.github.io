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
CENSUS_VINTAGE = 2024  # ACS 5-year estimates vintage year

BIAS_PARAMETERS = {
    'low_income_undercount': 0.25,
    'high_income_overcount': 0.08,
    'minority_undercount': 0.20,
    'base_noise': 0.05
}

# Temporal configuration
CRASH_ANALYSIS_YEARS = [2019, 2020, 2021, 2022, 2023, 2024]
CRASH_TRAINING_YEARS = [2019, 2020, 2021, 2022, 2023]
CRASH_TEST_YEARS = [2024]

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

# NCDOT Non-Motorist Crash Feature Service (public ArcGIS)
NCDOT_NONMOTORIST_SERVICE = (
    "https://services.arcgis.com/NuWFvHYDMVmmxMeM/arcgis/rest/services"
    "/NCDOT_NonMotoristCrashes/FeatureServer/0"
)

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

# OpenStreetMap / Overpass API
OVERPASS_API = "https://overpass-api.de/api/interpreter"
OVERPASS_TIMEOUT = 60

# OSM infrastructure features: Overpass QL tag filters and composite score weights
OSM_INFRASTRUCTURE_FEATURES = {
    'crossings': {
        'tags': '["highway"="crossing"]',
        'weight': 0.25,
    },
    'bike_infra': {
        'tags': '["highway"~"cycleway|path"]["bicycle"!="no"]',
        'weight': 0.25,
    },
    'traffic_signals': {
        'tags': '["highway"="traffic_signals"]',
        'weight': 0.15,
    },
    'speed_calming': {
        'tags': '["traffic_calming"]',
        'weight': 0.10,
    },
    'footways': {
        'tags': '["highway"="footway"]',
        'weight': 0.25,
    },
}

QUINTILE_LABELS = ['Q1 (Poorest)', 'Q2', 'Q3', 'Q4', 'Q5 (Richest)']

# Data freshness thresholds (days before re-fetch)
DATA_FRESHNESS = {
    'census': 365,       # Census releases annually
    'ncdot_crashes': 30, # NCDOT updates ~quarterly
    'osm': 7,            # OSM changes frequently
}

# Plausibility ranges for CI validation (catch order-of-magnitude errors)
PLAUSIBILITY_RANGES = {
    'crashes_per_year': (50, 500),                # NCDOT non-motorist: ~148/yr
    'crashes_total': (300, 3_000),                # All years of non-motorist crash data
    'census_tracts': (60, 75),                    # US Census ACS Durham County
    'durham_total_population': (250_000, 400_000),  # Census ACS estimate ~311k
    'median_income_range': (15_000, 250_000),     # Per-tract median household income
    'budget_allocation_total': (4_500_000, 5_500_000),  # INFRASTRUCTURE_DEFAULT_BUDGET ± margin
    'confusion_matrix_min_f1_spread': 0.05,      # Min spread between best/worst quintile F1
    'osm_crossings_total': (500, 10_000),           # Pedestrian crossings in Durham (~3,200)
    'osm_bike_infra_total': (50, 5_000),            # Cycleways and shared paths (~1,300)
    'osm_traffic_signals_total': (100, 5_000),      # Traffic signals (~1,000)
    'osm_footways_total': (2_000, 50_000),          # Dedicated footways (~22,500)
}
