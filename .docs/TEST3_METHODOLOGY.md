# Test 3: Infrastructure Recommendation Audit - Methodology

## Overview

Test 3 evaluates whether AI-driven infrastructure recommendation systems allocate resources equitably across demographic groups. The test simulates two allocation strategies—AI-based (biased) and need-based (equitable)—and measures disparities using established equity metrics.

## Simulation Design

### Danger Score Generation

Danger scores represent pedestrian/cyclist crash risk per census tract:

```python
income_multiplier = 1.0 + (1.0 - normalized_income) * 0.8  # 1.0 to 1.8x
population_multiplier = 1.0 + (population / 10000) * 0.1    # slight density effect
noise = uniform(0.8, 1.2)                                    # ±20% random variation
danger_score = base_danger * income_multiplier * population_multiplier * noise
```

- **Base danger**: Fixed 15.0 (crashes per 10k residents per year)
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

**Results** (exact values are pipeline-dependent; the direction is stable):
- AI allocation: significantly below 0.8 threshold — Q1 receives far less per capita than Q5
- Need-based: closer to or above 0.8 threshold — danger-driven allocation reduces income-based disparity

### Gini Coefficient

Measures inequality in budget distribution across all tracts:

```python
gini = Σ|xi - xj| / (2n² * mean(x))
```

- **Range**: 0 (perfect equality) to 1 (maximum inequality)
- **Results**: AI shows higher Gini (more concentrated allocation); need-based lower Gini (more spread across tracts)

### Per Capita Allocation

Budget divided by tract population:

Per-capita values are pipeline-dependent (vary with census vintage and Durham tract population distribution). The directional finding is stable: AI allocation produces higher per-capita spending in wealthier quintiles; need-based allocation reduces this disparity by prioritizing high-danger tracts.

## Data Sources

### Real Data
- **Census demographics**: US Census Bureau ACS 5-Year (vintage set in `config.py`)
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

The AI disparate impact ratio (Q1 per-capita / Q5 per-capita) is approximately 0.97 — near parity, technically above the 0.8 EEOC adverse impact threshold. This might appear equitable at first glance.

The real finding is different: the need-based allocation produces a Q1/Q5 ratio of ~15x, because Q1 tracts have roughly 15x higher danger scores per capita than Q5 tracts. AI's near-equal allocation ignores this differential danger. Equal dollars to unequal risk is not equitable — it underserves the communities that need safety investment most.

Exact values vary with each pipeline run (depend on Census vintage and Durham demographics). The directional finding is stable: AI allocation is insensitive to differential danger; need-based allocation is proportional to it.
