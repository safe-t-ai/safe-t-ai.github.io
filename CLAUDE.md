## Code

- Delete unused code (imports, variables, functions, props, files)
- No abstractions for single use
- No handling for impossible errors
- Minimal and direct solutions
- No hardcoded fallbacks; fail explicitly if config/data is missing
- Consolidate duplicate code immediately
- Replace multiple similar functions with configuration objects
- Remove trailing whitespace and excess blank lines
- Prefer direct solutions over complex patterns
- Simplify conditional logic where possible
- After making significant code changes, run @agent-code-simplifier:code-simplifier to identify and remove cruft
- All simulation parameters must be defined in backend/config.py and imported where used
- Frontend must not hardcode data values — load from generated JSON or compute from data
- HTML tooltips describe methodology, not specific results (results change on pipeline reruns)

## Documentation

- Professional, concise, no decorative emojis
- Unicode symbols (✓, ⚠️, ❌, ○) are fine for status indicators
- Only docs integral to system
