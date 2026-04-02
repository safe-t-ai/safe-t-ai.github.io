# Working — Post-Durham Meeting

## Current hypothesis

SAFE-T's four tests are structurally sound. The pipeline now uses Durham's own
equity variables (TDI, zero-car households, bus stops, disability %) — the same
frame planners use for Bike Walk prioritization. The dashboard surfaces these
as a tabbed map alongside the compound-effect cascade, making the audit
directly interpretable to planners without additional explanation.

The remaining gap is downstream use: TDI and disability are in the geojson but
not yet used in Tests 1/3/4 equity stratification. Income quintiles remain the
primary stratification axis.

---

## Resolved (April 2, 2026 — dashboard session)

- **BIAS_PARAMETERS**: config.py cites Roy et al. (2019) and Williams & Behrendt
  (2025) as directional support. Magnitudes labeled as simulation assumptions.
- **Zero-car households**: `pct_no_vehicle`, `pct_low_vehicle` in geojson and
  equity-context.json. Shown as tab 3 on overview map.
- **TDI**: `tdi_score_county` in geojson and equity-context.json. Confirmed
  0–21 composite (not percentile) — each of 7 indicators scored 1–3 against
  Durham County block group distribution. Tooltip corrected accordingly.
- **Bus stops**: `stop_count`, `stops_per_1k` in geojson. Shown as tab 4 on
  overview map. Boardings not in public GTFS — noted in provenance.
- **Disability %**: Added from NCDOT TDI service (`Disability` field, alias
  `Disability_pct`). Stored as 0–100 scale. Appears in TDI popup. Not a
  separate map tab — encoded in TDI composite and surfaced on hover.
- **Test 4 framing**: Findings lead with Q1 suppressed demand as counter to
  "no one walks there" arguments.
- **Overview dashboard restructure**: Single tabbed map (Income | TDI |
  Zero-car | Bus stops) replaces two separate map sections. Cascade cards
  in the right column, paired with the map they interpret.
- **Cross-check vs NCDOT StoryMap**: Confirmed SAFE-T uses Durham's own equity
  variables. Four TDI indicators not yet in pipeline: elderly, youth, LEP,
  mobility impairment (disability now added). EJ index (0–12, 3 groups) exists
  but TDI is more useful for active transportation framing.
- **Notebook 01 data current**: All equity vars refreshed and pushed to GitHub.
  `equity-context.json` live with correct scales.

---

## Open: downstream use of equity variables in tests

TDI, disability, and bus stops are in `durham_census_tracts.geojson` but
notebooks 02–05 don't use them yet. Decisions still needed:

- Should TDI supplement income quintiles in Tests 1/3/4 stratification?
  TDI is multi-dimensional and closer to what planners use; income quintile
  is simpler to explain and keeps tests comparable across cities.
- Should bus stop density appear in the Test 4 (suppressed demand) map as
  an overlay? High stop density + high suppression = strongest political argument.
- Notebooks 02–05 have not been re-run since the geojson update. Frontend JSON
  (volume-report, crash-report, etc.) is still from the prior run — structurally
  unchanged but missing any downstream columns if they were added.

---

## What the TPO conversation could unlock

Brian flagged the Triangle West TPO's high-risk network as where crash
prediction modeling likely lives. If SAFE-T can audit that model instead of
a simulated one, it becomes a much more credible tool.

Data to request from TPO if meeting happens:
- High-risk network GIS layer and methodology documentation
- Any AI/ML model documentation they use for crash prediction

---

## Rejected paths

- Adding StreetLight as a real data source: confirmed unavailable at road
  segment level since 2022. Census block group only — too coarse. Strava
  requires institutional license. Both remain simulated for now.
- Reframing the whole audit as MPO-level: premature. Start with Durham city,
  prove the framework, then pitch TPO.
- Separate equity context section on overview: replaced by tabbed map.
  Two maps → one map with four tabs.
