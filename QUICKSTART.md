# Durham Transportation Safety AI Audit - Quick Start

## Launch Application (One Command)

```bash
cd durham-transport-safety-audit
./start.sh
```

Then open: **http://localhost:5173**

---

## Manual Start

### Terminal 1 - Backend
```bash
cd durham-transport-safety-audit/backend
python app.py
```
Backend API: http://localhost:5000

### Terminal 2 - Frontend
```bash
cd durham-transport-safety-audit/frontend
npm run dev
```
Frontend: http://localhost:5173

---

## First Time Setup

### Install Dependencies
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Generate Data
```bash
cd backend
python ../scripts/fetch_durham_data.py
python ../scripts/simulate_ai_predictions.py
```

---

## Verify Everything Works

```bash
python test_setup.py
```

Should show: `✓ All checks passed!`

---

## Test API

```bash
# Health check
curl http://localhost:5000/api/health

# Get report
curl http://localhost:5000/api/test1/report | python -m json.tool
```

---

## Project Structure

```
durham-transport-safety-audit/
├── backend/           # Python Flask API
├── frontend/          # Vite + ECharts + Leaflet
├── scripts/           # Data generation
├── README.md          # Full documentation
└── start.sh           # One-command launch
```

---

## What You'll See

1. **Interactive Map** - Durham census tracts colored by AI error rate
2. **Income Analysis** - Bar chart showing bias by income quintile
3. **Race Analysis** - Bar chart showing bias by minority percentage
4. **Scatter Plot** - Predicted vs actual volumes
5. **Histogram** - Distribution of prediction errors

---

## Key Findings

- **Low-income areas:** 33% undercount
- **High-income areas:** 15% overcount
- **High-minority areas:** 33% undercount
- **144% equity gap** between income groups

---

## Stop Servers

Press `Ctrl+C` in both terminal windows

Or:
```bash
pkill -f "python app.py"
pkill -f "vite"
```

---

## Troubleshooting

**Port already in use?**
- Change backend port in `backend/config.py`
- Change frontend port in `frontend/vite.config.js`

**Dependencies missing?**
```bash
cd backend && pip install -r requirements.txt
cd frontend && npm install
```

**Data not found?**
```bash
cd backend
python ../scripts/fetch_durham_data.py
python ../scripts/simulate_ai_predictions.py
```

---

## Documentation

- `README.md` - Project overview
- `DEPLOYMENT.md` - Detailed deployment guide
- `IMPLEMENTATION_SUMMARY.md` - Phase 1 summary
- `PROJECT_STATUS.md` - Current status

---

## Support

Check the backend logs if API fails:
- Terminal 1 will show Flask logs
- Look for error messages

Check browser console if frontend fails:
- F12 → Console tab
- Look for JavaScript errors

---

**Status:** ✅ Phase 1 Complete - Ready for Demo
