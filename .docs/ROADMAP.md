# SAFE-T Development Roadmap

## Completed

### Phase 1: Foundation (Complete)
- ✅ Durham census data pipeline
- ✅ Basic geospatial utilities
- ✅ Test infrastructure

### Phase 2: Core Tests (Complete)
- ✅ **Test 1:** Volume Estimation Equity Audit
  - 5 visualizations (map, income/race charts, scatter, distribution)
  - Bias patterns: Low-income undercount 25%, high-income overcount 8%
- ✅ **Test 3:** Infrastructure Recommendation Audit
  - 4 visualizations (map, Sankey, radar, metrics cards)
  - AI vs need-based allocation comparison
- ✅ Tab-based navigation
- ✅ Static site deployment to GitHub Pages
- ✅ Automated data pipeline (weekly updates)

### Phase 3: Production Quality (Complete)
- ✅ ESLint configuration
- ✅ Pytest test suite (48 tests, >70% coverage)
- ✅ Pinned dependency versions
- ✅ Parallel CI/CD jobs (24% faster)
- ✅ Consolidated configuration
- ✅ Temporal validation utilities
- ✅ Enhanced GitHub Actions summaries

## In Progress

### Phase 4: Remaining Tests

#### Test 2: Crash Prediction Bias Audit
**Status:** Backend models complete, frontend pending

**Objective:** Evaluate whether AI crash prediction models accurately predict danger across all demographics, or simply reflect enforcement/reporting bias.

**Data Requirements:**
- Real NCDOT crash data (2019-2023)
- Census tract demographics
- Simulated AI predictions with bias

**Visualizations:**
1. Geographic crash distribution map
2. Confusion matrices by income quintile
3. ROC curves by demographic group
4. Time series showing actual vs reported vs predicted crashes
5. Error metrics dashboard

**Key Metrics:**
- Prediction error disparity between income quintiles
- False negative rates in low-income areas
- Reporting bias quantification

**Implementation Files:**
- `backend/models/crash_predictor.py` ✅
- `scripts/simulate_crash_predictions.py` ✅
- `scripts/generate_static_data.py` (add Test 2 export) ⏳
- `frontend/src/test2.js` ⏳

#### Test 4: Suppressed Demand Analysis
**Status:** Backend models complete, frontend pending

**Objective:** Detect whether AI systems capture only observed behavior and miss latent demand in underserved areas.

**Data Requirements:**
- Observed bike/ped volumes
- Infrastructure quality scores
- Demographic data
- Network connectivity analysis

**Visualizations:**
1. Geographic suppressed demand map
2. Demand funnel (latent → suppressed → observed → detected)
3. Correlation matrix (demand vs infrastructure vs demographics)
4. Detection scorecard by area type
5. Network flow diagram

**Key Metrics:**
- Suppressed demand rate by income quintile
- AI detection accuracy for different demand levels
- Infrastructure quality correlation

**Implementation Files:**
- `backend/models/demand_analyzer.py` ✅
- `scripts/analyze_suppressed_demand.py` ✅
- `scripts/generate_static_data.py` (add Test 4 export) ⏳
- `frontend/src/test4.js` ⏳

## Future Enhancements

### Technical Improvements
- [ ] Add real-time NCDOT crash data integration (requires geocoding)
- [ ] Implement caching layer for static data
- [ ] Add comparison mode (multiple cities)
- [ ] Export reports as PDF

### Additional Tests
- [ ] Test 5: Equity in Bike Lane Prioritization
- [ ] Test 6: Parking Enforcement Bias Detection
- [ ] Test 7: Transit Route Optimization Fairness

### Platform Features
- [ ] User-submitted data integration
- [ ] Custom area selection (beyond Durham)
- [ ] API for external tools to use SAFE-T metrics

## Timeline

- **Q1 2026:** Complete Test 2 & 4 frontend implementations
- **Q2 2026:** Add real NCDOT crash data integration
- **Q3 2026:** Multi-city support (Raleigh, Charlotte)
- **Q4 2026:** API and developer tools
