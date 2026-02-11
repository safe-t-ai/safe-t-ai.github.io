# SAFE-T: Safety Algorithm Fairness Evaluation for Transportation

[![Pipeline Status](https://img.shields.io/github/actions/workflow/status/safe-t-ai/safe-t-ai.github.io/data-pipeline.yml?branch=main&label=pipeline&style=classic)](https://github.com/safe-t-ai/safe-t-ai.github.io/actions/workflows/data-pipeline.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=classic)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.9+-blue?logo=python&style=classic)](https://www.python.org/)
[![Node](https://img.shields.io/badge/node-18+-green?logo=node.js&style=classic)](https://nodejs.org/)

Auditing framework for evaluating equity and fairness in AI-driven transportation safety systems.

**[Live Demo](https://safe-t-ai.github.io/)**

## Overview

AI tools like Strava Metro and StreetLight Data are increasingly used by cities for infrastructure planning, but have documented demographic biases that undercount vulnerable populations. SAFE-T provides benchmark tests to evaluate whether these AI tools serve all residents equitably.

## Tests

### Volume Estimation

Evaluates whether AI volume estimation tools accurately predict pedestrian and cyclist volumes across all demographic groups.

**Finding:** Low-income areas undercounted by ~25%, high-income areas overcounted by ~8%, with high-minority areas showing 20% worse accuracy overall.

### Crash Prediction

Evaluates whether AI crash prediction models maintain consistent accuracy across income levels when forecasting safety outcomes.

**Finding:** AI prediction error significantly higher in low-income areas, with poorest quintile showing systematically worse model performance, leading to underallocation of safety resources.

### Infrastructure

Evaluates whether AI-driven infrastructure recommendation systems allocate safety budgets equitably.

**Finding:** AI allocation shows 29.5% disparate impact ratio (Q1 receives 29.5% as much per-capita as Q5), failing the 80% threshold. Need-based allocation achieves 83.8%, demonstrating feasible equity improvements.

### Suppressed Demand

Evaluates whether AI tools detect latent transportation demand in areas with poor infrastructure that suppresses observed usage.

**Finding:** Standard AI tools fail to detect suppressed demand, showing low correlation with potential need. Poor infrastructure in low-income areas masks actual demand, perpetuating underinvestment.

## Quick Start

```bash
# Install dependencies
make install

# Generate data and start dev server
make setup
make dev

# Open http://localhost:5173
```

## Architecture

- **Stack:** Python + GeoPandas + Vite + ECharts + Leaflet.js
- **Deployment:** Static site on GitHub Pages
- **Data Pipeline:** Automated via GitHub Actions

The data pipeline fetches Durham census data (238 tracts), simulates AI predictions with documented bias patterns, generates static JSON files, and automatically deploys.

## Project Structure

```
durham-transport/
├── backend/
│   ├── models/           # Analysis models (4 tests)
│   ├── tests/            # Pytest suite (48 tests, 64% coverage)
│   ├── utils/            # Demographic & geospatial analysis
│   └── config.py         # Centralized configuration
├── frontend/
│   ├── src/              # Test implementations + visualizations
│   └── public/           # Static site files
├── scripts/              # Data pipeline scripts
└── .github/workflows/    # CI/CD automation
```

## Data Sources

- **Census:** US Census Bureau ACS 5-Year Estimates (2022)
- **Boundaries:** TIGER/Line Shapefiles
- **Crash Data:** Simulated, validated against NCDOT Vision Zero API
- **AI Predictions:** Simulated with bias patterns from research literature

## Development

### Quality Checks

```bash
# Run tests with coverage (fails if <60%)
make test

# Run linting
make lint

# Auto-fix lint issues
make lint-fix

# Run all pre-commit hooks
make hooks
```

### Pre-commit Hooks

Hooks run automatically on `git commit`:
- Pytest with coverage enforcement
- ESLint
- Trailing whitespace removal
- YAML/JSON validation

Install: `make install-hooks` (included in `make setup`)

### CI/CD

```bash
# Trigger data pipeline manually
gh workflow run data-pipeline.yml
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
