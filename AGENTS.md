# SAFE-T

SAFE-T checks whether the data and tools behind street-safety spending can see risk in every neighborhood, using Durham, NC. The product is the audit. Test 2 needs only Census ACS, a state DOT's crash records and OpenStreetMap; Tests 1, 3 and 4 need a vendor's outputs.

Describe the work as coverage and accuracy. Do not lead with "equity" or "fairness": the federal SS4A program dropped its equity criteria in 2025. Use "Safety Algorithm Fairness Evaluation for Transportation" only as the project's legal name (the README title and the entity): an NC nonprofit, Articles of Incorporation filed March 29, 2026 ([SOS filing 24778873](https://www.sosnc.gov/online_services/search/Profile_Filings/24778873)).

## Data basis by test

| Test (site tab) | Real | Simulated |
|-----------------|------|-----------|
| 1 Foot traffic | Census demographics | Counters, volume estimates, all bias (`BIAS_PARAMETERS`) |
| 2 Crash history | NCDOT non-motorist crashes 2019–2024, Census | Nothing |
| 3 Budget allocation | Danger scores (NCDOT crashes per 1,000 residents per year), OSM gaps, Census | Allocation tool (`INFRASTRUCTURE_AI_INCOME_WEIGHT` = 0.6 on income) |
| 4 Suppressed demand | OSM infrastructure scores, Census | Potential demand, detection models |

Test 2 is the only measured result. Tests 1, 3 and 4 are protocol demonstrations that run on a vendor's outputs once a city shares them; never present them as findings about Durham.

- **Test 1** is circular: bias is an input parameter and is read back as output. It says nothing about Strava Metro or StreetLight Data.
- **Test 2** predicts each tract's crashes for 2021–2024 from the mean of earlier years; a tract-year is high-risk when its count is above the citywide 2/3 quantile for its year (ties put about a quarter of tract-years above it). Crashes are filtered to `CRASH_NM_TYPES` (pedestrians, wheelchair users, cyclists). The finding is the crash-rate gap: the poorest fifth has 3.2x the rate of the richest (0.83 vs 0.26 per 1,000 residents a year). No detection gap is detectable: 13 of 18 high-risk tract-years flagged in the poorest fifth, 4 of 7 in the richest (Fisher exact, poorest fifth vs the other four fifths, p = 0.77).
- TDI, disability, vehicle availability and bus stops are in `durham_census_tracts.geojson` and on the overview map. No test uses them yet.

## Retracted claim

The team's Google.org AI for Government Innovation Challenge application (submitted April 3, 2026) cites a Test 2 recall gap of 29% (poorest fifth) vs 67% (richest). It is retracted: each quintile used its own median as the high-risk cut, so the quintiles were judged against different thresholds. With the citywide 2/3-quantile cut there is no detectable gap. Do not repeat the old numbers.

## Rejected paths

- StreetLight Data as a real source: unavailable at road-segment level since 2022, only Census block groups. Strava Metro needs an institutional license. Test 1 stays simulated.
- A trained model for Test 2 (ridge regression): replaced by the crash-history baseline that high-injury networks use, so the test audits the method cities apply.

## Commands

`make help` lists the targets. Data is regenerated only by the Colab notebooks in `notebooks/`, which clone into `/content` and commit their outputs back.

## Conventions

- Put simulation parameters in `backend/config.py` and import them where used.
- The frontend reads computed values from the generated JSON; never hardcode a result. Tooltips describe methodology, not specific results, because results change when the notebooks rerun.
- Report JSONs carry a `_provenance` key (data type real, simulated or mixed; sources; parameters). Notebook 05 writes `data-manifest.json`, the registry of output files and their sources; add a new output file there. `PLAUSIBILITY_RANGES` in `backend/config.py` holds expected value ranges and is copied into the manifest.
- Charts start from the factories and `initChart` in `frontend/src/services/chartConfig.js`. Chart titles are HTML headings above the container, not ECharts titles. Hovering a chart element highlights matching tracts through `DurhamMap.highlightByProperty`.
- No inline `style=` attributes except for computed values. System font stack; no web fonts.
