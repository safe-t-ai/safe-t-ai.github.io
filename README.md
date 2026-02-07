# Durham Transportation Safety AI Audit Tool

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=flat-square)](https://civic-ai-audits.github.io/durham-transport/)
[![Deploy](https://img.shields.io/github/actions/workflow/status/civic-ai-audits/durham-transport/deploy.yml?branch=main&style=flat-square&label=deploy)](https://github.com/civic-ai-audits/durham-transport/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.9+-blue?style=flat-square&logo=python)](https://www.python.org/)
[![Node](https://img.shields.io/badge/node-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)

Web-based tool to audit AI-driven transportation safety systems for equity in Durham, NC.

**[🚀 Live Demo](https://civic-ai-audits.github.io/durham-transport/)** | **[📖 Documentation](QUICKSTART.md)** | **[🎯 Hackathon Context](HACKATHON_FACTS.md)**

## Problem Statement

AI tools like Strava Metro and StreetLight Data used by cities for infrastructure planning have documented demographic biases that undercount vulnerable populations. This tool provides a "transparency scorecard" through benchmark tests to evaluate whether these AI tools serve all residents equitably.

## Current Status

**Phase 1 Complete:** Test 1 - Volume Estimation Equity Audit

- Durham map with census tract demographic overlays
- Compare AI estimates vs ground truth counter data
- 4 ECharts visualizations showing bias by income and race

## Quick Start

### View Live Site

Visit **[civic-ai-audits.github.io/durham-transport](https://civic-ai-audits.github.io/durham-transport/)**

The site updates automatically via scheduled data pipeline (Mondays 6 AM UTC).

### Local Development

#### Prerequisites
- Python 3.9+
- Node.js 20+

#### Setup

```bash
# Install dependencies
cd backend && pip install -r requirements.txt
cd ../frontend && npm install
```

#### Generate Data Locally

```bash
# Run data pipeline
python scripts/fetch_durham_data.py
python scripts/simulate_ai_predictions.py
python scripts/generate_static_data.py
```

#### Run Frontend Dev Server

```bash
cd frontend
npm run dev
```

Open browser to: http://localhost:5173

#### Build for Production

```bash
cd frontend
npm run build
```

Static files output to `frontend/dist/`

## Architecture

### Static Site with Automated Pipeline

- **Data Pipeline:** Python + GeoPandas (runs weekly via GitHub Actions)
- **Frontend:** Vanilla JS + Vite + Apache ECharts + Leaflet.js
- **Deployment:** GitHub Pages (gh-pages branch)
- **Data:** Durham census data + simulated AI predictions with documented bias

### How It Works

1. **Data Pipeline** (`data-pipeline.yml`) runs weekly:
   - Fetches Durham census data (238 tracts)
   - Simulates AI predictions with documented bias patterns
   - Generates static JSON files (8 files, ~680 KB total)
   - Uploads as artifacts (30-day retention)

2. **Deploy Workflow** (`deploy.yml`) runs after pipeline:
   - Downloads latest data artifacts
   - Builds Vite frontend with data
   - Deploys to gh-pages branch

**Benefits:** Always-available static site, no runtime costs, automatic updates, clean git history.

See [DATA_PIPELINE.md](DATA_PIPELINE.md) for details.

## Test 1: Volume Estimation Equity Audit

Evaluates whether AI volume estimation tools (like Strava Metro) accurately predict pedestrian and cyclist volumes across all demographic groups.

**Visualizations:**

1. **Geographic Distribution Map** - Choropleth showing prediction errors by census tract
2. **Accuracy by Income** - Bar chart comparing error rates across income quintiles
3. **Accuracy by Race** - Bar chart comparing error rates by minority percentage
4. **Predicted vs Actual** - Scatter plot with bias regression line
5. **Error Distribution** - Histogram of prediction errors

**Key Findings:**

- Low-income areas (Q1-Q2) undercounted by ~25% on average
- High-income areas (Q4-Q5) overcounted by ~8% on average
- High-minority areas (>60%) have 20% worse accuracy

## Future Tests

- **Test 2:** Crash Prediction Bias Audit
- **Test 3:** Infrastructure Recommendation Audit
- **Test 4:** Suppressed Demand Analysis

## Project Structure

```
durham-transport-safety-audit/
├── backend/
│   ├── app.py                    # Flask API server
│   ├── config.py
│   ├── api/
│   │   └── routes_test1.py      # Test 1 endpoints
│   ├── models/
│   │   └── volume_estimator.py  # Test 1 analysis
│   └── utils/
│       ├── demographic_analysis.py
│       └── geospatial.py
├── frontend/
│   ├── src/
│   │   ├── main.js
│   │   ├── components/
│   │   │   └── common/
│   │   │       └── DurhamMap.js
│   │   └── services/
│   │       ├── api.js
│   │       └── chartConfig.js
│   └── public/
│       └── index.html
└── scripts/
    ├── fetch_durham_data.py
    └── simulate_ai_predictions.py
```

## Data Files

All data is pre-generated and served as static JSON files from `frontend/public/data/`:

### Test 1 Files

- `census-tracts.json` - 238 Durham census tracts with geometries (~313 KB)
- `counter-locations.json` - 15 counter locations with predictions (~3.3 KB)
- `report.json` - Complete audit report with findings (~17 KB)
- `choropleth-data.json` - Tract-level error data for map (~332 KB)
- `accuracy-by-income.json` - Income quintile analysis (~1.5 KB)
- `accuracy-by-race.json` - Racial composition analysis (~1.1 KB)
- `scatter-data.json` - Predicted vs actual data points (~11 KB)
- `error-distribution.json` - Error histogram data (~2 KB)
- `metadata.json` - Generation metadata with verification hash (~300 B)

**Total:** ~680 KB (uncompressed), ~180 KB (gzipped)

## Data Sources

- **Census Demographics:** US Census Bureau ACS 5-Year Estimates (2022)
- **Census Tract Boundaries:** TIGER/Line Shapefiles
- **Counter Data:** Simulated (2-3 real locations + 12 simulated)
- **AI Predictions:** Simulated with documented bias patterns

Bias calibrated to research literature:
- Low-income undercount: 25%
- High-income overcount: 8%
- High-minority undercount: 20%

## Contributing

### Running the Data Pipeline Locally

```bash
# Generate census data
python scripts/fetch_durham_data.py

# Simulate AI predictions
python scripts/simulate_ai_predictions.py

# Generate static files
python scripts/generate_static_data.py
```

### Triggering GitHub Actions

```bash
# Manually run data pipeline
gh workflow run data-pipeline.yml --repo civic-ai-audits/durham-transport

# Manually deploy to gh-pages
gh workflow run deploy.yml --repo civic-ai-audits/durham-transport

# Check workflow status
gh run list --repo civic-ai-audits/durham-transport --limit 5
```

### Adding New Tests

1. Create backend model in `backend/models/`
2. Add data generation script in `scripts/`
3. Update `scripts/generate_static_data.py` to export new data
4. Create frontend visualizations in `frontend/src/`
5. Update this README

See the implementation plan for Test 2-4 specifications.

## License

MIT License - see [LICENSE](LICENSE) file for details.
