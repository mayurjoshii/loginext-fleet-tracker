# Fleet Tracker — Phase 1 Implementation Plan

Handover plan for building the Fleet Tracking Dashboard on top of the existing scaffold
(`src/api`, `src/sockets`, `src/types`, `src/theme`, `src/utils`, `src/web`). This is Phase 1:
one route, wired to a real API + WebSocket, no auth flow beyond what's already scaffolded.

## Goals

- Single-screen dashboard: header, left rail (live status + filters + fleet statistics), right
  side fleet table (~80% width), and a detail modal on row click.
- Vehicle list refreshed via REST and kept live via WebSocket push updates.
- State kept simple: local component state + React Context, no external state library — the app
  is one screen with a handful of related components, so Context API is enough.

## API surface

Base URL comes from `REACT_APP_API_BASE_URL` (already wired via `src/config/env.ts` /
`src/api/client.ts`). Confirmed against `src/api-types-responses.md`: four REST endpoints plus
one WebSocket, every REST response wrapped in `{ success, data, ... , timestamp }`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/vehicles` | full fleet list (supports `?limit=`) |
| GET | `/api/vehicles/:id` | single vehicle detail (used by the row-click modal) |
| GET | `/api/vehicles/status/:status` | fleet list filtered by status |
| GET | `/api/statistics` | overall fleet statistics (for the summary cards) |
| WS | `REACT_APP_WS_URL` | live position/status push updates |

Note the current `src/api/endpoints.ts` and `src/api/services/vehicleService.ts` are from an
earlier assumed shape (`/vehicles/:id/location`, fleets, auth) — these need to be updated to the
paths above rather than extended, and `src/types/vehicle.ts` needs to be rewritten to match the
real payload shape (see below), not just extended field-by-field.

### REST vs. WebSocket — division of responsibility

`src/api-types-responses.md` only documents REST; there's no WS payload sample yet. Until one
exists, treat the two as playing different roles rather than duplicating each other:

- **REST is the source of truth for snapshots.** Initial load (`GET /vehicles`), switching the
  status filter (`GET /vehicles/status/:status`), opening the detail modal
  (`GET /vehicles/:id`), and the summary cards (`GET /statistics`) are all REST calls — anything
  that represents "give me the current full state of X" goes through REST.
  `GET /vehicles/status/:status` also already returns `total`/`status`, so it doubles as a
  cheap per-status count if the statistics endpoint ever needs cross-checking.
- **WebSocket is for incremental deltas only**, applied on top of whatever REST last loaded —
  e.g. a vehicle's `currentLocation`/`speed`/`status`/`batteryLevel`/`fuelLevel`/`lastUpdated`
  changing in near-real-time. The socket should never be relied on to deliver the *initial*
  list — `FleetContext` always does a REST fetch first, then layers WS messages on top by
  matching `id`.
- Because the WS message shape isn't documented yet, write the merge function
  (`applyVehicleUpdate` in `FleetContext`) defensively: validate the incoming object has an `id`
  matching a known field name before merging, and no-op/log otherwise rather than throwing. Once
  a real WS sample is available, tighten the type and drop the guard.
- If a WS message ever changes a vehicle's `status`, re-derive the 4 summary cards client-side
  from the in-memory `vehicles` array rather than waiting on a fresh `GET /statistics` — keeps
  the cards in sync with the table without adding WS-triggered REST polling. `average_speed`
  from `/api/statistics` is the one field that can't be cheaply re-derived this way (would need
  every vehicle's speed, which the list already has, so it actually can be — just note it's a
  derived average, not push-fed).

## Step-by-step

### 1. Types — `src/types/vehicle.ts` + `src/types/api.ts` + `src/types/statistics.ts`

Rewrite `Vehicle` to match the real payload field-for-field (`src/api-types-responses.md`):

```ts
// src/types/vehicle.ts
export type VehicleStatus = 'en_route' | 'idle' | 'delivered'; // confirmed: only these 3 values exist

export interface VehicleLocation {
  lat: number;
  lng: number;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;   // "FL-001" — the "vehicle" column
  driverName: string;
  driverPhone: string;
  status: VehicleStatus;
  destination: string;
  currentLocation: VehicleLocation;
  speed: number;                    // mph — confirmed unit
  lastUpdated: string;              // ISO timestamp
  estimatedArrival: string | null;  // ISO timestamp; null when not applicable (e.g. already delivered/idle)
  batteryLevel: number;             // 0–100
  fuelLevel: number;                // 0–100
}
```

`src/types/api.ts` — generic REST envelope every endpoint uses:

```ts
export interface ApiSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// list endpoints (`/vehicles`, `/vehicles/status/:status`) add extra top-level fields
// beyond `data`/`timestamp` — model those per-endpoint rather than in the shared envelope,
// see VehicleListResponse below.
export interface VehicleListResponse extends ApiSuccess<Vehicle[]> {
  total: number;
  status?: string; // present only on /vehicles/status/:status
}
```

(`Vehicle` import added to `api.ts` — or keep `VehicleListResponse` in `vehicle.ts` next to
`Vehicle` if that reads better; either is fine, just avoid a circular import.)

`src/types/statistics.ts` — matches `/api/statistics` exactly (note: flat status counts keyed
by the same three status strings as `Vehicle['status']`, not a nested object):

```ts
export interface FleetStatistics {
  total: number;
  idle: number;
  en_route: number;
  delivered: number;
  average_speed: number;
  timestamp: string;
}
```

### 2. Endpoints — `src/api/endpoints.ts`

Replace the `vehicles`/`fleets`/`auth` groups with:

```ts
export const endpoints = {
  vehicles: {
    list: '/vehicles',
    detail: (id: string) => `/vehicles/${id}`,
    byStatus: (status: string) => `/vehicles/status/${status}`,
  },
  statistics: {
    summary: '/statistics',
  },
};
```

(`apiClient` already prefixes `REACT_APP_API_BASE_URL` and attaches the auth header, so services
should keep using it unchanged.)

### 3. Services

Every response is wrapped in the `{ success, data, ... }` envelope, so services unwrap `data`
and should throw (or return a typed error) on `success: false` rather than pass the envelope
up to components:

- Update `src/api/services/vehicleService.ts`:
  - `list(limit?: number)` → `GET /vehicles` (pass `?limit=` as an Axios `params` object, not
    a hand-built query string), unwraps to `Vehicle[]`.
  - `getById(id)` → `GET /vehicles/:id`, unwraps to `Vehicle`.
  - `listByStatus(status: VehicleStatus)` → `GET /vehicles/status/:status`, unwraps to
    `Vehicle[]`.
- Add `src/api/services/statisticsService.ts`: `get()` → `GET /statistics`, unwraps to
  `FleetStatistics`.

### 4. Fleet context — `src/context/FleetContext.tsx`

One Context + provider wrapping the dashboard, responsible for the state genuinely shared across
components (list, selected vehicle, filter, socket status):

- `vehicles: Vehicle[]`, `statistics: FleetStatistics | null`
- `statusFilter: VehicleStatus | 'all'`, `setStatusFilter` — changing this re-fetches via REST
  (`listByStatus` vs `list`), it does not filter client-side, so the table always reflects
  what the backend considers that status.
- `selectedVehicleId: string | null`, `selectVehicle`, `clearSelection` (drives the modal)
- `loading` / `error` flags per fetch
- On mount, and whenever `statusFilter` changes: fetch `vehicleService.list()` or
  `vehicleService.listByStatus(statusFilter)`, plus `statisticsService.get()` (the latter is
  independent of the filter — the summary cards always reflect the whole fleet).
- Subscribes to `useSocket` (from `src/sockets/useSocket.ts`) purely for deltas — see
  "REST vs. WebSocket" above. Confirmed via a live probe against `REACT_APP_WS_URL` (see
  `decisions.md`): the socket sends
  `{ type: 'initial_data' | 'vehicle_update', data: Vehicle[], timestamp: string, message: string }`.
  `initial_data` fires once on connect (ignore it client-side — REST already owns the initial
  load); `vehicle_update` fires roughly every 3 minutes, **and always carries the whole fleet**
  (confirmed — not a changed-only subset). Despite that, `applyVehicleUpdate` must always merge
  by `id` into the existing `vehicles` array rather than replacing it wholesale:
  - `statusFilter` may be active, so `vehicles` in context can already be a subset of the fleet
    (from `listByStatus`) — swapping in the WS message's full array would silently undo the
    filter. Merging by `id` (only updating rows that already exist in the current, possibly
    filtered, array) keeps the filter intact and correct.
  - For each vehicle in the incoming array, shallow-compare against the current row before
    replacing it (e.g. compare `lastUpdated`, or every field) so unchanged rows keep the same
    object reference — avoids re-rendering table rows that didn't actually change.
  - Net effect: `vehicles = current.map(v => { const incoming = updatesById.get(v.id); return
    incoming && hasChanged(v, incoming) ? incoming : v; })`. WS never adds/removes rows or
    changes which vehicles are visible under the active filter — only REST (via `statusFilter`)
    does that.
  - Validate `type === 'vehicle_update'` and `Array.isArray(data)` before merging; unrecognized
    messages are ignored, not thrown.
- Everything else (table sort, hover state, modal open/close animation) stays local component
  state — no need to put it in context.

### 5. `useFleetSummary` hook — `src/context/useFleetSummary.ts`

Per `frontend-design.md`, the left-rail filter chip counts and the fleet-statistics tiles must
never disagree and must update the instant a WS `vehicle_update` merge lands — not just on the
next REST fetch. Rather than `StatusFilter` and `FleetStatistics` each computing their own
counts, one hook derives everything from `FleetContext.vehicles` (the same array WS deltas are
merged into per step 4):

```ts
function useFleetSummary() {
  const { vehicles, statistics } = useFleetContext();
  return useMemo(() => ({
    total: vehicles.length,
    idle: vehicles.filter(v => v.status === 'idle').length,
    enRoute: vehicles.filter(v => v.status === 'en_route').length,
    delivered: vehicles.filter(v => v.status === 'delivered').length,
    moving: vehicles.filter(v => v.status === 'en_route').length, // "Moving" IS en_route, not a separate dimension
    averageSpeed: statistics?.average_speed ?? null, // GET /statistics seeds this; not cheaply re-derivable without every vehicle's speed already in `vehicles`, which it is — see note below
    lastUpdate: vehicles.reduce((max, v) => (v.lastUpdated > max ? v.lastUpdated : max), ''),
  }), [vehicles, statistics]);
}
```

`GET /statistics` (step 3) seeds `total`/`idle`/`en_route`/`delivered`/`average_speed` on initial
render; once WS updates start arriving, `StatusFilter.tsx` and `FleetStatistics.tsx` should
prefer these client-derived counts over waiting on a fresh `/statistics` call — this is what
keeps the two sections and the table in lockstep off one source of truth. `averageSpeed` can
also be derived from `vehicles` client-side (`mean(v.speed)`) if a WS-fresh value is ever needed
instead of the REST-seeded one.

### 6. Components — `src/web/components/`

Mirror the visual sections 1:1 (see `frontend-design.md` for the annotated screenshots this
maps to):

- `Header.tsx` — truck icon (from `@mui/icons-material`) + **"Fleet Tracking Dashboard"** title,
  muted subtitle (`Real-time vehicle monitoring • LogiNext Case Study`), full-width divider
  underneath. Purely static — no props, no context, no data dependency at all.
- `LiveStatusIndicator.tsx` — reads socket `status` from `useSocket`/context: green wifi icon +
  "Live Updates Active" when connected; needs its own gray/red wifi-off variant + copy (e.g.
  "Reconnecting…" / "Offline") for the other `ConnectionStatus` values, which the screenshot
  doesn't show.
- `StatusFilter.tsx` — 2×2 grid of filter chips (`All`/`Idle`/`En Route`/`Delivered`), each with
  a status-colored dot + label + count from `useFleetSummary()` (gray/blue/green dots matching
  the table's status badge colors). Bound to `statusFilter` in context; selecting a chip triggers
  a REST refetch (`listByStatus`/`list`) for the table rows — the chip *counts* always come from
  `useFleetSummary()` regardless of which filter is active, so switching filters never makes a
  count disappear.
- `FleetStatistics.tsx` — 2×2 grid of stat tiles (Total Fleet, Avg Speed, Moving, Last Update),
  all from `useFleetSummary()`; plus a footer line ("Updated Xs ago • Next update in ~3 minutes")
  driven by a local client-side timer anchored to the last time `useFleetSummary()`'s output
  changed — not an API value.
- `StatCard.tsx` — one reusable, prop-driven presentational card (icon + label + value, optional
  `Chip` badge or `LinearProgress` bar) used 9× inside `VehicleDetailModal`. Purely presentational
  — takes `icon`, `label`, `value`/`children` props, no context/data-fetching of its own.
- `VehicleTable.tsx` — header row (`Vehicles (N)` + green "Live" pill) above a column-header row
  that stays fixed while the body scrolls independently. Columns: Vehicle (`vehicleNumber`, as a
  link), Driver (`driverName`), Status (color-coded badge), Speed (`${speed} mph`), Destination,
  ETA (`estimatedArrival`, "-" when `null`), Last Update (`lastUpdated`, formatted
  `DD/MM/YYYY, HH:mm:ss`), Location (`lat, lng` to 4 decimals) — all via `src/utils/format.ts`;
  row click → `selectVehicle(id)`.
- `VehicleDetailModal.tsx` — MUI `Dialog` with backdrop blur, opens when `selectedVehicleId` is
  set; fetches full detail via `vehicleService.getById` (list item already carries every field
  shown, so this is mainly to get the freshest snapshot on open). Structure: header (truck icon +
  `vehicleNumber` title + close `IconButton` + driver/status subtitle) → divider → 2-column grid
  of `StatCard`s (Status badge, Current Speed, Driver, Phone, Destination, Location-in-monospace,
  Battery % + progress bar, Fuel % + progress bar) → one full-width `StatCard` for Last Updated.
  `estimatedArrival` isn't in the screenshot; leave it out of the card grid for Phase 1.

### 7. Layout — `src/web/pages/Dashboard.tsx` (or keep in `main.tsx`)

Per `decisions.md`, the app is intentionally single-route for now — no router needed. Compose:

```
<FleetProvider>
  <Header />
  <Grid container>
    <Grid item /* left rail, ~20% */>
      <LiveStatusIndicator />
      <StatusFilter />
      <FleetStatistics />
    </Grid>
    <Grid item /* right, ~80% */>
      <VehicleTable />
    </Grid>
  </Grid>
  <VehicleDetailModal />
</FleetProvider>
```

Use MUI `Grid`/`Box` with the existing `src/theme/theme.ts`; no new styling system. This is the
merge point every parallel component track below lands in — see "Suggested build order."

### 8. `.env`

Add real values to a local `.env` (untracked) from `.env.example`:
```
REACT_APP_API_BASE_URL=<base url — to be provided>
REACT_APP_WS_URL=<ws url — to be provided>
```

## Confirmed answers

- `vehicle_update` WebSocket messages always contain the whole fleet, not a changed-only subset.
  Frontend still merges by `id` rather than replacing the array — necessary because a status
  filter can be active, so `vehicles` in context may already be a subset of the fleet; see the
  `applyVehicleUpdate` behavior in step 4.
- `VehicleStatus` has exactly three values: `en_route`, `idle`, `delivered`. No `offline`/other
  state to design for.
- `speed` is in **mph** — table/modal should render e.g. `62 mph`, not a bare number.

## Open questions still to confirm

- Whether `GET /vehicles` supports pagination beyond `?limit=` (e.g. `offset`/`cursor`) for
  fleets larger than what one page can reasonably render — the sample only shows `?limit=10`.

## Out of scope for Phase 1

- Routing / multi-page navigation (per `decisions.md`).
- Auth UI (token handling already exists in `src/api/client.ts`, no login screen yet).
- Any state library beyond React Context — revisit only if a second route/feature genuinely
  needs cross-cutting state Context can't cleanly express.

## Suggested build order

### Critical path (sequential, blocking — do this first)

Everything else depends on the **shapes** these produce, not their full correctness against the
live API — so the goal here is to lock interfaces fast, not to gold-plate:

1. Types (`Vehicle`, `VehicleStatus`, `ApiResponse`, `FleetStatistics` — step 1).
2. Endpoints + services (steps 2–3).
3. `FleetContext`'s **public shape** (step 4): `vehicles`, `statistics`, `statusFilter` +
   `setStatusFilter`, `selectedVehicleId` + `selectVehicle`/`clearSelection`, `loading`/`error`.
   Wire it to REST first; the WS merge logic can be filled in later without changing this shape
   (see below).
4. `useFleetSummary()`'s return shape (step 5): `{ total, idle, enRoute, delivered, moving,
   averageSpeed, lastUpdate }`. Can initially return REST-only numbers (from `statistics`)
   before the WS-driven derivation is wired in — same reasoning as #3.

Once these four interfaces are agreed (roughly: `Vehicle`/`FleetStatistics` fields +
`FleetContext`/`useFleetSummary` return shapes), everything below can fan out.

### Parallel tracks — build independently, merge into `Dashboard.tsx`

These don't depend on each other, only on the interfaces above, and can be built and reviewed as
separate PRs/branches by different people (or agents) at the same time:

| Track | Component(s) | Depends on |
|---|---|---|
| A | `Header.tsx` | Nothing — pure static markup, can start before step 1 even lands |
| B | `LiveStatusIndicator.tsx` | `useSocket`'s `ConnectionStatus` type only |
| C | `StatCard.tsx` + `VehicleDetailModal.tsx` | `Vehicle` type, `vehicleService.getById`; not `FleetContext` beyond `selectedVehicleId`/`selectVehicle` |
| D | `StatusFilter.tsx` + `FleetStatistics.tsx` | `useFleetSummary()` shape + `statusFilter`/`setStatusFilter` (build both together — they share the one hook and are meant to never drift apart, per `frontend-design.md`) |
| E | `VehicleTable.tsx` | `FleetContext.vehicles` + `selectVehicle` |
| F | WS merge-by-id logic *inside* `FleetContext` (the `applyVehicleUpdate` behavior from step 4) | Only the `FleetContext` internals — no UI component reads the socket directly, they all just re-render off `vehicles` changing, so this can be developed and tested in isolation (e.g. against a mocked `WebSocket`) fully in parallel with tracks A–E |

Each track can use hand-mocked data (a static `Vehicle[]` fixture, a stubbed
`useFleetContext()`/`useFleetSummary()`) to build and visually verify against
`frontend-design.md` without waiting on a working backend connection.

### Merge + integration (sequential again)

1. Wire tracks A–E into `Dashboard.tsx` (step 7) behind the real `FleetProvider` — this is the
   one point where every track's interface assumptions get checked against each other.
2. Drop in track F (WS merge logic) — since it only changes `FleetContext` internals, this step
   should require no changes to any component from tracks A–E.
3. Add real `.env` values (step 8) and manually test against the live API/WS.
4. Revisit the one open question above (pagination) once real fleet sizes are known.
