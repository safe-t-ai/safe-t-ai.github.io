"""
API routes for Test 1: Volume Estimation Equity Audit
"""

from flask import Blueprint, jsonify
import geopandas as gpd
import pandas as pd
from pathlib import Path

from models.volume_estimator import VolumeEstimationAuditor, load_test1_data
from utils.geospatial import geojson_to_dict, simplify_geometry
from config import RAW_DATA_DIR, SIMULATED_DATA_DIR

test1_bp = Blueprint('test1', __name__, url_prefix='/api/test1')

# Cache data at module level
_cached_data = {}

def get_data():
    """Load and cache test data"""
    if 'auditor' not in _cached_data:
        census_gdf, ground_truth, ai_predictions = load_test1_data(
            RAW_DATA_DIR, SIMULATED_DATA_DIR
        )

        auditor = VolumeEstimationAuditor(census_gdf, ground_truth, ai_predictions)

        _cached_data['auditor'] = auditor
        _cached_data['census_gdf'] = census_gdf
        _cached_data['ground_truth'] = ground_truth
        _cached_data['ai_predictions'] = ai_predictions

    return _cached_data

@test1_bp.route('/census-tracts', methods=['GET'])
def get_census_tracts():
    """Get Durham census tracts with demographics"""

    data = get_data()
    census_gdf = data['census_gdf']

    # Simplify geometries for faster transfer
    census_simplified = simplify_geometry(census_gdf.copy(), tolerance=0.001)

    geojson = geojson_to_dict(census_simplified)

    return jsonify(geojson)

@test1_bp.route('/counter-locations', methods=['GET'])
def get_counter_locations():
    """Get counter locations with data"""

    data = get_data()
    ground_truth = data['ground_truth']

    counters = ground_truth.to_dict('records')

    return jsonify(counters)

@test1_bp.route('/report', methods=['GET'])
def get_full_report():
    """Get complete audit report"""

    data = get_data()
    auditor = data['auditor']

    report = auditor.generate_full_report()

    return jsonify(report)

@test1_bp.route('/choropleth-data', methods=['GET'])
def get_choropleth_data():
    """Get tract-level error data for choropleth map"""

    data = get_data()
    auditor = data['auditor']

    tract_errors_gdf = auditor.get_tract_level_errors()

    # Simplify geometries
    tract_errors_gdf = simplify_geometry(tract_errors_gdf, tolerance=0.001)

    geojson = geojson_to_dict(tract_errors_gdf)

    return jsonify(geojson)

@test1_bp.route('/accuracy-by-income', methods=['GET'])
def get_accuracy_by_income():
    """Get accuracy metrics by income quintile"""

    data = get_data()
    auditor = data['auditor']

    result = auditor.analyze_by_income()

    return jsonify(result)

@test1_bp.route('/accuracy-by-race', methods=['GET'])
def get_accuracy_by_race():
    """Get accuracy metrics by racial composition"""

    data = get_data()
    auditor = data['auditor']

    result = auditor.analyze_by_race()

    return jsonify(result)

@test1_bp.route('/scatter-data', methods=['GET'])
def get_scatter_plot_data():
    """Get data for predicted vs actual scatter plot"""

    data = get_data()
    auditor = data['auditor']

    scatter_data = auditor.get_scatter_data()

    return jsonify(scatter_data)

@test1_bp.route('/error-distribution', methods=['GET'])
def get_error_distribution_data():
    """Get error distribution histogram data"""

    data = get_data()
    auditor = data['auditor']

    distribution = auditor.get_error_distribution()

    return jsonify(distribution)
