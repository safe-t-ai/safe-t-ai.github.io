#!/usr/bin/env python3
"""
Test script to verify Durham Transportation Safety Audit setup
"""

import sys
from pathlib import Path

def check_file(path, description):
    """Check if a file exists"""
    if path.exists():
        size = path.stat().st_size
        print(f"✓ {description}: {path.name} ({size:,} bytes)")
        return True
    else:
        print(f"✗ {description}: {path.name} NOT FOUND")
        return False

def main():
    print("Durham Transportation Safety Audit - Setup Verification")
    print("=" * 60)
    print()

    base_dir = Path(__file__).parent
    backend_dir = base_dir / 'backend'

    all_checks_passed = True

    # Check data files
    print("Data Files:")
    print("-" * 60)

    census_file = backend_dir / 'data' / 'raw' / 'durham_census_tracts.geojson'
    all_checks_passed &= check_file(census_file, "Census tracts")

    counters_file = backend_dir / 'data' / 'simulated' / 'ground_truth_counters.json'
    all_checks_passed &= check_file(counters_file, "Ground truth counters")

    predictions_file = backend_dir / 'data' / 'simulated' / 'ai_volume_predictions.json'
    all_checks_passed &= check_file(predictions_file, "AI predictions")

    print()

    # Check backend imports
    print("Backend Components:")
    print("-" * 60)

    sys.path.insert(0, str(backend_dir))

    try:
        from config import RAW_DATA_DIR, SIMULATED_DATA_DIR
        print("✓ Config module")
    except Exception as e:
        print(f"✗ Config module: {e}")
        all_checks_passed = False

    try:
        from utils.demographic_analysis import calculate_income_quintiles
        print("✓ Demographic analysis utils")
    except Exception as e:
        print(f"✗ Demographic analysis utils: {e}")
        all_checks_passed = False

    try:
        from utils.geospatial import load_geojson
        print("✓ Geospatial utils")
    except Exception as e:
        print(f"✗ Geospatial utils: {e}")
        all_checks_passed = False

    try:
        from models.volume_estimator import VolumeEstimationAuditor
        print("✓ Volume estimator model")
    except Exception as e:
        print(f"✗ Volume estimator model: {e}")
        all_checks_passed = False

    try:
        from app import app
        print("✓ Flask app")
    except Exception as e:
        print(f"✗ Flask app: {e}")
        all_checks_passed = False

    print()

    # Check frontend files
    print("Frontend Components:")
    print("-" * 60)

    frontend_dir = base_dir / 'frontend'

    all_checks_passed &= check_file(frontend_dir / 'package.json', "Package.json")
    all_checks_passed &= check_file(frontend_dir / 'vite.config.js', "Vite config")
    all_checks_passed &= check_file(frontend_dir / 'public' / 'index.html', "HTML file")
    all_checks_passed &= check_file(frontend_dir / 'src' / 'main.js', "Main JS")
    all_checks_passed &= check_file(frontend_dir / 'src' / 'services' / 'api.js', "API client")
    all_checks_passed &= check_file(frontend_dir / 'src' / 'components' / 'common' / 'DurhamMap.js', "Map component")

    node_modules = frontend_dir / 'node_modules'
    if node_modules.exists():
        print(f"✓ Node modules installed")
    else:
        print(f"✗ Node modules NOT installed (run: cd frontend && npm install)")
        all_checks_passed = False

    print()

    # Summary
    print("=" * 60)
    if all_checks_passed:
        print("✓ All checks passed! Ready to run the application.")
        print()
        print("To start the application:")
        print("  1. Terminal 1: cd backend && python app.py")
        print("  2. Terminal 2: cd frontend && npm run dev")
        print("  3. Open browser: http://localhost:5173")
        return 0
    else:
        print("✗ Some checks failed. Please fix the issues above.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
