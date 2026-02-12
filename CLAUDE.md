## Code

- Delete unused code (imports, variables, functions, props, files)
- Consolidate duplicate code immediately
- Replace multiple similar functions with configuration objects
- After making significant code changes, run @agent-code-simplifier:code-simplifier to identify and remove cruft
- All simulation parameters must be defined in backend/config.py and imported where used
- Frontend must not hardcode data values — load from generated JSON or compute from data
- HTML tooltips describe methodology, not specific results (results change on pipeline reruns)

## Data Validation

- Expected value ranges live in `PLAUSIBILITY_RANGES` in `backend/config.py` — CI checks use these, not inline magic numbers
- Primary report JSONs include a `_provenance` key documenting data type (real/calibrated/simulated), sources, and parameters
- `data-manifest.json` is the machine-readable registry of all data sources — update it when adding new output files

## Documentation

- Emojis are fine as status indicators (✅, ⚠️, ❌) — not as decoration or emphasis
