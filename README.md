# Durham Transportation Safety AI Audit Tool

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=flat-square)](https://jonasneves.github.io/durham-transport-safety-audit/)
[![Deploy](https://img.shields.io/github/actions/workflow/status/jonasneves/durham-transport-safety-audit/deploy.yml?branch=main&style=flat-square&label=deploy)](https://github.com/jonasneves/durham-transport-safety-audit/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.9+-blue?style=flat-square&logo=python)](https://www.python.org/)
[![Node](https://img.shields.io/badge/node-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)

Web-based tool to audit AI-driven transportation safety systems for equity in Durham, NC.

**[🚀 Live Demo](https://jonasneves.github.io/durham-transport-safety-audit/)** | **[📖 Documentation](QUICKSTART.md)** | **[🎯 Hackathon Context](HACKATHON_FACTS.md)**

## Problem Statement

AI tools like Strava Metro and StreetLight Data used by cities for infrastructure planning have documented demographic biases that undercount vulnerable populations. This tool provides a "transparency scorecard" through benchmark tests to evaluate whether these AI tools serve all residents equitably.

## Current Status

**Phase 1 Complete:** Test 1 - Volume Estimation Equity Audit

- Durham map with census tract demographic overlays
- Compare AI estimates vs ground truth counter data
- 4 ECharts visualizations showing bias by income and race

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+

### Installation

1. Install Python dependencies:

```bash
cd backend
pip install -r requirements.txt
```

2. Install frontend dependencies:

```bash
cd frontend
npm install
```

### Generate Data

```bash
cd backend
python ../scripts/fetch_durham_data.py
python ../scripts/simulate_ai_predictions.py
```

### Run Application

Terminal 1 - Start backend API:

```bash
cd backend
python app.py
```

Terminal 2 - Start frontend dev server:

```bash
cd frontend
npm run dev
```

Open browser to: http://localhost:5173

## Architecture

- **Backend:** Python + Flask + GeoPandas
- **Frontend:** Vanilla JS + Vite + Apache ECharts + Leaflet.js
- **Data:** Durham census data + simulated AI predictions with documented bias

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

## API Endpoints

### Test 1

- `GET /api/test1/census-tracts` - Durham census tract geometries with demographics
- `GET /api/test1/counter-locations` - Ground truth counter locations
- `GET /api/test1/report` - Complete audit report
- `GET /api/test1/choropleth-data` - Tract-level error data for map
- `GET /api/test1/accuracy-by-income` - Accuracy metrics by income quintile
- `GET /api/test1/accuracy-by-race` - Accuracy metrics by racial composition
- `GET /api/test1/scatter-data` - Predicted vs actual data points
- `GET /api/test1/error-distribution` - Error distribution histogram data

## Data Sources

- **Census Demographics:** US Census Bureau ACS 5-Year Estimates (2022)
- **Census Tract Boundaries:** TIGER/Line Shapefiles
- **Counter Data:** Simulated (2-3 real locations + 12 simulated)
- **AI Predictions:** Simulated with documented bias patterns

Bias calibrated to research literature:
- Low-income undercount: 25%
- High-income overcount: 8%
- High-minority undercount: 20%

## License

MIT
