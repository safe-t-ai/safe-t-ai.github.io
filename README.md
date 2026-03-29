# SAFE-T: Safety Algorithm Fairness Evaluation for Transportation

[![Deploy](https://img.shields.io/github/actions/workflow/status/safe-t-ai/safe-t-ai.github.io/deploy.yml?branch=main&label=deploy&logo=github&style=classic)](https://github.com/safe-t-ai/safe-t-ai.github.io/actions/workflows/deploy.yml)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC_BY_4.0-blue.svg?style=classic)](LICENSE)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-blue.svg?style=classic)](LICENSE-CODE)
[![Python](https://img.shields.io/badge/python-3.9+-blue?logo=python&style=classic)](https://www.python.org/)

> Auditing framework for evaluating equity and fairness in AI-driven transportation safety systems. Duke University.

**[Live Demo](https://safe-t-ai.github.io/)**

---

## What it does

AI-powered transportation tools increasingly drive safety budgets, crash predictions, and infrastructure priorities. This audit tests whether those tools treat Durham's communities equitably across four tests measuring how income and race correlate with AI accuracy, resource allocation, and demand visibility.

## How it works

```
Durham census demographics (ACS) + NCDOT crash records + OpenStreetMap infrastructure
  → four equity audits:
      1. Volume Estimation   — do AI tools undercount pedestrians/cyclists in low-income areas?
      2. Crash Prediction    — does AI model error vary systematically by income quintile?
      3. Infrastructure      — does AI-driven budget allocation fail the 80% disparate impact threshold?
      4. Suppressed Demand   — does AI miss latent demand masked by poor infrastructure?
  → static JSON published to GitHub Pages → interactive dashboard
```

## Notebooks

Run in order. Each notebook publishes its artifacts back to this repo automatically.

| Notebook | What it does | Runtime | |
|----------|-------------|---------|---|
| [`01_fetch_data.ipynb`](notebooks/01_fetch_data.ipynb) | Fetch Census demographics, NCDOT crashes, OSM infrastructure | CPU, ~10 min | [![Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/safe-t-ai/safe-t-ai.github.io/blob/main/notebooks/01_fetch_data.ipynb) |
| [`02_test1_volume_estimation.ipynb`](notebooks/02_test1_volume_estimation.ipynb) | Simulate AI volume bias + generate Test 1 frontend data | CPU, ~5 min | [![Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/safe-t-ai/safe-t-ai.github.io/blob/main/notebooks/02_test1_volume_estimation.ipynb) |
| [`03_test2_crash_prediction.ipynb`](notebooks/03_test2_crash_prediction.ipynb) | Train crash model on real NCDOT data + generate Test 2 frontend data | CPU, ~5 min | [![Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/safe-t-ai/safe-t-ai.github.io/blob/main/notebooks/03_test2_crash_prediction.ipynb) |
| [`04_test3_infrastructure.ipynb`](notebooks/04_test3_infrastructure.ipynb) | Simulate infrastructure allocation + generate Test 3 frontend data | CPU, ~5 min | [![Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/safe-t-ai/safe-t-ai.github.io/blob/main/notebooks/04_test3_infrastructure.ipynb) |
| [`05_test4_suppressed_demand.ipynb`](notebooks/05_test4_suppressed_demand.ipynb) | Analyze suppressed demand + generate Test 4 frontend data + data manifest | CPU, ~5 min | [![Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/safe-t-ai/safe-t-ai.github.io/blob/main/notebooks/05_test4_suppressed_demand.ipynb) |

## Repo structure

```
safe-t-ai.github.io/
├── backend/
│   ├── models/        # Analysis models (4 tests)
│   ├── tests/         # Pytest suite
│   ├── utils/         # Demographic & geospatial analysis
│   └── config.py      # Centralized configuration
├── frontend/
│   ├── src/           # Test implementations + visualizations
│   └── public/        # Static site files
└── notebooks/         # Colab-ready data pipeline (replaces scripts)
```

## Setup

```bash
pip install -r backend/requirements.txt
cd frontend && npm install
```

Colab notebooks are self-contained. Open any notebook via the badge above and run all cells.

## Colab setup

The notebooks share setup via `notebooks/colab_utils.py`. Notebooks that publish artifacts require a `GITHUB_TOKEN_SAFET` Colab secret. Notebook 01 additionally requires `CENSUS_API_KEY`.

**Setting up the GitHub token (one-time):**

Create a [fine-grained personal access token](https://github.com/settings/tokens?type=beta) with **Contents: Read and Write** permission. Set **Resource Owner** to `safe-t-ai` (the org). Then add it to Colab: open the key icon in the left sidebar → **Secrets** → **Add new secret**, name it `GITHUB_TOKEN_SAFET`, paste the token, and enable notebook access.

<img src="docs/assets/colab-secrets.png" width="420" alt="Colab Secrets panel showing GITHUB_TOKEN_SAFET" />

For Census data (notebook 01), get a free API key at [api.census.gov/data/key_signup.html](https://api.census.gov/data/key_signup.html) and add it as `CENSUS_API_KEY`.

## Team

[Lindsay Gross](https://www.linkedin.com/in/lindsay-gross1/) · [Arnav Mahale](https://www.linkedin.com/in/arnavmahale/) · [Shreya Mendi](https://www.linkedin.com/in/shreya-mendi/) · [Jonas Neves](https://www.linkedin.com/in/jonasnvs/)

Built for **AIPI 540 — Deep Learning Applications**, Spring 2026, Duke University.

## License

[CC BY 4.0](LICENSE) for text and findings. [MIT](LICENSE-CODE) for code.
