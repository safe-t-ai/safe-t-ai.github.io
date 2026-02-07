# GitHub Repository Setup & Deployment

## Step-by-Step Guide

### Step 1: Create GitHub Repository

Go to: https://github.com/new

Fill in:
- **Repository name:** `durham-transport-safety-audit`
- **Description:** `AI equity auditing tool for Durham, NC transportation safety systems`
- **Visibility:** Public (required for free GitHub Pages)
- **DO NOT** initialize with README, .gitignore, or license (we already have these)

Click "Create repository"

### Step 2: Add Remote and Push

```bash
# Add GitHub remote (replace with your actual repo URL if different)
git remote add origin https://github.com/civic-ai-audits/durham-transport.git

# Push to GitHub
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to repository settings:
   https://github.com/civic-ai-audits/durham-transport/settings/pages

2. Under "Build and deployment":
   - **Source:** Select "GitHub Actions"

3. Click "Save"

### Step 4: Wait for Deployment

1. Go to Actions tab:
   https://github.com/civic-ai-audits/durham-transport/actions

2. Watch the "Deploy to GitHub Pages" workflow run (~2-3 minutes)

3. Once complete (green checkmark), your site is live!

### Step 5: Access Your Live Site

**Your URL:**
```
https://civic-ai-audits.github.io/durham-transport/
```

Bookmark this URL for easy access.

## What Was Deployed

### Frontend (Static Site)
- Interactive Durham map with 238 census tracts
- 5 visualizations showing AI bias
- Pre-generated static data (no backend needed)
- Total size: ~800 KB

### Static Data Files
All API responses pre-generated as JSON:
- census-tracts.json (313 KB)
- choropleth-data.json (332 KB)
- report.json (17 KB)
- Plus 5 other data files

### How It Works
The frontend automatically detects GitHub Pages and loads from static files instead of API:

```javascript
const IS_GITHUB_PAGES = window.location.hostname.includes('github.io');
```

## Updating the Site

### Make Changes

```bash
# Edit files as needed
# ...

# If you changed backend analysis, regenerate static data
python scripts/generate_static_data.py

# Commit and push
git add .
git commit -m "Update analysis"
git push
```

GitHub Actions will automatically rebuild and redeploy (~2-3 minutes).

## Manual Deployment (Alternative)

If you prefer to deploy manually without GitHub Actions:

```bash
cd frontend
npm run deploy
```

This uses the gh-pages npm package to deploy directly to gh-pages branch.

## Troubleshooting

### Issue: 404 Error on GitHub Pages

**Solution:**
1. Check repo name matches vite.config.js: `/durham-transport-safety-audit/`
2. Verify GitHub Pages is enabled with "GitHub Actions" source
3. Wait 2-3 minutes after push for build to complete

### Issue: Charts/Map Not Loading

**Solution:**
1. Check browser console (F12)
2. Verify static data files exist: `frontend/public/data/*.json`
3. Regenerate if missing: `python scripts/generate_static_data.py`
4. Commit and push

### Issue: GitHub Actions Failing

**Solution:**
1. Check Actions tab for error messages
2. Common issues:
   - Node version (requires 18+)
   - npm dependencies not cached
   - Build path incorrect

Try: Delete cache and re-run workflow

## Repository Structure

```
durham-transport-safety-audit/
├── .github/workflows/deploy.yml    ← Auto-deploy on push
├── frontend/
│   ├── public/data/*.json          ← Static data files
│   ├── src/                        ← Source code
│   └── dist/                       ← Built site (gitignored)
├── backend/                        ← Python backend (for local dev)
├── scripts/
│   └── generate_static_data.py    ← Regenerate static files
└── [documentation files]
```

## GitHub Pages Settings

Recommended settings in Settings → Pages:

- **Source:** GitHub Actions
- **Custom domain:** (optional)
- **Enforce HTTPS:** ✓ (automatically enabled)

## Performance

Your deployed site:
- **Load time:** < 2s on 3G
- **Total size:** ~800 KB (gzipped)
- **Hosting:** Free on GitHub Pages
- **CDN:** Automatically served via GitHub's CDN
- **SSL:** Automatically enabled (HTTPS)

## Repository Badges (Optional)

Add to README.md:

```markdown
[![Deploy](https://github.com/civic-ai-audits/durham-transport/actions/workflows/deploy.yml/badge.svg)](https://github.com/civic-ai-audits/durham-transport/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://civic-ai-audits.github.io/durham-transport/)
```

## Next Steps

1. ✅ Create GitHub repository
2. ✅ Push code
3. ✅ Enable GitHub Pages
4. ✅ Wait for deployment
5. 🎉 Share your live demo URL!

**Live Demo:** https://civic-ai-audits.github.io/durham-transport/
