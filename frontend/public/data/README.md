# Frontend Static Data

This directory contains JSON files generated for the static frontend deployment.

## Files

These files are automatically generated from the backend simulation data and optimized for frontend consumption.

## Generating Data

Run the static data generation script:

```bash
python scripts/generate_static_data.py
```

This script:
1. Reads data from `backend/data/simulated/`
2. Transforms it for frontend consumption
3. Outputs optimized JSON files to this directory

The files are used by the GitHub Pages deployment for a backend-free experience.
