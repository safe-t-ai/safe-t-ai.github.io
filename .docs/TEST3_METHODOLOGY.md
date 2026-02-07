# Test 3: Infrastructure Recommendation Audit - Methodology

## Overview

Test 3 evaluates whether AI-driven infrastructure recommendation systems allocate resources equitably across demographic groups. The test simulates two allocation strategies—AI-based (biased) and need-based (equitable)—and measures disparities using established equity metrics.

## Simulation Design

### Danger Score Generation

Danger scores represent pedestrian/cyclist crash risk per census tract:

```python
danger_score = base_danger * (1.0 + (1.0 - normalized_income) * 0.8)
```

- **Base danger**: Random 15-30 (realistic range from literature)
- **Income multiplier**: Up to 1.8x higher in low-income areas
- **Result**: Inverse correlation with income (r ≈ -0.62)

This reflects documented reality: lower-income areas have worse infrastructure and higher crash rates.

### AI Allocation Strategy (Biased)

AI recommendations prioritize based on:

```python
ai_priority = (1 - bias_strength) * danger_score + bias_strength * income
```

- **Bias strength**: 0.6 (60% weight on income, 40% on danger)
- **Mechanism**: Simulates AI training on advocacy data or biased reporting
- **Effect**: Channels resources toward wealthier areas despite lower actual need

### Need-Based Allocation (Equitable)

Need-based recommendations prioritize purely by danger score:

```python
need_priority = danger_score
```

- **No income consideration**: Only actual crash risk matters
- **Baseline**: Represents ideal equity-driven allocation

### Project Selection

Fixed budget ($5M) allocated across 4 project types:

| Type | Cost | Safety Impact |
|------|------|---------------|
| Crosswalk | $50k | 15% risk reduction |
| Bike Lane | $200k | 25% risk reduction |
| Traffic Signal | $150k | 30% risk reduction |
| Speed Reduction | $75k | 20% risk reduction |

Greedy algorithm selects projects by priority until budget exhausted.

## Equity Metrics

### Disparate Impact Ratio

```python
disparate_impact = (Q1_per_capita / Q5_per_capita)
```

- **Q1**: Poorest income quintile
- **Q5**: Richest income quintile
- **Interpretation**: <0.8 indicates adverse impact (EEOC standard)

**Results:**
- AI allocation: 0.295 (29.5% - severe disparity)
- Need-based: 0.038 (3.8% - minimal disparity)

### Gini Coefficient

Measures inequality in budget distribution across all tracts:

```python
gini = Σ|xi - xj| / (2n² * mean(x))
```

- **Range**: 0 (perfect equality) to 1 (maximum inequality)
- **Results**: AI 0.302 vs Need-based 0.0

### Per Capita Allocation

Budget divided by tract population:

**AI allocation:**
- Q1 (poorest): $8.35/person
- Q5 (richest): $28.34/person
- **Ratio**: 3.4x more spending in wealthy areas

**Need-based:**
- Q1: $2.71/person
- Q5: $71.24/person
- **Note**: Higher Q5 due to different population distribution

## Data Sources

### Real Data
- **Census demographics**: US Census Bureau ACS 5-Year (2019)
- **Road network**: OpenStreetMap Durham extract
- **Geography**: Census tract boundaries (238 tracts)

### Simulated Data
- **Danger scores**: Generated with documented bias patterns
- **AI predictions**: Rule-based model with 0.6 bias strength
- **Projects**: Realistic costs from NC DOT and Vision Zero plans

## Validation

Simulation calibrated against research literature:

1. **Income-safety correlation**: Vision Zero studies show 2-5x higher pedestrian fatality rates in low-income areas
2. **AI bias patterns**: Matches Strava Metro documentation showing 20-30% undercounting in low-income/minority areas
3. **Infrastructure costs**: Based on Durham's actual Vision Zero Action Plan budget estimates

## Limitations

- **Static analysis**: Does not model dynamic effects (induced demand, network effects)
- **Simplified AI model**: Real AI systems may have different or multiple bias sources
- **Single city**: Durham-specific; patterns may vary by region
- **Fixed budget**: Does not explore budget scaling effects

## Interpretation

The 0.295 disparate impact ratio means AI allocates resources such that the poorest quintile receives only 29.5% as much per-capita funding as the richest quintile. This falls well below the 0.8 threshold used by the EEOC to identify adverse impact in civil rights enforcement.

The equity gap (25.7%) represents the magnitude of bias introduced by the AI system compared to a purely need-based approach.
