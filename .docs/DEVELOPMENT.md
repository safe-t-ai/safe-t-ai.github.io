# Development Guide

## Setup

### Prerequisites
- Python 3.9+
- Node.js 20+
- Git

### Initial Setup

```bash
# Clone repository
git clone https://github.com/safe-t-ai/durham-transport.git
cd durham-transport

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### Environment Variables

Create a `.env` file in the backend directory:

```bash
CENSUS_API_KEY=your_census_api_key_here
```

Get a free Census API key at: https://api.census.gov/data/key_signup.html

## Running Locally

### Option 1: Using Makefile

```bash
# Complete setup
make setup

# Run development servers
make dev

# Run tests
make test

# Build for production
make build
```

### Option 2: Manual Commands

#### Generate Data
```bash
# Fetch Durham census data
python scripts/fetch_durham_data.py

# Simulate AI predictions (Test 1)
python scripts/simulate_ai_predictions.py

# Simulate crash predictions (Test 2)
python scripts/simulate_crash_predictions.py

# Simulate infrastructure recommendations (Test 3)
python scripts/simulate_infrastructure_recommendations.py

# Analyze suppressed demand (Test 4)
python scripts/analyze_suppressed_demand.py

# Generate static JSON files
python scripts/generate_static_data.py
```

#### Run Frontend Dev Server
```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

#### Run Backend API Server (Optional)
```bash
cd backend
python app.py
# Runs on http://localhost:5000
```

## Testing

### Backend Tests

```bash
# Run pytest with coverage
cd backend
pytest tests/ -v --cov=. --cov-report=term-missing

# Run specific test file
pytest tests/test_demographic_analysis.py -v

# Run quick tests (no coverage)
pytest tests/ -v
```

### Frontend Linting

```bash
cd frontend
npm run lint
npm run lint:fix
```

## GitHub Actions

### Data Pipeline Workflow

Runs weekly on Mondays at 6 AM UTC and on push to main.

```bash
# Manually trigger
gh workflow run data-pipeline.yml

# Check status
gh run list --workflow=data-pipeline.yml --limit 5

# View logs
gh run view <run-id> --log
```

### Deploy Workflow

Automatically triggered when data pipeline completes successfully.

```bash
# Manually trigger
gh workflow run deploy.yml

# Check status
gh run list --workflow=deploy.yml --limit 5
```

## Adding New Tests

### Step 1: Create Backend Model

Create a new file in `backend/models/`:

```python
# backend/models/new_test.py
class NewTestAuditor:
    def __init__(self, census_gdf):
        self.census_gdf = census_gdf

    def run_audit(self):
        # Implementation
        return results
```

### Step 2: Add Data Generation Script

Create a new file in `scripts/`:

```python
# scripts/simulate_new_test.py
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / 'backend'))

from models.new_test import NewTestAuditor
# Implementation
```

### Step 3: Update Static Data Generation

Add export logic to `scripts/generate_static_data.py`:

```python
def load_new_test_data():
    # Load and format data
    return data

# Add to main()
new_test_data = load_new_test_data()
# Export JSON files
```

### Step 4: Create Frontend Visualization

Create a new file in `frontend/src/`:

```javascript
// frontend/src/newTest.js
export class NewTest {
    async initialize() {
        // Load data and create visualizations
    }
}
```

Update `frontend/src/main.js` to add new tab.

### Step 5: Update Documentation

- Add test description to README.md
- Add methodology to `.docs/`
- Update ROADMAP.md

## Code Quality

### Pre-commit Checks

```bash
# Run linting
cd frontend && npm run lint

# Run tests
cd backend && pytest tests/ -v

# Check for issues
git status
git diff
```

### Commit Messages

Follow conventional commits format:

```
feat: Add Test 4 suppressed demand analysis
fix: Correct income quintile calculation
docs: Update architecture diagram
chore: Update dependencies
```

## Debugging

### Frontend

```javascript
// Enable debug logging in main.js
window.DEBUG = true;

// Check data loading
console.log(await API.get('/data/report.json'));
```

### Backend

```python
# Add logging
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.debug(f"Processing {len(census_gdf)} tracts")
```

### Common Issues

**Issue:** 404 errors for data files
**Solution:** Run data pipeline, ensure artifacts uploaded

**Issue:** Map not rendering
**Solution:** Check console for Leaflet errors, verify GeoJSON format

**Issue:** Tests failing with import errors
**Solution:** Check PYTHONPATH, use relative imports in tests

## Deployment

### Manual Deploy

```bash
# Build frontend
cd frontend
npm run build

# Preview build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

### Verify Deployment

```bash
# Check workflow status
gh run list --workflow=deploy.yml --limit 1

# View live site
open https://safe-t-ai.github.io/
```

## Resources

- [ECharts Documentation](https://echarts.apache.org/en/index.html)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [Vite Documentation](https://vitejs.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
