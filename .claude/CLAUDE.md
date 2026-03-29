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

## Framework Vision

**SAFE-T measures whether AI compounds existing inequity — not just whether AI is biased in isolation.**

The problem is two-layered:
1. **Baseline disparity** (exists before AI): In Durham, Black residents are 32% of the population but 47% of pedestrian and cyclist crash victims (NCDOT, 2019–2023). Low-income neighborhoods already face disproportionate danger.
2. **AI amplification** (what SAFE-T measures): AI transportation tools trained on biased inputs produce biased outputs — undercounting pedestrian volume in low-income areas, predicting crashes less accurately in Q1 tracts, ignoring 15× differential infrastructure need. They direct safety investment away from communities already at greatest risk.

This reframe matters for the grant application and for the product:
- Tests 1, 3, 4 (simulations) are defensible as "here is how AI would compound the known baseline disparity, given documented bias parameters from research literature"
- Test 2 (real data) is the proof that it actually does happen
- The value proposition is not "detect AI bias" but "measure and correct AI amplification of existing inequity before safety budgets are committed"

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
- **Test 2**: Current data: Q1 recall=29% vs Q5 recall=67% — a **38pp recall gap in the correct direction** (AI misses 71% of dangerous tracts in poor areas vs 33% in wealthy areas). Accuracy gap is only 5pp (Q1=64%, Q5=69%) and is not the lead metric. **Use recall as the primary evidence.** Real data, real model, real gap. All application claims now use recall (29%/67%/38pp), not accuracy.
- **Test 3**: AI disparate impact ratio is ~0.97 (passes EEOC threshold). Real story: AI ignores 15x differential need. $1.3M allocation gap per $5M cycle. TEST3_METHODOLOGY.md updated.
- **Test 4**: Income gradient is Q1=82.7% > Q5=73.6% (correct direction) but comes from income_factor path, not infrastructure path. OSM per-capita scores are higher in low-income urban Durham — counter-intuitive but real.

## Scalability Story (for Grant Application)

The framework runs on:
- US Census ACS (all US cities)
- State DOT crash databases (all US states have equivalents)
- OpenStreetMap (global)
- No vendor API keys required for the framework itself

One city → any city with public data.
