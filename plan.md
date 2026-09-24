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

### 5. Components — `src/web/components/`

Mirror the visual sections 1:1:

- `Header.tsx` — truck icon (from `@mui/icons-material`) + "Fleet Tracking Dashboard" title.
- `LiveStatusIndicator.tsx` — reads socket `status` from `useSocket`/context, shows
  "Updates are live" vs. reconnecting/offline state.
- `StatusFilter.tsx` — filter chips/buttons (`all`, `en_route`, `idle`, `delivered`) bound to
  `statusFilter` in context.
- `FleetStatistics.tsx` — 4 cards reading `statistics` from context: Total, Idle, En Route,
  Delivered (or Total / Active (`en_route`) / Idle / Delivered, whichever 4-card grouping the
  design calls for — `average_speed` is a 5th data point available if a card is needed for it).
- `VehicleTable.tsx` — columns: Vehicle (`vehicleNumber`), Driver (`driverName`), Status, Speed
  (`speed`, render as `${speed} mph`), Destination, ETA (`estimatedArrival`, render "—" when
  `null`), Last Update (`lastUpdated`), Location (`currentLocation.lat`/`.lng`, via
  `src/utils/format.ts`); row click → `selectVehicle(id)`.
- `VehicleDetailModal.tsx` — MUI `Modal`/`Dialog` with backdrop blur, opens when
  `selectedVehicleId` is set; fetches full detail via `vehicleService.getById` (list item already
  carries every field the detail response has, so this is mainly to get the freshest snapshot on
  open, not to fill in missing fields); content broken into cards — e.g. driver
  (`driverName`/`driverPhone`), status/destination/ETA, location, and battery/fuel level
  (`batteryLevel`/`fuelLevel` are only in the payload, not the table — the modal is where they
  surface).

### 6. Layout — `src/web/pages/Dashboard.tsx` (or keep in `main.tsx`)

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

Use MUI `Grid`/`Box` with the existing `src/theme/theme.ts`; no new styling system.

### 7. `.env`

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

1. Types + endpoints + services (steps 1–3).
2. `FleetContext` wired to REST only, no socket yet — confirm data flows into a bare-bones table.
3. `VehicleTable` + `FleetStatistics` + `StatusFilter` against static/mock data if the API isn't
   reachable yet.
4. `VehicleDetailModal`.
5. Wire `useSocket` into `FleetContext` for live updates + `LiveStatusIndicator`.
6. Header + final layout/spacing pass.
7. Manual test against real API/WS, then revisit the open questions above.
