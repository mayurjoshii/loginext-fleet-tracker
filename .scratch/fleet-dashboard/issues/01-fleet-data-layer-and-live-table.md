# 01: Fleet data layer, layout shell, and live table

**What to build:** When a dispatcher opens the app, they see the page header and a table listing the whole live fleet, pulled from the real API — vehicle number, driver, status, speed, destination, ETA, last update, and location for every vehicle, with the table header/column headers fixed and the body scrolling independently. This is the foundational slice: it establishes the shared data layer (types, services, context, and the derived-summary hook) that every later ticket in this feature builds on, but ships on its own as a working, demoable read-only dashboard.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `Vehicle` type matches `/vehicles` and `/vehicles/:id` field-for-field (`id`, `vehicleNumber`, `driverName`, `driverPhone`, `status` restricted to `'en_route' | 'idle' | 'delivered'`, `destination`, `currentLocation: { lat, lng }`, `speed` in mph, `lastUpdated`, `estimatedArrival` (nullable), `batteryLevel`, `fuelLevel`)
- [ ] `FleetStatistics` type matches `/statistics` exactly (`total`, `idle`, `en_route`, `delivered`, `average_speed`, `timestamp`)
- [ ] A generic REST envelope type models `{ success, data, ... }` for every endpoint, with list endpoints additionally carrying `total` (and `status` on the filtered endpoint)
- [ ] Path builders exist for `GET /vehicles`, `GET /vehicles/:id`, `GET /vehicles/status/:status`, and `GET /statistics`
- [ ] Services for vehicles (`list`, `getById`, `listByStatus`) and statistics (`get`) unwrap the envelope's `data` and surface `success: false` as an error rather than passing the raw envelope to components
- [ ] One shared context holds: `vehicles`, `statistics`, `statusFilter` + setter (setter triggers a REST refetch via `list`/`listByStatus`, not client-side filtering), `selectedVehicleId` + select/clear, and `loading`/`error` flags
- [ ] A `useFleetSummary` hook derives `total`, `idle`, `enRoute`, `delivered`, `moving` (identical to `enRoute`), `averageSpeed`, and `lastUpdate` from the context's `vehicles`/`statistics`; on this ticket it's seeded from `GET /statistics` (no WebSocket-driven recomputation yet — that's ticket 04)
- [ ] A static `Header` renders the page title, subtitle, and divider
- [ ] The single-route page composes `Header` above a two-column body (left rail placeholder, ~80%-width table on the right) — no router introduced
- [ ] `VehicleTable` renders every column listed above for the full fleet, with a fixed header/column-header row and independently scrolling body
- [ ] Page-level integration test (RTL, with `vehicleService`/`statisticsService` mocked at the module boundary) confirms the table renders the mocked fleet's rows and columns correctly on initial load
