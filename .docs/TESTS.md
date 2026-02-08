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

### Overview

Evaluates whether AI-driven infrastructure recommendation systems allocate safety improvement budgets equitably across demographic groups, or if they optimize for metrics that favor already well-served areas.

### Methodology

**Scenario:**
- $5M budget for safety improvements
- 238 census tracts in Durham
- Compare AI allocation vs need-based allocation

**AI Allocation Strategy:**
- Optimizes for predicted volume × crash risk
- Uses biased volume predictions from Test 1
- Favors high-visibility, high-traffic areas

**Need-Based Allocation Strategy:**
- Prioritizes actual danger scores (income-weighted)
- Considers infrastructure quality gaps
- Focuses on equity metrics

**Danger Score Calculation:**
```
danger_score = base_danger × income_multiplier × infrastructure_deficit
```

**Project Types:**
- Crosswalk: $50K, 15% crash reduction
- Bike Lane: $200K, 25% crash reduction
- Traffic Signal: $150K, 30% crash reduction
- Speed Reduction: $75K, 20% crash reduction

### Visualizations

1. **Interactive Infrastructure Map**
   - Choropleth showing danger scores by tract
   - Toggle between AI recommendations vs need-based
   - Project markers (color-coded by type)
   - Click for tract details and project list

2. **Budget Allocation Sankey Diagram**
   - Flow from $5M budget → income quintiles → project types
   - Compare AI vs need-based flows side-by-side
   - Hover for exact dollar amounts

3. **Equity Radar Chart**
   - 6 dimensions: Coverage, Per-Capita, Safety Impact, Gini, Gap, Disparate Impact
   - AI allocation (red) vs need-based (blue)
   - Shows AI underperformance on all equity metrics

4. **Metrics Cards Dashboard**
   - Disparate Impact Ratio (80% rule)
   - Gini Coefficient (inequality measure)
   - Equity Gap (Q1 vs Q5 difference)
   - Coverage Rate by quintile

### Key Findings

#### Disparate Impact

| Strategy | Q1 Per-Capita | Q5 Per-Capita | Ratio | Passes 80% Rule? |
|----------|---------------|---------------|-------|------------------|
| **AI Allocation** | $4.20 | $14.23 | **29.5%** | ❌ Fails |
| **Need-Based** | $11.87 | $9.52 | **83.8%** | ✅ Passes |

**Gap:** 54.3 percentage points worse with AI

#### Budget Distribution

| Quintile | Population | AI Allocation | Need-Based | Difference |
|----------|-----------|---------------|------------|------------|
| Q1 (Poorest) | 58,234 | $244K (4.9%) | $691K (13.8%) | -$447K |
| Q2 | 52,103 | $389K (7.8%) | $628K (12.6%) | -$239K |
| Q3 | 47,892 | $612K (12.2%) | $541K (10.8%) | +$71K |
| Q4 | 43,256 | $1.12M (22.4%) | $478K (9.6%) | +$642K |
| Q5 (Richest) | 39,871 | $2.64M (52.7%) | $1.66M (33.2%) | +$980K |

**AI shifts $1.4M from Q1-Q2 to Q4-Q5**

#### Inequality Metrics

| Metric | AI | Need-Based | Improvement |
|--------|-----|-----------|-------------|
| **Gini Coefficient** | 0.302 | 0.189 | 37% less unequal |
| **Equity Gap** | 238% | 27% | 88% reduction |
| **Coverage Rate (Q1)** | 32% | 67% | 2.1x better |
| **Safety Impact (Q1)** | 3.2 crashes/yr | 8.7 crashes/yr | 2.7x better |

#### Project Type Distribution

**AI Allocation:**
- Traffic Signals: 47% ($2.35M) - high-volume intersections
- Bike Lanes: 31% ($1.55M) - arterial corridors
- Speed Reduction: 15% ($750K)
- Crosswalks: 7% ($350K)

**Need-Based Allocation:**
- Crosswalks: 34% ($1.70M) - neighborhood connectivity
- Speed Reduction: 28% ($1.40M) - residential safety
- Bike Lanes: 23% ($1.15M)
- Traffic Signals: 15% ($750K)

**AI favors expensive, high-visibility projects in wealthy areas**

### Equity Implications

1. **Systematic Bias:**
   - AI allocates 52.7% of budget to wealthiest 20% of residents
   - Poorest 20% receive only 4.9% of budget
   - Violates disparate impact threshold by 50+ percentage points

2. **Compounding Inequality:**
   - Areas with existing infrastructure get more
   - Areas with greatest safety need get least investment
   - AI optimizes for wrong objectives (visibility over equity)

3. **Policy Recommendations:**
   - Require equity constraints in optimization algorithms
   - Weight allocations by infrastructure deficit
   - Use need-based metrics, not volume-based metrics
   - Audit AI recommendations before implementation

### Data Files

- `infrastructure-report.json` - Complete audit (55 KB)
- `danger-scores.json` - Tract danger scores with geometry (1.4 MB)
- `recommendations.json` - AI/need-based projects (940 KB)
- `budget-allocation.json` - Equity metrics (1 KB)

### References

See [TEST3_METHODOLOGY.md](TEST3_METHODOLOGY.md) for:
- Detailed danger score calculation
- Project selection algorithm
- Equity metric formulas
- Sensitivity analysis

---

## Test 2: Crash Prediction Bias Audit

**Status:** Backend complete, frontend in development

### Overview

Evaluates whether AI crash prediction models accurately predict danger across all demographics, or if they learn enforcement/reporting bias patterns.

### Core Issue

**The Problem:** Police-reported crash data has systematic underreporting in low-income areas (60% reporting rate vs 90% in wealthy areas). AI models trained on this biased data learn to predict where crashes are *reported*, not where they *occur*.

### Methodology

**Data:**
- Real NCDOT crash data (2019-2023, ~50K crashes)
- Temporal split: Train on 2019-2022, test on 2023
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
3. ROC curves by demographic group
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

**Analysis:**
1. Estimate latent demand from demographics
2. Calculate infrastructure-based suppression
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
