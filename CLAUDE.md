## Code

- Delete unused code (imports, variables, functions, props, files)
- Consolidate duplicate code immediately
- No abstractions for single use
- No handling for impossible errors
- Minimal and direct solutions — fail explicitly if config/data is missing
- After making significant code changes, run @agent-code-simplifier:code-simplifier to identify and remove cruft
- All simulation parameters must be defined in `backend/config.py` and imported where used
- Frontend must not hardcode data values — load from generated JSON or compute from data
- HTML tooltips describe methodology, not specific results (results change on pipeline reruns)

## CSS

- Never use `@import` (breaks cache-busting)
- Individual `<link>` tags with `?v={{ hash }}`
- No inline `style=` attributes — extract to CSS classes (dynamic computed values are the only exception)

## Design System

- Centralize visual values as design tokens (CSS custom properties)
- 8pt spacing grid, calibrated type scale
- Dual-layer shadows for depth (subtle ambient + directional)
- Spring-like easing (`cubic-bezier(0.2, 0.8, 0.2, 1)`) for interactive transitions
- System font stack — no web fonts

## UI/UX Standards

- Line-height: 1.47 for body text, 1.4-1.5 for small text
- Uppercase labels: letter-spacing 0.06em minimum
- 44px minimum touch targets on all interactive elements
- `prefers-reduced-motion: reduce` must disable all animations/transitions
- `focus-visible` outlines on all interactive elements (2px solid accent, 2px offset)
- All color pairs must pass WCAG 2.1 AA contrast

## Accessibility

- Follow WAI-ARIA APG patterns for interactive components (tabs, dialogs, menus)
- Charts/visualizations: `aria-label` describing what the visualization shows
- Semantic HTML over divs with roles

## Transitions & Loading

- Tab/view content: fade-in animation (opacity + translateY 8px, ~250ms)
- Skeleton screens matching layout shape during lazy-load
- Loading spinners: CSS-only (border + border-top-color + rotate animation)
- Re-trigger entrance animations on content switches

## Charts & Data Visualization

- HTML titles (h2/h3) above chart containers — never duplicate titles inside chart canvas
- Set chart library font family globally to match system font stack
- Staggered entrance animation per data point (80-120ms delay)
- Bar charts: subtle top border-radius (3px)
- Dark tooltips matching design tokens
- Cross-filtering: hovering a chart element highlights corresponding regions on maps/other charts
- Chart configs via factory functions with shared defaults — individual charts only override what differs

## Responsive

- Horizontal scroll with gradient fade for overflowing navigation — never wrap tabs into grid
- `100dvh` for viewport-dependent elements
- Sticky elements need `max-height` caps
- Collapse metadata on mobile rather than hiding
- Chart minimum height 280px on mobile

## Performance

- `<meta name="theme-color">` for mobile browser chrome
- `<link rel="preload">` for critical JS dependencies
- `fetchpriority="high"` on above-fold images

## Data Validation

- Expected value ranges live in `PLAUSIBILITY_RANGES` in `backend/config.py` — CI checks use these, not inline magic numbers
- Primary report JSONs include a `_provenance` key documenting data type (real/modeled/simulated), sources, and parameters
- `data-manifest.json` is the machine-readable registry of all data sources — update it when adding new output files
- Frontend loads values from data pipeline output — never hardcode computed results

## Documentation

- Professional, concise
- Emojis are fine as status indicators (✅, ⚠️, ❌) — not as decoration or emphasis
- Only docs integral to system
- Text should be direct and informative — state what something is, not what it isn't
