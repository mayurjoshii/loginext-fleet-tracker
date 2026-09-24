# Fleet Tracking Dashboard — Phase 1

Status: ready-for-agent

## Problem Statement

The repo is currently a scaffold: `src/App.tsx` renders a placeholder screen, and the supporting
layers (`src/api`, `src/sockets`, `src/types`, `src/theme`, `src/utils`) are wired up but unused.
There is no way yet to see the fleet — a dispatcher/operator has no dashboard showing where
vehicles are, what status they're in, or how the fleet is trending, and no way to drill into a
single vehicle's live detail (driver, battery, fuel, location).

## Solution

Build the single-route Fleet Tracking Dashboard: a header, a left rail (live connection status,
status filter, fleet statistics), a right-hand vehicle table (~80% of the page), and a detail
modal that opens on row click. Vehicle data loads via REST and stays current via WebSocket push
updates, with REST and WebSocket playing distinct, non-overlapping roles (see Implementation
Decisions). State is local component state plus React Context — no external state library.

## User Stories

1. As a dispatcher, I want to see the whole fleet in a table when I open the dashboard, so that I have a single view of every vehicle's current state.
2. As a dispatcher, I want each table row to show the vehicle number, driver, status, speed, destination, ETA, last update time, and current lat/lng, so that I can scan the fleet without opening each vehicle.
3. As a dispatcher, I want the vehicle number to visually read as a link, so that I know clicking it opens more detail.
4. As a dispatcher, I want to click any table row and see a detail modal for that vehicle, so that I can inspect one vehicle in depth without leaving the dashboard.
5. As a dispatcher, I want the detail modal to show the vehicle's driver name and phone, so that I can contact them if needed.
6. As a dispatcher, I want the detail modal to show the vehicle's current status as a colored badge, so that I can tell its state at a glance.
7. As a dispatcher, I want the detail modal to show current speed, destination, and location (as coordinates), so that I know where the vehicle is and where it's headed.
8. As a dispatcher, I want the detail modal to show battery level and fuel level as percentages with progress bars, so that I can spot vehicles that need attention.
9. As a dispatcher, I want progress bars for battery/fuel to visually signal severity (e.g. red when low), so that low levels catch my eye without reading the number.
10. As a dispatcher, I want the detail modal to show when the vehicle's data was last updated, so that I know how fresh the information is.
11. As a dispatcher, I want to close the detail modal easily (close button, backdrop), so that I can return to the table quickly.
12. As a dispatcher, I want the background to blur/dim behind the open modal, so that my attention is drawn to the modal content.
13. As a dispatcher, I want to filter the table by status (All / Idle / En Route / Delivered), so that I can focus on vehicles in a particular state.
14. As a dispatcher, I want each status filter chip to show a live count of vehicles in that status, so that I know the size of each group before I click it.
15. As a dispatcher, I want the filter chip counts to reflect the whole fleet regardless of which filter is currently active, so that switching filters never makes a count look wrong or disappear.
16. As a dispatcher, I want the currently active filter to be visually distinguished from the others, so that I always know which view I'm looking at.
17. As a dispatcher, I want a fleet statistics panel showing total fleet size, average speed, count of moving vehicles, and last update time, so that I get an at-a-glance read on overall fleet health.
18. As a dispatcher, I want "Moving" in the statistics panel to mean the same thing as "En Route" in the filter, so that the two panels never tell me conflicting stories about the same vehicles.
19. As a dispatcher, I want a "last update" freshness readout (e.g. "Updated 12s ago"), so that I know how current the dashboard is without doing math myself.
20. As a dispatcher, I want a live-connection indicator showing whether real-time updates are currently active, so that I can trust (or distrust) what I'm looking at.
21. As a dispatcher, I want the live-connection indicator to visibly change state when the connection drops or is reconnecting, so that I'm not misled into thinking data is live when it isn't.
22. As a dispatcher, I want vehicle positions/status/speed/battery/fuel to update on their own roughly every few minutes without me refreshing the page, so that the dashboard stays current passively.
23. As a dispatcher, I want a live update to a vehicle's data to never remove or add rows from my currently filtered table view, so that a background push never silently changes what I'm looking at.
24. As a dispatcher, I want the table body to scroll independently while the table's header and column headers stay fixed, so that I can scroll through a large fleet without losing context.
25. As a dispatcher, I want the table header to show a live count of currently visible vehicles (e.g. "Vehicles (25)") and a "Live" badge, so that I have the same live signal right next to the data it describes.
26. As a developer maintaining this repo, I want vehicle/statistics types to match the real API payload field-for-field, so that the rest of the app isn't built against a guessed shape.
27. As a developer, I want one shared derivation of fleet counts (`useFleetSummary`) consumed by both the filter chips and the statistics tiles, so the two can never drift apart by construction.
28. As a developer, I want the REST/WebSocket division of responsibility to be explicit (REST = snapshots, WS = deltas merged by id), so that future contributors don't accidentally make the socket a second source of truth for the vehicle list.
29. As a developer, I want the whole feature buildable as independent, parallel component tracks (Header, live indicator, filter+stats, table, modal, WS merge logic) against a locked context/hook interface, so multiple people or agents can work on it simultaneously and merge into one composition point.

## Implementation Decisions

- **Data model.** `Vehicle` is rewritten to match `/vehicles` and `/vehicles/:id` field-for-field: `id`, `vehicleNumber`, `driverName`, `driverPhone`, `status` (`VehicleStatus` = `'en_route' | 'idle' | 'delivered'`, confirmed exhaustive), `destination`, `currentLocation` (`{ lat, lng }`), `speed` (mph, confirmed unit), `lastUpdated` (ISO timestamp), `estimatedArrival` (ISO timestamp or `null`), `batteryLevel` (0–100), `fuelLevel` (0–100). `FleetStatistics` matches `/statistics` exactly: `total`, `idle`, `en_route`, `delivered`, `average_speed`, `timestamp`. A generic REST envelope type (`ApiSuccess<T>` / `ApiError` / `ApiResponse<T>`) wraps every endpoint's `{ success, data, ... }` shape; list endpoints add `total` (and `status` on the filtered endpoint) alongside `data`.
- **Endpoints.** `endpoints.vehicles.list`, `.detail(id)`, `.byStatus(status)`, and `endpoints.statistics.summary` replace the scaffold's earlier `fleets`/`auth`/location-based paths.
- **Services.** `vehicleService.list(limit?)`, `.getById(id)`, `.listByStatus(status)`, and a new `statisticsService.get()` all unwrap the REST envelope's `data` and surface `success: false` as an error rather than passing the envelope to components.
- **REST vs. WebSocket division of responsibility.** REST is the sole source of truth for full-state snapshots: initial fleet load, status-filtered fleet load, single-vehicle detail, and the statistics summary. The WebSocket is for incremental deltas only, layered on top of whatever REST last loaded; it never supplies the initial list. Confirmed (live probe): the socket sends `{ type: 'initial_data' | 'vehicle_update', data: Vehicle[], timestamp, message }`; `initial_data` fires once on connect and is ignored client-side (REST already owns the initial load); `vehicle_update` fires roughly every 3 minutes and always carries the whole fleet array (not a changed-only subset). Despite receiving the full fleet, the client always merges incoming vehicles into the existing `vehicles` array **by id**, never replaces the array wholesale — necessary because a status filter may already have `vehicles` scoped to a subset, and a wholesale replace would silently undo that filter. Rows are only shallow-replaced when their data actually changed, so unaffected rows keep stable object identity (avoids unnecessary re-renders). WS traffic never adds/removes rows or changes which vehicles are visible under the active filter — only a REST refetch (via changing `statusFilter`) does that.
- **State shape (`FleetContext`).** One React Context holds: `vehicles: Vehicle[]`, `statistics: FleetStatistics | null`, `statusFilter: VehicleStatus | 'all'` + setter (changing it triggers a REST refetch, not client-side filtering), `selectedVehicleId: string | null` + select/clear (drives the modal), and `loading`/`error` flags. Everything else (sort, hover, modal animation state) stays local component state, not context.
- **`useFleetSummary` hook.** Derives, from `FleetContext.vehicles` + `statistics`: `total`, `idle`, `enRoute`, `delivered`, `moving` (identical to `enRoute` — not a separate dimension), `averageSpeed` (seeded from `statistics.average_speed`, re-derivable client-side from `vehicles` if ever needed), and `lastUpdate` (max `lastUpdated` across vehicles). `GET /statistics` seeds this on first render; after that, WS-driven recomputation off `vehicles` is preferred over waiting on a fresh `/statistics` call, which is what keeps the filter chips and statistics tiles from ever disagreeing.
- **Component boundaries.** `Header` (static, no data dependency), `LiveStatusIndicator` (reads socket `ConnectionStatus`, needs a non-connected visual state beyond what any screenshot shows), `StatusFilter` + `FleetStatistics` (both consume `useFleetSummary`; built together since they must never drift apart), `StatCard` (one reusable prop-driven presentational card — icon, label, value, optional badge/progress bar — reused 9× in the modal), `VehicleTable` (fixed header row + column headers, independently scrolling body, row click selects a vehicle), `VehicleDetailModal` (fetches the freshest single-vehicle snapshot on open via `getById`; composed from `StatCard`s in a header + 2-column grid + one full-width card layout). `estimatedArrival` is not surfaced in the Phase 1 modal.
- **Composition.** A single `Dashboard` component (or `main.tsx`) wraps everything in the context provider and lays out `Header` above a two-column body (left rail ~20%, table ~80%), with the modal rendered alongside. No router is introduced — this remains the app's one route.
- **Build sequencing.** A short critical path (types → endpoints/services → `FleetContext`'s public shape → `useFleetSummary`'s return shape) locks the interfaces every other piece depends on. Once locked, `Header`, `LiveStatusIndicator`, `{StatCard, VehicleDetailModal}`, `{StatusFilter, FleetStatistics}`, `VehicleTable`, and the WS merge-by-id logic inside `FleetContext` are independent tracks that can be built in parallel (against mocked context/data) and merged into the single composition component.

## Testing Decisions

- Only external behavior is tested — what the user sees and can interact with (rendered rows, badges, chip counts, modal contents, live-status text) — not internal implementation details like state variable names or render counts.
- **Primary seam:** page-level integration tests render the composed dashboard component via React Testing Library, with `vehicleService` and `statisticsService` mocked at the module boundary (`jest.mock`, consistent with the project's existing `react-scripts test` / `@testing-library/react` setup — no new test infra) and `socketManager`'s message emission mocked/driven directly to simulate `initial_data` and `vehicle_update` pushes. This seam should cover: initial table render and columns, row click opening the modal with correct fields, status filter selection changing REST calls and visible rows, filter/statistics counts staying consistent across a simulated WS push, live indicator reflecting connection status changes, and battery/fuel progress bar severity coloring at representative thresholds.
- **Secondary seam:** the WS merge-by-id function and `useFleetSummary`'s derivation are tested directly as pure functions/hooks (e.g. via `renderHook`), independent of any DOM rendering — covering: merging into a filtered (subset) vehicle list without reintroducing removed vehicles, preserving object identity for unchanged rows, and count/moving/averageSpeed/lastUpdate derivation from a hand-built `vehicles` fixture.
- No new testing library or mocking framework is introduced; both seams reuse the CRA/Jest/RTL setup already present in the repo (`package.json`'s `test` script, `@testing-library/*` dependencies).

## Out of Scope

- Routing / multi-page navigation — the app is intentionally single-route for this phase (per `decisions.md`).
- Any authentication UI — token handling already exists in `src/api/client.ts`, but there is no login screen to build.
- Any state management library beyond React Context.
- Pagination beyond `?limit=` on `GET /vehicles` — the real contract for fleets too large for one page isn't confirmed yet.
- Surfacing `estimatedArrival` in the detail modal (present in the API payload, not shown in the Phase 1 design).
- Sorting, searching, or exporting the vehicle table.
- Any vehicle status beyond the three confirmed values (`en_route`, `idle`, `delivered`).

## Further Notes

- Source documents for this spec: `plan.md` (architecture, data flow, build sequencing) and `frontend-design.md` (component-level layout/styling reference, derived from two dashboard/modal screenshots).
- One open question remains outside this spec's scope to resolve: whether `GET /vehicles` supports pagination beyond `?limit=` for fleets larger than one page can reasonably render. Revisit once real fleet sizes are known; not a blocker for Phase 1 given the confirmed live-probe fleet size (~25 vehicles).
- `speed` unit (mph) and the exhaustive `VehicleStatus` enum were confirmed directly by the developer and are treated as settled facts throughout this spec, not open questions.
