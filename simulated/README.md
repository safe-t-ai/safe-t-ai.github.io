# Simulated Data Directory

This directory contains AI-generated simulation data for the SAFE-T audit platform.

## Files

The simulation scripts generate the following files:
- `ai_volume_predictions.json` - Volume prediction bias data (Test 1)
- `crash_predictions.json` - Crash prediction bias data (Test 2)
- `infrastructure_recommendations.json` - Infrastructure allocation data (Test 3)
- `demand_analysis.json` - Suppressed demand analysis (Test 4)
- Various supporting data files for visualizations

## Generating Data

After fetching raw data, run the simulation scripts:

```bash
cd backend
python ../scripts/simulate_ai_predictions.py
python ../scripts/simulate_crash_predictions.py
python ../scripts/simulate_infrastructure_recommendations.py
python ../scripts/analyze_suppressed_demand.py
```

Or use the data pipeline workflow:
```bash
gh workflow run data-pipeline.yml
```
