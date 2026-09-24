# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — run the dev server (http://localhost:3000)
- `npm test` — run tests via react-scripts (Jest) in interactive watch mode; use `npm test -- --watchAll=false` for a single non-watch run, or `npm test -- <pattern>` to target specific test files
- `npm run build` — production build to `build/`

There is no lint script; ESLint runs as part of `react-scripts` (config: `react-app` / `react-app/jest` in `package.json`).

## Code style

Always wrap `if`/`else` bodies in curly braces, even for single-line statements.

Function components use named exports, not default exports — declare as `export const ComponentName = () => { ... }` rather than `function ComponentName() { ... }` / `export default ComponentName`.

## Architecture

Create React App (TypeScript template) frontend, no backend in this repo — see `decisions.md` for why CRA was chosen despite its deprecation. This is currently a scaffold: `src/App.tsx` renders a placeholder screen, but the supporting layers below are wired up and intended to be built on directly.

- `src/config/env.ts` — reads `REACT_APP_API_BASE_URL` and `REACT_APP_WS_URL` from env (see `.env.example`). All other modules should get config through this file rather than reading `process.env` directly.
- `src/api/client.ts` — shared Axios instance (`apiClient`). Request interceptor attaches `Bearer <authToken>` from `localStorage` automatically; don't set the Authorization header manually in service calls.
- `src/api/endpoints.ts` — centralized URL path builders (`endpoints.vehicles.list`, `endpoints.vehicles.detail(id)`, etc.). Add new routes here rather than inlining path strings in services.
- `src/api/services/` — one service module per resource (e.g. `vehicleService.ts`), each composing `apiClient` + `endpoints` and returning typed data from `src/types/`.
- `src/sockets/SocketManager.ts` — singleton `socketManager` wrapping a raw `WebSocket` to `env.wsUrl`, with automatic exponential-backoff reconnect (1s base, 30s cap) and pub/sub via `onMessage`/`onStatusChange`. `src/sockets/useSocket.ts` is the React hook wrapper — use it from components instead of touching `socketManager` directly.
- `src/theme/theme.ts` — single MUI theme (`createTheme`), applied app-wide; the project uses MUI (`@mui/material`, `@emotion/*`) as its component/styling library.
- `src/types/` — shared domain types (e.g. `Vehicle`), used as the contract between `api/services` and components.
- `src/utils/` — small stateless helpers: `format.ts` (date/coordinate formatting), `storage.ts` (typed JSON wrapper over `localStorage`).

When adding a new domain resource, the expected pattern is: add a type in `src/types/`, add path builders in `src/api/endpoints.ts`, add a service in `src/api/services/`, then consume it from components — mirroring the existing `vehicleService`/`Vehicle` pair.

## Git

Never run `git commit` (or any command that creates/amends a commit) unless the user has explicitly approved it in that instance. Staging, diffing, and status checks are fine; committing is not.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
