# Migrate to civic-ai-audits Organization

## Step-by-Step Guide

### Step 1: Create Organization (5 minutes)

1. **Visit:** https://github.com/organizations/plan

2. **Fill in:**
   - **Organization account name:** `civic-ai-audits`
   - **Contact email:** [your email]
   - **This organization belongs to:** My personal account
   - **Plan:** Free (for public repos)

3. **Click:** "Create organization"

4. **Configure Profile:**
   - **Display name:** Civic AI Audits
   - **Description:** Open-source AI auditing tools for civic equity. Building transparency into algorithmic systems that affect public infrastructure and services.
   - **Website:** https://civic-ai-audits.github.io
   - **Location:** Durham, NC (optional)
   - **Email:** [your public email]

5. **Add Topics** (go to org profile page):
   - civic-tech
   - ai-ethics
   - algorithmic-accountability
   - open-data
   - transparency
   - equity
   - geospatial

---

### Step 2: Transfer Repository

Once org is created, run these commands:

```bash
# Navigate to project directory
cd durham-transport-safety-audit

# Transfer repo to organization and rename
gh repo rename durham-transport --yes

# Transfer ownership to org
gh api -X POST /repos/jonasneves/durham-transport/transfer \
  -f new_owner='civic-ai-audits' \
  -f new_name='durham-transport'
```

**Or use web interface:**
1. Go to: https://github.com/civic-ai-audits/durham-transport/settings
2. Scroll to "Danger Zone"
3. Click "Transfer"
4. Enter: `civic-ai-audits/durham-transport`
5. Confirm transfer

---

### Step 3: Update Configuration (Automatic)

After transfer, run the migration script:

```bash
./scripts/migrate_to_org.sh
```

This script will:
- Update vite.config.js with new base path
- Update README badges with new URLs
- Update all documentation
- Update remote URLs
- Commit and push changes

**Manual alternative:** Run these commands:

```bash
# Update git remote
git remote set-url origin https://github.com/civic-ai-audits/durham-transport.git

# Update and push changes
git add .
git commit -m "Update URLs for organization migration"
git push
```

---

### Step 4: Enable GitHub Pages (Again)

After transfer, re-enable GitHub Pages:

```bash
# Enable Pages with Actions
cat > /tmp/pages_config.json << 'EOF'
{
  "build_type": "workflow"
}
EOF

gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  /repos/civic-ai-audits/durham-transport/pages \
  --input /tmp/pages_config.json
```

**Or via web interface:**
1. Go to: https://github.com/civic-ai-audits/durham-transport/settings/pages
2. Source: GitHub Actions
3. Save

---

### Step 5: Update Repository Settings

Configure the transferred repo:

```bash
# Add topics
gh repo edit civic-ai-audits/durham-transport \
  --add-topic ai-ethics \
  --add-topic transportation \
  --add-topic civic-tech \
  --add-topic equity \
  --add-topic data-visualization \
  --add-topic geospatial \
  --add-topic durham-nc \
  --add-topic bias-detection \
  --add-topic python \
  --add-topic javascript \
  --add-topic leaflet \
  --add-topic echarts \
  --add-topic flask \
  --add-topic vite \
  --add-topic hackathon

# Set homepage
gh repo edit civic-ai-audits/durham-transport \
  --homepage "https://civic-ai-audits.github.io/durham-transport/"
```

---

## New URLs After Migration

| Resource | Old URL | New URL |
|----------|---------|---------|
| Repository | `civic-ai-audits/durham-transport` | `civic-ai-audits/durham-transport` |
| Live Demo | `civic-ai-audits.github.io/durham-transport` | `civic-ai-audits.github.io/durham-transport` |
| GitHub URL | `github.com/jonasneves/...` | `github.com/civic-ai-audits/durham-transport` |

---

## Verification Checklist

After migration, verify:

- [ ] Organization created: https://github.com/civic-ai-audits
- [ ] Repository transferred: https://github.com/civic-ai-audits/durham-transport
- [ ] GitHub Pages enabled
- [ ] Live site accessible: https://civic-ai-audits.github.io/durham-transport/
- [ ] All badges updated in README
- [ ] Git remote updated locally
- [ ] Topics added to repo
- [ ] Homepage URL set

---

## Rollback (If Needed)

If something goes wrong:

```bash
# Transfer back to personal account
gh api -X POST /repos/civic-ai-audits/durham-transport/transfer \
  -f new_owner='jonasneves'

# Restore original name
gh repo rename durham-transport-safety-audit --yes
```

---

## What Gets Better

After migration to organization:

✅ **More Professional**
   - `civic-ai-audits.github.io/durham-transport`
   - vs `civic-ai-audits.github.io/durham-transport`

✅ **Cleaner URLs**
   - Shorter and more memorable
   - Organization branding

✅ **Scalability**
   - Add more projects: `civic-ai-audits/baltimore-transport`
   - Team collaboration ready
   - Multiple repositories under one brand

✅ **Discoverability**
   - Organization shows up in GitHub search
   - Can have organization README
   - Better SEO with org profile

✅ **Future Growth**
   ```
   civic-ai-audits/
   ├── durham-transport        (current project)
   ├── methodology            (shared methods)
   ├── toolkit                (reusable tools)
   └── .github                (org-wide templates)
   ```

---

## Next Steps After Migration

1. **Create Organization README:**
   - Create repo: `civic-ai-audits/.github`
   - Add `profile/README.md`
   - Showcase all projects

2. **Add Organization Documentation:**
   - CODE_OF_CONDUCT.md
   - CONTRIBUTING.md
   - SECURITY.md

3. **Configure Team Access:**
   - Create teams if collaborating
   - Set repository permissions

4. **Update Social Media:**
   - Share new URLs
   - Update links in presentations

---

**Ready to migrate? Follow the steps above!**
