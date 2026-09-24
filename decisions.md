# Decisions

## 2026-09-24 — Scaffold with Create React App despite deprecation

Used `create-react-app` (CRA) with the TypeScript template to scaffold this repo, even though CRA
was officially deprecated by the React team in February 2025 and is no longer maintained.

**Context:** CRA is unmaintained, pulls in a webpack-dev-server dependency with known security
advisories, and doesn't behave well with current Node/npm versions compared to actively maintained
alternatives (e.g. Vite). The user was informed of this tradeoff and explicitly chose to proceed
with CRA anyway, per the project's stated requisites.

**Decision:** Proceed with CRA as the build tool for this frontend-only repo.

**Follow-up:** If CRA's lack of maintenance becomes a blocker (build tooling issues, unpatched
vulnerabilities, slow dev server), revisit and consider migrating to Vite.

## 2026-09-24 15:32 — Single-screen `main.tsx` root instead of routing

Added `src/web/main.tsx` as the sole root screen rendered by `App.tsx`. All components and pages
live under `src/web/` (`src/web/components/`, `src/web/pages/`). No router (e.g. react-router) has
been introduced yet.

**Context:** The app is currently scoped as a single page/route with no navigation. Introducing a
routing library and a `pages/`-per-route structure now would be premature abstraction for a screen
count of one.

**Decision:** `main.tsx` is intentionally the single, hardcoded root route for the current phase of
the project. This is a deliberate, temporary shortcut — not the intended long-term architecture.

**Follow-up:** Once the app expands beyond one screen, split `main.tsx` into routed `page`
components under `src/web/pages/` (one component per route) and introduce a router. The
`src/web/pages/` folder already exists as a placeholder for that future split.
