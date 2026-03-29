# SAFE-T Project Context

## What This Is

An AI equity auditing framework for government transportation planning. Governments procure AI tools (Strava Metro, StreetLight Data) to predict pedestrian/cyclist volumes and allocate safety infrastructure — with no systematic way to audit whether those tools are equitable across income and racial demographics.

SAFE-T demonstrates four audit methodologies using Durham, NC as a case study.

## Legal Entity

**SAFE-T: Safety Algorithm Fairness Evaluation for Transportation**
- Incorporated as NC nonprofit: March 29, 2026
- NC SOS filing number: 24778873
- NC entity number: C202608801600
- Status: Articles of Incorporation filed (in process)
- Next step: IRS Form 1023 for federal 501(c)(3) tax-exempt status
- Verify status: https://www.sosnc.gov/online_services/search/Profile_Filings/24778873

## Target Submission

**Google.org AI for Government Innovation Challenge**
- URL: https://www.google.org/impact-challenges/ai-government-innovation/
- Deadline: April 3, 2026
- Award: $1M–$3M + Google.org Accelerator (AI strategy, Cloud Credits)
- Requires: documented government buy-in, feasibility, scalability across governments
- Eligible: nonprofits, social enterprises, academic institutions with government partners

## Positioning

The **framework** is the product — not the Durham findings. The value proposition: a replicable audit protocol any city can run against any AI transportation tool using Census + crash data + OSM, all publicly available.

## Data Honesty (Critical for Grant)

Each test has a different empirical basis — never conflate them:

| Test | Real Data | Simulated | Empirical Strength |
|------|-----------|-----------|-------------------|
| 1: Volume | Census demographics | Counter locations, AI predictions, all bias | Weakest — illustrative only |
| 2: Crash | NCDOT crashes 2019–2024, Ridge model | Nothing | Strongest — fully real |
| 3: Infrastructure | OSM infrastructure density, Census | Danger scores, allocation algorithm | Mixed |
| 4: Suppressed Demand | OSM infrastructure density, Census | Potential demand, AI detection models | Mixed |

**Test 2 is the empirical anchor.** Lead with it. Q1 recall = 0.29 vs Q5 recall = 0.67 (real data, real model, real gap).

**Tests 1, 3, 4** are methodology demonstrations — "here is how the audit would be conducted with real vendor data, using bias parameters from research literature." Frame as illustrative, not empirical findings about specific tools.

## Known Model Issues (Fix Before Publishing as Research)

- **Test 1**: Circular — bias is embedded as input parameter, measured as output. Cannot claim this audits Strava/StreetLight. Reframed in UI as methodology validation.
- **Test 2**: Live data branch has Q1 accuracy=57% vs Q5 accuracy=77% (20pp gap); Q1 error=70% vs Q5 error=46% (1.5x). Recall is Q1=71% > Q5=50% — opposite expected direction, so accuracy is the lead metric. Real data, real gap.
- **Test 3**: AI disparate impact ratio is ~0.97 (passes EEOC threshold). Real story: AI ignores 15x differential need. $1.3M allocation gap per $5M cycle. TEST3_METHODOLOGY.md updated.
- **Test 4**: Income gradient is Q1=82.7% > Q5=73.6% (correct direction) but comes from income_factor path, not infrastructure path. OSM per-capita scores are higher in low-income urban Durham — counter-intuitive but real.

## Scalability Story (for Grant Application)

The framework runs on:
- US Census ACS (all US cities)
- State DOT crash databases (all US states have equivalents)
- OpenStreetMap (global)
- No vendor API keys required for the framework itself

One city → any city with public data.
