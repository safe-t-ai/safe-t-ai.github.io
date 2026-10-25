# SAFE-T: Safety Algorithm Fairness Evaluation for Transportation

[![Deploy](https://img.shields.io/github/actions/workflow/status/safe-t-ai/safe-t-ai.github.io/deploy.yml?branch=main&label=deploy&logo=github&style=classic)](https://github.com/safe-t-ai/safe-t-ai.github.io/actions/workflows/deploy.yml) [![License: CC BY 4.0](https://img.shields.io/badge/License-CC_BY_4.0-blue.svg?style=classic)](LICENSE)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-blue.svg?style=classic)](LICENSE-CODE)
[![Python](https://img.shields.io/badge/python-3.9+-blue?logo=python&style=classic)](https://www.python.org/)

SAFE-T checks whether the data and tools behind street-safety spending can see risk in every neighborhood, using Durham, NC. It runs on Census demographics, North Carolina DOT crash records and OpenStreetMap; another city would use its own state's crash records.

**[Live site](https://safe-t-ai.github.io/)**

## Tests

Results are reported by census tract income quintile.

| Tab | Question | Data |
|-----|----------|------|
| 1 Foot traffic | Do pedestrian and cyclist volume estimates undercount poorer tracts? | Simulated. The gaps come from assumed bias parameters in `backend/config.py`, whose direction follows Roy et al. (2019) on demographic skew in Strava data. It measures no vendor tool. |
| 2 Crash history | Does ranking tracts by past crashes, the method behind high-injury networks, miss high-risk tracts in poorer neighborhoods? | Real NCDOT pedestrian and cyclist crashes, 2019–2024. |
| 3 Budget allocation | Does an allocation tool send safety money where crashes happen? | Danger scores are real (NCDOT crashes per 1,000 residents per year). The allocation tool is simulated (0.6 weight on income, 0.4 on danger, plus a boost that grows with income) and compared with allocation by danger alone. |
| 4 Suppressed demand | Does a demand model miss trips that missing infrastructure suppresses? | Infrastructure scores from OpenStreetMap. Demand and detection models are simulated |

Test 2 is the only measured result. Tests 1, 3 and 4 demonstrate the protocol on simulated tools and say nothing about Durham; they run on a vendor's outputs once a city shares them.

### Test 2 result

The poorest fifth of tracts has 3.2 times the pedestrian and cyclist crash rate of the richest (0.83 vs 0.26 crashes per 1,000 residents a year, 2019–2024). Scooter, skateboard and "other" non-motorist records are excluded; wheelchair users count as pedestrians.

For each year 2021–2024, every tract's crashes are predicted as the mean of all earlier years. A tract-year is high-risk when its count is above the citywide 2/3 quantile for that year, and flagged when its prediction is above the same quantile of predictions. Crash history flagged 13 of 18 high-risk tract-years in the poorest fifth and 4 of 7 in the richest. At this cut no difference is detectable between the poorest fifth and the other four fifths (Fisher exact p = 0.77).

## Notebooks

Run in order in Colab. Each notebook commits its outputs back to this repo.

| Notebook | Produces | |
|----------|----------|---|
| [`01_fetch_data.ipynb`](notebooks/01_fetch_data.ipynb) | Census tracts, NCDOT crashes, OSM infrastructure, NCDOT Transportation Disadvantage Index, GoDurham stops, overview map data | [![Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/safe-t-ai/safe-t-ai.github.io/blob/main/notebooks/01_fetch_data.ipynb) |
| [`02_test1_volume_estimation.ipynb`](notebooks/02_test1_volume_estimation.ipynb) | Test 1 data | [![Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/safe-t-ai/safe-t-ai.github.io/blob/main/notebooks/02_test1_volume_estimation.ipynb) |
| [`03_test2_crash_prediction.ipynb`](notebooks/03_test2_crash_prediction.ipynb) | Test 2 data | [![Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/safe-t-ai/safe-t-ai.github.io/blob/main/notebooks/03_test2_crash_prediction.ipynb) |
| [`04_test3_infrastructure.ipynb`](notebooks/04_test3_infrastructure.ipynb) | Test 3 data | [![Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/safe-t-ai/safe-t-ai.github.io/blob/main/notebooks/04_test3_infrastructure.ipynb) |
| [`05_test4_suppressed_demand.ipynb`](notebooks/05_test4_suppressed_demand.ipynb) | Test 4 data, `data-manifest.json` and `metadata.json` | [![Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/safe-t-ai/safe-t-ai.github.io/blob/main/notebooks/05_test4_suppressed_demand.ipynb) |

To publish without signing in each run, add a `GITHUB_TOKEN_SAFET` Colab secret: a [fine-grained personal access token](https://github.com/settings/tokens?type=beta) with resource owner `safe-t-ai` and **Contents: Read and Write**. Add it under the key icon → **Secrets** in Colab and enable notebook access. Without it, the last cell shows a **Sign in & Publish** button that authorizes through GitHub. Notebook 01 also needs `CENSUS_API_KEY` ([free key](https://api.census.gov/data/key_signup.html)).

Data sources and access are listed in [docs/DATA_ACCESS.md](docs/DATA_ACCESS.md).

## Local development

The site reads committed JSON in `frontend/public/data/`.

```bash
make setup   # Python venv (uv), npm install, pre-commit hooks
make dev     # Vite dev server
make test    # pytest
make help    # all targets
```

## Team

[Lindsay Gross](https://www.linkedin.com/in/lindsay-gross1/) · [Jonas Neves](https://www.linkedin.com/in/jonasnvs/) · [Arnav Mahale](https://www.linkedin.com/in/arnavmahale/) · [Shreya Mendi](https://www.linkedin.com/in/shreya-mendi/)

Built for the **SCAI Hackathon** at Duke University. Submitted to the [Google.org AI for Government Innovation Challenge](https://www.google.org/impact-challenges/ai-government-innovation/) (April 2026).

## License

[CC BY 4.0](LICENSE) for text and findings. [MIT](LICENSE-CODE) for code.
