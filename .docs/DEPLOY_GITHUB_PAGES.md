# GitHub Pages Deployment Guide

## Quick Deploy

### 1. Create GitHub Repository

```bash
# Already initialized: git init

# Add remote (replace USERNAME with your GitHub username)
git remote add origin https://github.com/civic-ai-audits/durham-transport.git
```

### 2. Install gh-pages package

```bash
cd frontend
npm install
```

### 3. Commit and push

```bash
git add .
git commit -m "Initial commit: Durham Transportation Safety AI Audit"
git branch -M main
git push -u origin main
```

### 4. Enable GitHub Pages

1. Go to: https://github.com/civic-ai-audits/durham-transport/settings/pages
2. Under "Build and deployment":
   - Source: GitHub Actions
3. The GitHub Action will automatically deploy on push to main

### 5. Access Your Site

After GitHub Actions completes (~2-3 minutes):

**https://civic-ai-audits.github.io/durham-transport/**

## How It Works

### Static Data Generation

The tool uses pre-generated static JSON files for gh-pages:

```bash
# Generate static data (already done)
python scripts/generate_static_data.py
```

This creates 8 JSON files in `frontend/public/data/`:
- census-tracts.json
- choropleth-data.json
- counter-locations.json
- report.json
- accuracy-by-income.json
- accuracy-by-race.json
- scatter-data.json
- error-distribution.json

### Automatic Mode Detection

The frontend (`src/services/api.js`) automatically detects GitHub Pages:

```javascript
const IS_GITHUB_PAGES = window.location.hostname.includes('github.io');
```

- **Local dev:** Uses Flask API at `http://localhost:5000/api`
- **GitHub Pages:** Uses static JSON files at `/data/*.json`

### Build Configuration

Vite config (`vite.config.js`) sets the correct base path:

```javascript
base: process.env.GITHUB_PAGES ? '/durham-transport-safety-audit/' : '/'
```

## Manual Deployment

If you prefer manual deployment:

```bash
cd frontend
npm run deploy
```

This will:
1. Build with `GITHUB_PAGES=true`
2. Deploy to gh-pages branch using gh-pages package

## Updating the Site

After making changes:

```bash
# Regenerate static data if backend changed
python scripts/generate_static_data.py

# Commit and push
git add .
git commit -m "Update analysis"
git push
```

GitHub Actions will automatically rebuild and deploy.

## Testing Locally Before Deploy

### Test with static data:

```bash
cd frontend
GITHUB_PAGES=true npm run build
npm run preview
```

Open: http://localhost:4173

### Test with backend API:

```bash
# Terminal 1
cd backend
python app.py

# Terminal 2
cd frontend
npm run dev
```

Open: http://localhost:5173

## Troubleshooting

### 404 on GitHub Pages

1. Check repository name matches vite.config.js base path
2. Ensure GitHub Pages is enabled with "GitHub Actions" source
3. Check Actions tab for build errors

### Data not loading

1. Check browser console for CORS errors
2. Verify static JSON files exist in `frontend/public/data/`
3. Regenerate: `python scripts/generate_static_data.py`

### Build fails

1. Ensure all dependencies installed: `cd frontend && npm install`
2. Check Node version: `node --version` (need 18+)
3. Try clean build: `rm -rf dist && npm run build`

## GitHub Actions Status

View deployment status:
https://github.com/civic-ai-audits/durham-transport/actions

## Custom Domain (Optional)

To use custom domain:

1. Add CNAME file to `frontend/public/`:
   ```
   echo "your-domain.com" > frontend/public/CNAME
   ```

2. Configure DNS:
   - Add CNAME record pointing to: `jonasneves.github.io`

3. Update in GitHub settings:
   - Settings → Pages → Custom domain

## Architecture

```
GitHub Pages Deployment
├── Static JSON files (frontend/public/data/)
│   └── Pre-generated from Python backend
├── Vite build (frontend/dist/)
│   └── Optimized production bundle
├── GitHub Actions (.github/workflows/deploy.yml)
│   └── Automatic build & deploy on push
└── gh-pages branch
    └── Deployed site content
```

## Performance

- **Total size:** ~800 KB (gzipped)
- **Load time:** < 2s on 3G
- **Data size:** 680 KB JSON (largest: choropleth-data.json)
- **Caching:** All assets cached by GitHub Pages CDN
