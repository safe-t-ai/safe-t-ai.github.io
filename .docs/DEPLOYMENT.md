# Durham Transportation Safety AI Audit - Deployment Guide

## Quick Start

### Option 1: Automated Start (Recommended)

```bash
./start.sh
```

This script will:
- Generate data if not exists
- Install frontend dependencies if needed
- Start backend (port 5000) and frontend (port 5173)

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Browser:**
Open http://localhost:5173

## Prerequisites

- Python 3.9+
- Node.js 18+
- pip and npm

## Installation

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Key dependencies:
- Flask 3.0.0 (API server)
- GeoPandas 0.14.1 (geospatial analysis)
- Pandas 2.1.4 (data manipulation)

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

Key dependencies:
- Vite 5.0.8 (dev server)
- ECharts 5.4.3 (visualizations)
- Leaflet 1.9.4 (maps)

### 3. Generate Data

```bash
cd backend
python ../scripts/fetch_durham_data.py
python ../scripts/simulate_ai_predictions.py
```

This creates:
- `data/raw/durham_census_tracts.geojson` (~2.5 MB)
- `data/simulated/ground_truth_counters.json`
- `data/simulated/ai_volume_predictions.json`

## Verification

Run the test script:

```bash
python test_setup.py
```

Should show all ✓ checks passed.

## Architecture

### Backend (Flask API)

**Endpoints:**
- `GET /api/health` - Health check
- `GET /api/info` - Available tests info
- `GET /api/test1/census-tracts` - Durham census tracts GeoJSON
- `GET /api/test1/counter-locations` - Counter locations
- `GET /api/test1/report` - Full audit report
- `GET /api/test1/choropleth-data` - Map visualization data
- `GET /api/test1/accuracy-by-income` - Income quintile analysis
- `GET /api/test1/accuracy-by-race` - Racial composition analysis
- `GET /api/test1/scatter-data` - Scatter plot data
- `GET /api/test1/error-distribution` - Error histogram data

**Port:** 5000

### Frontend (Vite + Vanilla JS)

**Features:**
- Interactive Durham map with Leaflet.js
- 4 ECharts visualizations
- Responsive design
- Real-time data from backend API

**Port:** 5173 (dev server with hot reload)

**Proxy:** `/api` requests proxied to `http://localhost:5000`

## Data Flow

1. **Fetch Durham Data** (`fetch_durham_data.py`)
   - Attempts to fetch from US Census API
   - Falls back to synthetic data generation
   - Creates GeoJSON with 238 census tracts

2. **Simulate AI Predictions** (`simulate_ai_predictions.py`)
   - Generates 15 counter locations
   - Creates ground truth volumes
   - Applies documented bias patterns:
     - Low-income: -25% accuracy
     - High-income: +8% accuracy
     - High-minority: -20% accuracy

3. **Backend Analysis** (`volume_estimator.py`)
   - Loads census and prediction data
   - Enriches with demographics
   - Calculates equity metrics
   - Generates visualizations

4. **Frontend Display** (`main.js`)
   - Fetches data from API
   - Renders interactive map
   - Creates ECharts visualizations
   - Updates metrics display

## Troubleshooting

### Backend won't start

**Error:** Module not found

```bash
cd backend
pip install -r requirements.txt
```

**Error:** Data files not found

```bash
cd backend
python ../scripts/fetch_durham_data.py
python ../scripts/simulate_ai_predictions.py
```

### Frontend won't start

**Error:** npm dependencies missing

```bash
cd frontend
npm install
```

**Error:** Cannot connect to API

- Ensure backend is running on port 5000
- Check `curl http://localhost:5000/api/health`

### Port conflicts

If port 5000 or 5173 are in use:

**Backend:** Edit `backend/config.py` and change `FLASK_CONFIG['port']`

**Frontend:** Edit `frontend/vite.config.js` and change `server.port`

## Production Deployment

### Using Docker (Future)

```bash
docker-compose up
```

### Manual Production

**Backend:**
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

**Frontend:**
```bash
npm run build
# Serve the dist/ folder with nginx or similar
```

## Data Sources

- **Census Demographics:** US Census Bureau ACS 5-Year Estimates (2022)
- **Census Tract Boundaries:** TIGER/Line Shapefiles via TIGER/Web API
- **Counter Data:** Simulated (calibrated to research literature)
- **AI Predictions:** Simulated with documented bias patterns

## Performance

- Backend loads ~2.5 MB GeoJSON in memory
- API responses typically < 500ms
- Frontend initial load < 2s
- Map rendering < 1s for 238 tracts

## Next Steps

### Phase 2: Test 2 - Crash Prediction Bias

- Fetch NC DOT crash data
- Simulate AI crash predictions
- Analyze prediction bias by demographics
- Add new visualizations (heatmaps, time series)

### Phase 3: Test 3 - Infrastructure Recommendations

- Simulate budget allocation scenarios
- Measure equity of AI recommendations
- Create Sankey diagrams
- Add before/after comparisons

### Phase 4: Test 4 - Suppressed Demand

- Model potential vs actual route usage
- Identify underserved corridors
- Network flow visualizations
- Counterfactual analysis
