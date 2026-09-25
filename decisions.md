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

## 2026-09-24 — WebSocket `vehicle_update` assumed to always carry the full fleet array

Probed the live WebSocket at `REACT_APP_WS_URL` directly (no message shape was documented in
`src/api-types-responses.md`). Captured two message types:

```ts
{
  type: 'initial_data' | 'vehicle_update',
  data: Vehicle[],
  timestamp: string,
  message: string,
}
```

Both `initial_data` (sent once on connect) and `vehicle_update` (sent ~every 3 minutes per the
server's own `message` text) carried the **entire 25-vehicle fleet**, not a single-vehicle delta
or a subset of changed vehicles.

**Context:** Only one connection/update cycle was observed. There's no guarantee the backend
will always send the full fleet on every `vehicle_update` — it could plausibly send only the
vehicles that changed in a given cycle (e.g. 10 of 25), and a client that blindly replaces its
vehicle list with `data` would silently drop the other 15 vehicles from the UI.

**Decision:** Assume `vehicle_update.data` is the full fleet array for now (matches the one
sample observed), but implement `applyVehicleUpdate` as an **id-keyed merge into the existing
list**, not a full-array replace — this is correct whether the payload is the full 25 or a
partial subset, and only REST is allowed to add/remove vehicles from the list (WS never grows or
shrinks it). This keeps the "REST is source of truth for snapshots, WS is deltas only" boundary
from `plan.md` intact even though the current payload happens to be a full snapshot.

**Follow-up:** If a future observation shows `vehicle_update` consistently sends partial arrays,
this assumption is already safe under the merge-by-id implementation — no code change needed,
just remove this note's uncertainty. If the backend team confirms the contract either way,
update this decision accordingly.

## 2026-09-25 — Open detail modal signals staleness instead of live-updating

While `VehicleDetailModal` is open, an incoming `vehicle_update` does **not** change the values it
shows. Instead the modal compares the pushed `lastUpdated` for that vehicle against the snapshot on
screen and, when the push is newer, renders a "Newer data has arrived for this vehicle" banner with
a Refresh button that refetches via the same `vehicleService.getById` the modal opened with.

**Context:** The modal held its own copy of the vehicle, fetched once on open, and nothing ever
updated it — so speed, location, battery, fuel and its own "Last Updated" card silently froze while
the table behind it moved on. The obvious fix was to merge pushes straight into the modal, but that
would make the socket a second source of truth for single-vehicle detail, which `spec.md` assigns
to REST. It would also mutate values under a dispatcher mid-read — the same reason the REST-failure
fallback deliberately never swaps content either.

**Decision:** The socket is a *signal* here, not a data source: it tells the modal that something
newer exists, and REST supplies the value when the dispatcher asks for it. Refreshing keeps the
existing values visible while in flight, and a failed refresh leaves them in place rather than
blanking the panel.

**Follow-up:** If dispatchers report missing updates because they don't notice the banner, consider
auto-refreshing the modal when its data is untouched (no scroll, no focus), or making the banner
more prominent — but keep the REST-supplies-the-value boundary either way.
