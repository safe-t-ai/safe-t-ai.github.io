# Data Pipeline

Automated data pipeline that runs weekly to update Durham transportation safety analysis.

## 🎯 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Data Pipeline (data-pipeline.yml)                          │
│  Trigger: Weekly Mon 6AM UTC / Manual / Push to backend     │
└────────┬─────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────┐
│  Job 1: Fetch Census Data                                   │
│  - Fetch Durham census tracts (238 tracts)                 │
│  - Calculate data hash                                      │
│  - Skip if unchanged (scheduled runs)                       │
└────────┬────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────┐
│  Job 2: Simulate AI Predictions                             │
│  - Generate 15 counter locations                            │
│  - Apply documented bias patterns                           │
│    • Low-income: -25% accuracy                             │
│    • High-income: +8% accuracy                             │
└────────┬────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────┐
│  Job 3: Generate Static Files                               │
│  - Run backend analysis (Flask + GeoPandas)                │
│  - Export 8 JSON files                                     │
│  - Upload as artifacts (30 day retention)                  │
│  - Add metadata (hash, timestamp, commit)                  │
└─────────────────────────────────────────────────────────────┘

         ┌────────────────────────────────────────────────────┐
         │  Deploy Workflow (deploy.yml)                      │
         │  Trigger: Weekly Mon 7AM UTC / Manual / Push       │
         └────────┬───────────────────────────────────────────┘
                  │
                  v
         ┌────────────────────────────────────────────────────┐
         │  Download Latest Data from Pipeline                │
         │  - Fetch static-data-files artifact                │
         │  - From latest successful data-pipeline run        │
         └────────┬───────────────────────────────────────────┘
                  │
                  v
         ┌────────────────────────────────────────────────────┐
         │  Build & Deploy                                    │
         │  - Build Vite frontend with latest data            │
         │  - Deploy directly to gh-pages branch              │
         └────────────────────────────────────────────────────┘
                  │
                  v
         Live at: civic-ai-audits.github.io/durham-transport
```

## 🚀 Quick Start

### Run Pipeline Manually

```bash
# Standard run (skip if data unchanged)
gh workflow run data-pipeline.yml --repo civic-ai-audits/durham-transport

# Force regenerate (even if data unchanged)
gh workflow run data-pipeline.yml \
  --repo civic-ai-audits/durham-transport \
  -f force_regenerate=true
```

Or via web: https://github.com/civic-ai-audits/durham-transport/actions/workflows/data-pipeline.yml

### Check Pipeline Status

```bash
gh run list --repo civic-ai-audits/durham-transport --workflow=data-pipeline.yml --limit 3
```

### View Pipeline Logs

```bash
gh run view <RUN_ID> --repo civic-ai-audits/durham-transport --log
```

---

## 📋 Pipeline Details

### Triggers

1. **Scheduled:** Weekly on Mondays at 6 AM UTC
   - Census data updates quarterly, weekly checks are sufficient
   - Skips if data hasn't changed (saves GitHub Actions minutes)

2. **Push to Main:** Changes to backend or scripts
   - Auto-runs when analysis code changes
   - Regenerates data with new logic

3. **Manual:** workflow_dispatch
   - Run anytime via CLI or web
   - Option to force regenerate

### Smart Caching

Pipeline uses data hashing (like duke-mlk):

```bash
# Calculate hash of census data
HASH=$(sha256sum durham_census_tracts.geojson | cut -c1-16)

# Compare with previous run
if [[ scheduled && HASH == PREV_HASH ]]; then
  echo "Data unchanged, skipping pipeline"
  # Saves ~5-10 minutes of GitHub Actions time
fi
```

**Benefits:**
- Saves GitHub Actions minutes (2,000 free/month)
- Only regenerates when data actually changes
- Can force regenerate anytime if needed

---

## 📊 Generated Files

### Static JSON Files (frontend/public/data/)

| File | Description | Size |
|------|-------------|------|
| `census-tracts.json` | 238 Durham census tracts with geometries | ~313 KB |
| `choropleth-data.json` | Tract-level error data for map | ~332 KB |
| `report.json` | Complete audit report | ~17 KB |
| `accuracy-by-income.json` | Income quintile analysis | ~1.5 KB |
| `accuracy-by-race.json` | Racial composition analysis | ~1.1 KB |
| `scatter-data.json` | Predicted vs actual data points | ~11 KB |
| `error-distribution.json` | Error histogram data | ~2 KB |
| `counter-locations.json` | 15 counter locations | ~3.3 KB |
| `metadata.json` | Generation metadata | ~300 B |

**Total:** ~680 KB (uncompressed), ~180 KB (gzipped)

### Metadata Tracking

Each generation includes verification metadata:

```json
{
  "generated_at": "2026-02-07T16:00:00Z",
  "data_hash": "a1b2c3d4e5f6g7h8",
  "github_run_url": "https://github.com/.../actions/runs/123456",
  "git_sha": "abc123..."
}
```

This enables:
- Reproducibility (know exactly which code/data version)
- Verification (check data integrity with hash)
- Audit trail (track when and why data changed)

---

## 🔧 Pipeline Jobs

### Data Pipeline Workflow (data-pipeline.yml)

#### Job 1: Fetch Census Data

**Purpose:** Get latest Durham census demographics

**Actions:**
- Tries US Census Bureau API (if `CENSUS_API_KEY` secret set)
- Falls back to synthetic data generation
- Calculates hash to detect changes
- Uploads as artifact for next jobs

**Runtime:** ~1-2 minutes

**Skips if:**
- Scheduled run + data hash unchanged

#### Job 2: Simulate AI Predictions

**Purpose:** Generate AI volume predictions with bias

**Actions:**
- Creates 15 counter locations across income spectrum
- Generates ground truth volumes
- Applies documented bias patterns
- Calibrated to research literature

**Runtime:** ~30 seconds

#### Job 3: Generate Static Files

**Purpose:** Run full backend analysis and export results

**Actions:**
- Loads census + simulation data
- Runs VolumeEstimationAuditor
- Calculates all equity metrics
- Exports 8 JSON files
- Uploads as artifacts (30 day retention)
- Adds verification metadata

**Runtime:** ~1-2 minutes

**Total Data Pipeline:** ~3-5 minutes

### Deploy Workflow (deploy.yml)

#### Job: Build & Deploy

**Purpose:** Build frontend with latest data and deploy

**Actions:**
- Downloads latest `static-data-files` artifact from data-pipeline
- Builds Vite frontend with data in public/data/
- Deploys directly to gh-pages branch
- No commits to main branch

**Runtime:** ~30 seconds

**Total Deploy:** ~30 seconds

---

## 📈 Comparison: Pipeline vs Long-Running Server

### Pipeline Approach (Current) ✅

```
Weekly Schedule → Generate Data → Commit → Deploy
     6 min          5 min          1 min    2 min

Total: ~15 minutes/week = 1 hour/month
Cost: FREE (well under 2,000 minutes)
Availability: 24/7 via gh-pages
```

**Pros:**
- ✅ Always available (gh-pages CDN)
- ✅ No runtime costs between updates
- ✅ Fast (CDN-cached static files)
- ✅ Minimal Actions minutes usage
- ✅ Automatic updates when data changes

**Cons:**
- ⚠️ Data refreshes weekly (not real-time)
- ⚠️ Can't do custom user queries

### Long-Running Server (Alternative) ❌

```
GitHub Action → Start Flask → Keep Alive → Shutdown
                             6 hours

Total: 360 minutes per run
Cost: 1 run = 18% of monthly free tier
Availability: Only while running
```

**Pros:**
- ✅ Real-time analysis
- ✅ Can handle custom queries

**Cons:**
- ❌ Limited availability (6-12 hours max)
- ❌ Burns GitHub Actions minutes fast
- ❌ Requires ngrok for public access
- ❌ URL changes each restart
- ❌ Not suitable for production

---

## 🎯 When to Use What

### Use Pipeline (Default)

**Perfect for:**
- ✅ Static datasets that change infrequently (census data)
- ✅ Fixed analysis (pre-defined visualizations)
- ✅ Public demos and sharing
- ✅ Production deployments
- ✅ Cost-conscious projects

**Your use case:** Durham census changes quarterly, analysis is fixed
→ **Pipeline is ideal**

### Use Long-Running Server

**Only if you need:**
- User uploads their own city data
- Custom filters/date ranges
- Real-time "what-if" scenarios
- Dynamic analysis based on user input

**Not your use case** (fixed Durham data, fixed visualizations)

---

## 🔍 Monitoring

### View Last Pipeline Run

```bash
gh run list --repo civic-ai-audits/durham-transport \
  --workflow=data-pipeline.yml \
  --limit 1
```

### Check if Data is Stale

```bash
# Get last update time from metadata
curl -s https://civic-ai-audits.github.io/durham-transport/data/metadata.json | \
  jq -r '.generated_at'
```

### Force Fresh Data

```bash
gh workflow run data-pipeline.yml \
  --repo civic-ai-audits/durham-transport \
  -f force_regenerate=true
```

---

## 🔐 Secrets (Optional)

### CENSUS_API_KEY

Get free API key: https://api.census.gov/data/key_signup.html

Add to repository secrets:
1. Go to: https://github.com/civic-ai-audits/durham-transport/settings/secrets/actions
2. Click "New repository secret"
3. Name: `CENSUS_API_KEY`
4. Value: [your key]

**Benefits:**
- Access live Census API instead of synthetic data
- Higher rate limits
- More reliable data fetching

**Not required:** Pipeline works fine without it (uses synthetic data)

---

## 📊 Cost Analysis

### GitHub Actions Free Tier

- **Monthly limit:** 2,000 minutes
- **Pipeline runtime:** ~6 minutes/run
- **Weekly schedule:** 4 runs/month = 24 minutes
- **Manual runs:** ~5 runs/month = 30 minutes
- **Push triggers:** ~10 runs/month = 60 minutes

**Total: ~114 minutes/month (6% of free tier)** ✅

Compare to long-running server:
- 1 demo = 360 minutes (18% of tier)
- 3 demos/month = 1,080 minutes (54% of tier)
- 6 demos/month = 2,160 minutes (over limit, costs money)

---

## 🎓 Inspired By

This pipeline is modeled after [`duke-mlk/medical-flow`](../../duke-mlk/medical-flow):
- Smart caching with data hashing
- Multi-job workflow with artifacts
- Automated report generation
- Metadata tracking for reproducibility
- **Two-workflow pattern** (data pipeline + deploy)

### Two-Workflow Pattern

Following duke-mlk/medical-flow, we use separate workflows:

**Why Two Workflows?**
1. **No git history pollution:** Data files stored as artifacts, not committed to main
2. **Decoupled processes:** Data generation independent from deployment
3. **No bot trigger issues:** Deploy workflow pulls artifacts (not triggered by bot commits)
4. **Flexible scheduling:** Pipeline runs weekly, deploy can run independently
5. **Clean separation:** Data science work vs frontend deployment

**Key Implementation:**
```yaml
# deploy.yml downloads artifacts from latest pipeline run
- uses: dawidd6/action-download-artifact@v6
  with:
    workflow: data-pipeline.yml
    name: static-data-files
    path: frontend/public/data

# deploy.yml uses peaceiris/actions-gh-pages for direct gh-pages push
- uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_branch: gh-pages
    publish_dir: ./frontend/dist
```

---

## 📚 Additional Resources

- **GitHub Actions docs:** https://docs.github.com/en/actions
- **Census API:** https://www.census.gov/data/developers/data-sets.html
- **Workflow file:** `.github/workflows/data-pipeline.yml`
- **Live site:** https://civic-ai-audits.github.io/durham-transport/
