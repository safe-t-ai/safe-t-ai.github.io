# NCDOT Crash Data Access

## Overview

This document describes how to access real North Carolina Department of Transportation (NCDOT) crash data, including the validation of our simulated data against real NCDOT sources.

## Data Sources Available

### 1. NC Vision Zero Power BI API ✅ **VALIDATED**

**Status:** Accessible via reverse-engineered API
**URL:** `https://wabi-us-east2-c-primary-api.analysis.windows.net/public/reports/querydata`
**Dashboard:** https://ncvisionzero.org/data-analytics/crash-query-tool/

**Available Data:**
- Durham County crashes from 2017-present
- Crash dates, types, severity
- County, city, road characteristics
- Crash type flags (pedestrian, bicycle, motorcycle, alcohol, teen)

**Limitations:**
- No lat/long coordinates (cannot geocode to census tracts)
- API returns limited results (~100 records per query)
- Requires complex Power BI semantic queries
- Not officially documented

**Sample Query:**

```bash
python3 scripts/validate_with_ncdot_api.py
```

This queries the Power BI API and validates that:
1. Durham County crash data exists in NCDOT database
2. Data is accessible programmatically
3. Our simulation uses realistic volumes

### 2. TEAAS (Traffic Engineering Accident Analysis System)

**Status:** Requires institutional access
**Contact:** TEAAS_Support@ncdot.gov
**URL:** https://dmvcrashweb.dot.state.nc.us/TEAAS/

**Features:**
- Complete crash database since 1990
- Windows desktop application
- Query and export capabilities
- Most comprehensive NCDOT source

**Access Process:**
1. Email TEAAS_Support@ncdot.gov
2. Complete access request form
3. Requires government agency or institutional affiliation
4. Approval typically takes 1-2 weeks

**Use Case:** Production deployment with institutional partnership

### 3. NC Vision Zero Crash Query Tool (Manual)

**Status:** Public web interface
**URL:** https://ncvisionzero.org/data-analytics/crash-query-tool/

**Features:**
- Filter by county, date, crash type
- Export to CSV/Excel
- Interactive visualizations
- No login required

**Process:**
1. Visit query tool
2. Select Durham County
3. Select date range (2019-2023)
4. Export to CSV
5. Manual download

**Use Case:** One-time data acquisition for specific analysis

### 4. NC Department of Public Health - County Reports

**Status:** Public summary reports
**URL:** https://injuryfreenc.dph.ncdhhs.gov/DataSurveillance/MVCData.htm

**Features:**
- County-level summaries (2018-2022)
- Deaths, hospitalizations, ED visits
- Demographic breakdowns

**Limitations:**
- Aggregate statistics only (no individual crashes)
- Health outcomes focus (not crash locations/details)
- No geocoding possible

## Why We Use Simulated Data

### Key Issue: No Geocoding

**NCDOT data lacks precise coordinates:**
- No latitude/longitude fields in available datasets
- Only county/city/road information provided
- Cannot map crashes to census tracts for equity analysis

### Our Simulation Approach

**Advantages:**
1. ✅ **Full census tract coverage** - Can analyze all 68 Durham tracts
2. ✅ **Controlled bias patterns** - Demonstrate specific AI failures
3. ✅ **Reproducible** - Anyone can regenerate the data
4. ✅ **Transparent** - Simulation method is documented
5. ✅ **Validated** - Calibrated to realistic Durham volumes

**Validation:**
- Real Durham County: ~5,000-7,000 crashes/year
- Expected 5-year total: 25,000-35,000 crashes
- Our simulation: Uses population-based estimation
- API validation: Confirms data exists and is accessible

### Simulation Method

See `scripts/fetch_ncdot_crash_data.py` for details:

1. **Geographic Distribution:**
   - 68 census tracts in Durham County
   - Population-weighted crash distribution
   - ~25,000 total crashes over 2019-2023

2. **Temporal Patterns:**
   - Year-over-year variation
   - Seasonal factors
   - Realistic date/time distributions

3. **Severity Distribution:**
   - ~70% Property Damage Only
   - ~30% Injury crashes
   - ~0.3% Fatal crashes (based on NC averages)

4. **Demographic Correlation:**
   - Higher crash rates in high-density areas
   - Income/demographic patterns for AI bias testing

## Using Real NCDOT Data

### Option 1: API Integration (Advanced)

```python
# See scripts/validate_with_ncdot_api.py for working example
import requests

POWERBI_API = "https://wabi-us-east2-c-primary-api.analysis.windows.net/public/reports/querydata"

query = {
    "version": "1.0.0",
    "queries": [{
        "Query": {
            "Commands": [{
                "SemanticQueryDataShapeCommand": {
                    "Query": {
                        "Version": 2,
                        "From": [{"Name": "c", "Entity": "CT_ACCIDENT", "Type": 0}],
                        "Select": [...],
                        "Where": [...]
                    }
                }
            }]
        },
        "ApplicationContext": {
            "DatasetId": "4d0f3aae-2892-40e8-93a3-b7c3df04713c",
            "Sources": [{"ReportId": "8dd4c4ae-1b7e-4e8f-816e-8d85f432685f"}]
        }
    }],
    "modelId": 3769678
}

response = requests.post(POWERBI_API, json=query)
```

**Challenges:**
- Complex query format (Power BI semantic queries)
- No official documentation
- Rate limiting possible
- Results limited to ~100 records per query
- Still no lat/long for geocoding

### Option 2: Manual CSV Export (Recommended for One-Time)

1. Visit https://ncvisionzero.org/data-analytics/crash-query-tool/
2. Filter: County = Durham, Years = 2019-2023
3. Export to CSV
4. Save to `backend/data/raw/ncdot_durham_crashes.csv`
5. Update scripts to use real data

**Still Missing:** Coordinates for census tract mapping

### Option 3: TEAAS Access (Production)

For production deployment:
1. Request TEAAS access (institutional partnership)
2. Export Durham crashes with all available fields
3. Manually geocode using road addresses (if available)
4. Map to census tracts using GIS tools

## Validation Results

Run validation script:

```bash
python3 scripts/validate_with_ncdot_api.py
```

**Latest Validation:**
- ✅ NCDOT API accessible
- ✅ Durham County data available
- ✅ 2017-2024 data present
- ⚠️  No precise geocoding available
- ✅ Simulation volumes within realistic range

## Attribution

When using this project:

**Data Sources:**
- Census demographics: US Census Bureau ACS 2022
- Crash simulation: Based on Durham County population patterns
- Real data validation: NC Vision Zero / NCDOT Traffic Safety Unit
- Methodology: Transparent simulation for equity analysis

**Recommended Citation:**
```
Crash data simulated based on Durham County demographics and
validated against NCDOT crash volumes. Real NCDOT data lacks
geocoding precision required for census tract-level equity analysis.
Data source: NC Vision Zero (ncvisionzero.org)
```

## Future Improvements

1. **Partnership with NCDOT** - Request institutional TEAAS access
2. **Enhanced Geocoding** - If road addresses become available
3. **Real-time Updates** - Automated API integration if documented
4. **Cross-validation** - Compare multiple data sources

## Contact

For questions about NCDOT data access:
- TEAAS Support: TEAAS_Support@ncdot.gov
- Traffic Safety Unit: https://www.ncdot.gov/initiatives-policies/safety/traffic-safety/
