# Contributing

## How to contribute

1. **Open an issue** — report a bug, question a finding, suggest a new analysis.
2. **Submit a PR** — new data sources, pipeline improvements, frontend fixes.
3. **Review** — critical feedback on methodology is as valuable as new code.

## Setup

```bash
make setup    # Install backend + frontend deps, pre-commit hooks, pull data
make dev      # Start frontend dev server at localhost:5173
make test     # Run pytest with coverage
make lint     # Run ESLint
```

## Guidelines

- Raw data in `backend/data/raw/` is immutable. Transformations go to `backend/data/simulated/`.
- Simulation parameters live in `backend/config.py` — no magic numbers in scripts.
- Frontend loads values from generated JSON — never hardcode computed results.
- Commit messages document reasoning, not just changes.
- Pre-commit hooks must pass. Run `make hooks` to check before pushing.

## Attribution

All contributors are credited. When AI tools assist a commit, include a `Co-Authored-By` line.
