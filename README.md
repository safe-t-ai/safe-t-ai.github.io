# SAFE-T: Safety Algorithm Fairness Evaluation for Transportation

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=flat-square)](https://safe-t-ai.github.io/)
[![Deploy](https://img.shields.io/github/actions/workflow/status/safe-t-ai/safe-t-ai.github.io/deploy.yml?branch=main&style=flat-square&label=deploy)](https://github.com/safe-t-ai/safe-t-ai.github.io/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.9+-blue?style=flat-square&logo=python)](https://www.python.org/)
[![Node](https://img.shields.io/badge/node-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)

Society-centered auditing framework for evaluating equity and fairness in AI-driven transportation safety systems.

**[🚀 Live Demo](https://safe-t-ai.github.io/)**

## Overview

AI tools like Strava Metro and StreetLight Data are increasingly used by cities for infrastructure planning, but have documented demographic biases that undercount vulnerable populations. SAFE-T provides a "transparency scorecard" through benchmark tests to evaluate whether these AI tools serve all residents equitably.

The framework currently includes two active tests evaluating bias in volume prediction and infrastructure allocation, with comprehensive visualizations showing equity gaps across demographic groups.

## Features

### Test 1: Volume Estimation Equity Audit

Evaluates whether AI volume estimation tools accurately predict pedestrian and cyclist volumes across all demographic groups.

**Visualizations:**
- Geographic distribution map showing prediction errors by census tract
- Accuracy comparisons across income quintiles
- Accuracy comparisons by racial composition
- Predicted vs actual scatter plot with bias regression
- Error distribution histogram

**Key Findings:**
- Low-income areas undercounted by ~25%
- High-income areas overcounted by ~8%
- High-minority areas show 20% worse accuracy

### Test 3: Infrastructure Recommendation Audit

Evaluates whether AI-driven infrastructure recommendation systems allocate safety improvement budgets equitably.

**Visualizations:**
- Interactive map with danger scores and project recommendations
- Budget allocation Sankey diagram ($5M across income quintiles)
- Equity radar comparing AI vs need-based allocation
- Metrics cards showing disparate impact, Gini coefficient, equity gap

**Key Findings:**
- AI disparate impact: 29.5% (Q1 receives 29.5% as much per-capita as Q5)
- Need-based disparate impact: 83.8% (more equitable baseline)
- Equity gap: 25.7 percentage points worse with AI allocation
- AI Gini coefficient: 0.302 (higher inequality)

See [.docs/TEST3_METHODOLOGY.md](.docs/TEST3_METHODOLOGY.md) for detailed methodology.

## Quick Start

### View Live Site

Visit **[safe-t-ai.github.io](https://safe-t-ai.github.io/)**

The site updates automatically via scheduled data pipeline (Mondays 6 AM UTC).

### Run Locally

```bash
# Install dependencies
make install

# Generate data and start dev server
make setup
make dev

# Open http://localhost:5173
```

For detailed development instructions, see [.docs/DEVELOPMENT.md](.docs/DEVELOPMENT.md).

## Architecture

### Technology Stack

- **Backend:** Python 3.9+ with GeoPandas, Pandas, scikit-learn
- **Frontend:** Vanilla JavaScript with Vite, ECharts, Leaflet.js
- **Deployment:** GitHub Pages (static site)
- **CI/CD:** GitHub Actions (automated weekly updates)

### Data Pipeline

The data pipeline runs weekly via GitHub Actions:

1. **Fetch Data:** Downloads Durham census demographics (238 tracts)
2. **Simulate AI:** Generates AI predictions with documented bias patterns
3. **Generate Static Files:** Exports 13 JSON files (~3.1 MB total)
4. **Deploy:** Automatically triggers deployment to GitHub Pages

**Benefits:** Always-available static site, no runtime costs, automatic updates, clean git history.

See [.docs/DATA_PIPELINE.md](.docs/DATA_PIPELINE.md) for pipeline details.

## Project Structure

```
durham-transport/
├── .docs/                         # Documentation
│   ├── DEVELOPMENT.md            # Development guide
│   ├── ROADMAP.md                # Future plans
│   ├── DATA_PIPELINE.md          # Pipeline details
│   └── TEST3_METHODOLOGY.md      # Test 3 methodology
├── .github/workflows/            # CI/CD workflows
│   ├── data-pipeline.yml         # Weekly data generation
│   └── deploy.yml                # GitHub Pages deployment
├── backend/
│   ├── models/                   # Analysis models
│   │   ├── volume_estimator.py   # Test 1
│   │   ├── crash_predictor.py    # Test 2 (backend ready)
│   │   ├── infrastructure_auditor.py  # Test 3
│   │   └── demand_analyzer.py    # Test 4 (backend ready)
│   ├── tests/                    # Pytest test suite
│   ├── utils/                    # Shared utilities
│   └── config.py                 # Centralized configuration
├── frontend/
│   ├── src/
│   │   ├── main.js               # Tab navigation
│   │   ├── test1.js              # Test 1 implementation
│   │   ├── test3.js              # Test 3 implementation
│   │   ├── components/           # Reusable components
│   │   └── services/             # API & chart config
│   └── public/
│       ├── index.html
│       └── data/                 # Static JSON files (gitignored)
└── scripts/
    ├── fetch_durham_data.py
    ├── simulate_ai_predictions.py
    ├── simulate_crash_predictions.py
    ├── simulate_infrastructure_recommendations.py
    ├── analyze_suppressed_demand.py
    └── generate_static_data.py
```

## Data Files

All data is pre-generated and served as static JSON files:

### Test 1 Files
- `census-tracts.json` - Durham census tracts with geometries (313 KB)
- `counter-locations.json` - 15 counter locations with predictions (3.3 KB)
- `report.json` - Complete audit report (17 KB)
- `choropleth-data.json` - Tract-level error data (332 KB)
- `accuracy-by-income.json` - Income quintile analysis (1.5 KB)
- `accuracy-by-race.json` - Racial composition analysis (1.1 KB)
- `scatter-data.json` - Predicted vs actual data (11 KB)
- `error-distribution.json` - Error histogram (2 KB)

### Test 3 Files
- `infrastructure-report.json` - Infrastructure audit report (55 KB)
- `danger-scores.json` - Census tract danger scores (1.4 MB)
- `budget-allocation.json` - Equity metrics (1 KB)
- `recommendations.json` - Project recommendations (940 KB)

**Total:** ~3.1 MB uncompressed, ~780 KB gzipped

## Data Sources

- **Census Demographics:** US Census Bureau ACS 5-Year Estimates (2022)
- **Census Boundaries:** TIGER/Line Shapefiles (2022)
- **Crash Data:** Simulated crash data calibrated to Durham County
  - ✅ Validated against real NCDOT data via [NC Vision Zero API](https://ncvisionzero.org)
  - Real NCDOT data accessible but lacks geocoding for tract-level analysis
  - See [NCDOT Data Access Documentation](docs/NCDOT_DATA_ACCESS.md)
- **AI Predictions:** Simulated with documented bias patterns from research literature
  - Crash prediction: 25-40% higher error in low-income areas
  - Volume estimation: 25% undercount (low-income), 8% overcount (high-income)
  - Minority areas: 20% worse accuracy

## Testing

The project includes comprehensive test coverage:

```bash
# Run backend tests
make test

# Run with coverage report
cd backend && pytest tests/ -v --cov

# Run frontend linting
cd frontend && npm run lint
```

**Test Suite:** 48 tests covering demographic analysis, geospatial operations, temporal validation, and all model implementations.

## Contributing

We welcome contributions! See [.docs/DEVELOPMENT.md](.docs/DEVELOPMENT.md) for:
- Setup instructions
- Development workflow
- Testing guidelines
- Code quality standards

For future plans and roadmap, see [.docs/ROADMAP.md](.docs/ROADMAP.md).

## Documentation

- **[.docs/DEVELOPMENT.md](.docs/DEVELOPMENT.md)** - Development guide
- **[.docs/ROADMAP.md](.docs/ROADMAP.md)** - Project roadmap and future tests
- **[.docs/DATA_PIPELINE.md](.docs/DATA_PIPELINE.md)** - Data pipeline architecture
- **[.docs/TEST3_METHODOLOGY.md](.docs/TEST3_METHODOLOGY.md)** - Test 3 methodology

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with:
- [Apache ECharts](https://echarts.apache.org/) - Data visualization
- [Leaflet.js](https://leafletjs.com/) - Interactive maps
- [Vite](https://vitejs.dev/) - Frontend tooling
- [GeoPandas](https://geopandas.org/) - Geospatial analysis
