# SAFE-T Test Specifications

## Test 1: Volume Estimation Equity Audit

### Overview

Evaluates whether AI volume estimation tools (like Strava Metro, StreetLight Data) accurately predict pedestrian and cyclist volumes across all demographic groups, or if they systematically undercount in disadvantaged areas.

### Methodology

**Data Sources:**
- Durham census tract demographics (238 tracts)
- Simulated bike/pedestrian counter data (15 locations)
- AI predictions with documented bias patterns

**Bias Patterns:**
- Low-income areas: 25% undercount
- High-income areas: 8% overcount
- High-minority areas: 20% worse accuracy

**Analysis:**
- Calculate prediction error by demographic group
- Compare error rates across income quintiles (Q1-Q5)
- Analyze correlation between minority percentage and error
- Generate equity gap metrics

### Visualizations

1. **Geographic Distribution Map**
   - Choropleth showing prediction error % by census tract
   - Color scale: red (undercounted) to blue (overcounted)
   - Hover tooltips with tract demographics

2. **Accuracy by Income Quintile**
   - Bar chart comparing MAE, MAPE, bias across quintiles
   - Shows systematic undercount in Q1-Q2, overcount in Q4-Q5
   - Error bars showing variance

3. **Accuracy by Racial Composition**
   - Bar chart for Low/Medium/High minority percentage areas
   - Demonstrates worse accuracy in high-minority areas

4. **Predicted vs Actual Scatter Plot**
   - Points colored by income quintile
   - Regression line showing bias trend
   - Perfect prediction reference line (y=x)

5. **Error Distribution Histogram**
   - Distribution of prediction errors across all counters
   - Bins: -50% to +50% in 5% increments
   - Shows skew toward undercount

### Key Findings

| Metric | Low-Income (Q1-Q2) | High-Income (Q4-Q5) | Gap |
|--------|-------------------|---------------------|-----|
| **Bias** | -25% (undercount) | +8% (overcount) | 33% |
| **MAE** | 28 trips/day | 12 trips/day | 2.3x worse |
| **MAPE** | 32% | 15% | 2.1x worse |

**Demographic Correlation:**
- Income vs Error: r = -0.65 (higher income → lower error)
- Minority % vs Error: r = 0.58 (higher minority → higher error)

**Equity Implications:**
- Low-income infrastructure needs systematically undercounted
- Resource allocation biased toward already well-served areas
- AI amplifies existing infrastructure inequality

### Data Files

- `report.json` - Complete audit report (17 KB)
- `counter-locations.json` - Counter data with predictions (3.3 KB)
- `accuracy-by-income.json` - Quintile analysis (1.5 KB)
- `accuracy-by-race.json` - Racial composition analysis (1.1 KB)
- `scatter-data.json` - Scatter plot data (11 KB)
- `error-distribution.json` - Histogram data (2 KB)
- `choropleth-data.json` - Map data (332 KB)
- `census-tracts.json` - Tract geometries (313 KB)

---

## Test 3: Infrastructure Recommendation Audit

Evaluates whether AI-driven infrastructure recommendation systems allocate safety improvement budgets equitably, or optimize for metrics that favor already well-served areas. Compares AI allocation (biased by volume predictions) against need-based allocation (driven by danger scores and real infrastructure gaps from OpenStreetMap).

See [TEST3_METHODOLOGY.md](TEST3_METHODOLOGY.md) for simulation design, equity metric formulas, and validation details.

### Data Files

- `infrastructure-report.json` - Complete audit
- `danger-scores.json` - Tract danger scores with geometry
- `recommendations.json` - AI/need-based projects
- `budget-allocation.json` - Equity metrics

---

## Test 2: Crash Prediction Bias Audit

**Status:** Backend complete, frontend in development

### Overview

Evaluates whether AI crash prediction models accurately predict danger across all demographics, or if they learn enforcement/reporting bias patterns.

### Core Issue

**The Problem:** Police-reported crash data has systematic underreporting in low-income areas (60% reporting rate vs 90% in wealthy areas). AI models trained on this biased data learn to predict where crashes are *reported*, not where they *occur*.

### Methodology

**Data:**
- Real NCDOT crash data (years configured in `config.CRASH_ANALYSIS_YEARS`)
- Temporal split: Train on `CRASH_TRAINING_YEARS`, test on `CRASH_TEST_YEARS`
- Features: Income, minority %, population density, historical crashes

**Analysis:**
1. Generate ground truth crashes (income-correlated)
2. Simulate reporting bias (income-dependent)
3. Train AI on biased reported data
4. Compare predictions to ground truth

**Expected Findings:**
- AI shows 25-40% higher MAE in Q1 vs Q5
- False negative rate 2-3x higher in low-income areas
- ROC AUC 0.15-0.20 points lower in high-minority areas

### Planned Visualizations

1. Geographic crash distribution map
2. Confusion matrices by income quintile
3. Prediction error by income quintile
4. Time series (actual vs reported vs predicted)
5. Error metrics dashboard

### Implementation Status

- ✅ Backend model (`backend/models/crash_predictor.py`)
- ✅ Data simulation (`scripts/simulate_crash_predictions.py`)
- ⏳ Static data export
- ⏳ Frontend visualizations

---

## Test 4: Suppressed Demand Analysis

**Status:** Backend complete, frontend in development

### Overview

Detects whether AI systems capture only observed behavior and miss latent demand in underserved areas where poor infrastructure suppresses usage.

### Core Issue

**The Problem:** AI trained on observed bike/ped counts in areas with poor infrastructure learns that those areas have "low demand," creating a self-fulfilling prophecy where they never get improvements.

### Methodology

**Suppressed Demand Model:**
```
latent_demand = base_demand × demographics
suppression_rate = f(infrastructure_quality, safety, connectivity)
observed_demand = latent_demand × (1 - suppression_rate)
ai_detected_demand = observed_demand × detection_accuracy
```
Infrastructure quality scores derived from real OpenStreetMap pedestrian/cyclist feature density per census tract.

**Analysis:**
1. Estimate latent demand from demographics
2. Calculate infrastructure-based suppression (using OSM density scores)
3. Simulate AI detection accuracy
4. Compare AI allocations to true need

### Planned Visualizations

1. Geographic suppressed demand map
2. Demand funnel (latent → suppressed → observed → detected)
3. Correlation matrix (demand vs infrastructure vs demographics)
4. Detection scorecard by area type
5. Network flow diagram

### Expected Findings

- 40-60% suppression in low-income areas
- AI detects only 30-50% of latent demand
- Correlation with infrastructure quality: r > 0.7
- Resource allocation 2-3x worse than true need

### Implementation Status

- ✅ Backend model (`backend/models/demand_analyzer.py`)
- ✅ Data simulation (`scripts/analyze_suppressed_demand.py`)
- ⏳ Static data export
- ⏳ Frontend visualizations
