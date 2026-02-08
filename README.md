# SAFE-T: Safety Algorithm Fairness Evaluation for Transportation

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=flat-square)](https://safe-t-ai.github.io/)
[![Deploy](https://img.shields.io/github/actions/workflow/status/safe-t-ai/safe-t-ai.github.io/deploy.yml?branch=main&style=flat-square&label=deploy)](https://github.com/safe-t-ai/safe-t-ai.github.io/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.9+-blue?style=flat-square&logo=python)](https://www.python.org/)
[![Node](https://img.shields.io/badge/node-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)

Auditing framework for evaluating equity and fairness in AI-driven transportation safety systems.

**[🚀 Live Demo](https://safe-t-ai.github.io/)**

## Overview

AI tools like Strava Metro and StreetLight Data are increasingly used by cities for infrastructure planning, but have documented demographic biases that undercount vulnerable populations. SAFE-T provides benchmark tests to evaluate whether these AI tools serve all residents equitably.

## Tests

### Test 1: Volume Estimation Equity Audit

Evaluates whether AI volume estimation tools accurately predict pedestrian and cyclist volumes across all demographic groups.

**Finding:** Low-income areas undercounted by ~25%, high-income areas overcounted by ~8%, with high-minority areas showing 20% worse accuracy overall.

### Test 3: Infrastructure Recommendation Audit

Evaluates whether AI-driven infrastructure recommendation systems allocate safety budgets equitably.

**Finding:** AI allocation shows 29.5% disparate impact ratio (Q1 receives 29.5% as much per-capita as Q5), failing the 80% threshold. Need-based allocation achieves 83.8%, demonstrating feasible equity improvements.

## Quick Start

### View Live Site

Visit **[safe-t-ai.github.io](https://safe-t-ai.github.io/)**

Updates automatically via scheduled data pipeline (Mondays 6 AM UTC).

### Run Locally

```bash
# Install dependencies
make install

# Generate data and start dev server
make setup
make dev

# Open http://localhost:5173
```

## Architecture

**Stack:** Python + GeoPandas + Vite + ECharts + Leaflet.js
**Deployment:** Static site on GitHub Pages
**Data Pipeline:** Automated weekly via GitHub Actions

The data pipeline fetches Durham census data (238 tracts), simulates AI predictions with documented bias patterns, generates static JSON files, and automatically deploys.

## Project Structure

```
durham-transport/
├── backend/
│   ├── models/           # Analysis models (4 tests)
│   ├── tests/            # Pytest suite (48 tests, >70% coverage)
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

```bash
# Run tests
make test

# Run linting
cd frontend && npm run lint

# Trigger workflows
gh workflow run data-pipeline.yml
gh workflow run deploy.yml
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
