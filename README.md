# Durham Transportation Safety AI Audit Tool

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=flat-square)](https://civic-ai-audits.github.io/durham-transport/)
[![Deploy](https://img.shields.io/github/actions/workflow/status/civic-ai-audits/durham-transport/deploy.yml?branch=main&style=flat-square&label=deploy)](https://github.com/civic-ai-audits/durham-transport/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.9+-blue?style=flat-square&logo=python)](https://www.python.org/)
[![Node](https://img.shields.io/badge/node-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)

Web-based tool to audit AI-driven transportation safety systems for equity in Durham, NC.

**[🚀 Live Demo](https://civic-ai-audits.github.io/durham-transport/)**

## Problem Statement

AI tools like Strava Metro and StreetLight Data used by cities for infrastructure planning have documented demographic biases that undercount vulnerable populations. This tool provides a "transparency scorecard" through benchmark tests to evaluate whether these AI tools serve all residents equitably.

## Current Status

**Phase 2 Complete:** Tests 1 & 3 Deployed

- **Test 1:** Volume Estimation Equity Audit - Evaluates bias in AI volume predictions
- **Test 3:** Infrastructure Recommendation Audit - Evaluates equity in AI resource allocation
- Tab-based navigation between tests
- 8 ECharts visualizations + 2 interactive maps

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
   - Simulates AI predictions with documented bias patterns (Tests 1 & 3)
   - Generates static JSON files (13 files, ~3.1 MB total)
   - Uploads as artifacts (30-day retention)

2. **Deploy Workflow** (`deploy.yml`) runs after pipeline:
   - Downloads latest data artifacts
   - Builds Vite frontend with data
   - Deploys to gh-pages branch

**Benefits:** Always-available static site, no runtime costs, automatic updates, clean git history.

See [.docs/DATA_PIPELINE.md](.docs/DATA_PIPELINE.md) for pipeline details.

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

## Test 3: Infrastructure Recommendation Audit

Evaluates whether AI-driven infrastructure recommendation systems allocate safety improvement budgets equitably across demographic groups.

**Visualizations:**

1. **Infrastructure Map** - Danger scores with AI/need-based project recommendations (toggleable)
2. **Budget Flow (Sankey)** - $5M allocation across income quintiles
3. **Equity Radar** - Multi-dimensional comparison of AI vs need-based allocation
4. **Metrics Cards** - Disparate impact, Gini coefficient, equity gap

**Key Findings:**

- AI disparate impact: 29.5% (Q1 receives 29.5% as much per-capita as Q5)
- Need-based disparate impact: 3.8% (more equitable baseline)
- Equity gap: 25.7% worse with AI vs need-based allocation
- AI Gini coefficient: 0.302 (higher inequality)

See [.docs/TEST3_METHODOLOGY.md](.docs/TEST3_METHODOLOGY.md) for detailed methodology.

## Future Tests

- **Test 2:** Crash Prediction Bias Audit
- **Test 4:** Suppressed Demand Analysis

## Project Structure

```
durham-transport-safety-audit/
├── backend/
│   ├── app.py                              # Flask API server
│   ├── config.py
│   ├── api/
│   │   └── routes_test1.py                # Test 1 endpoints
│   ├── models/
│   │   ├── volume_estimator.py            # Test 1 analysis
│   │   └── infrastructure_auditor.py      # Test 3 analysis
│   └── utils/
│       ├── demographic_analysis.py
│       └── geospatial.py
├── frontend/
│   ├── src/
│   │   ├── main.js                        # Tab navigation
│   │   ├── test3.js                       # Test 3 implementation
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
    ├── simulate_ai_predictions.py
    ├── simulate_infrastructure_recommendations.py
    └── generate_static_data.py
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

### Test 3 Files

- `infrastructure-report.json` - Complete infrastructure audit report (~55 KB)
- `danger-scores.json` - Census tract danger scores with geometry (~1.4 MB)
- `budget-allocation.json` - AI vs need-based equity metrics (~1 KB)
- `recommendations.json` - Project recommendations (AI/need-based) with geometry (~940 KB)

### Shared Files

- `metadata.json` - Generation metadata with verification hash (~300 B)

**Total:** ~3.1 MB (uncompressed), ~780 KB (gzipped)

## Data Sources

- **Census Demographics:** US Census Bureau ACS 5-Year Estimates (2022)
- **Census Tract Boundaries:** TIGER/Line Shapefiles
- **Crash Data:** Simulated crash data for Durham County (2019-2023) with realistic spatial and temporal patterns
  - Note: Real NCDOT crash data requires institutional access via TEAAS system or manual request
  - Simulated data calibrated to typical Durham County crash volumes and severity distributions
- **AI Predictions (Crashes):** Ridge regression trained on simulated historical crash data with demographic features
- **Counter Data:** Simulated (2-3 real locations + 12 simulated)
- **AI Predictions (Demand):** Simulated with documented bias patterns

Bias patterns calibrated to research literature:
- Crash prediction error disparity: AI shows 25-40% higher MAE in low-income areas
- Demand estimation bias: Low-income undercount 25%, High-income overcount 8%
- High-minority undercount: 20%

## Contributing

### Running the Data Pipeline Locally

```bash
# Generate census data
python scripts/fetch_durham_data.py

# Simulate AI predictions (Test 1)
python scripts/simulate_ai_predictions.py

# Simulate infrastructure recommendations (Test 3)
python scripts/simulate_infrastructure_recommendations.py

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
