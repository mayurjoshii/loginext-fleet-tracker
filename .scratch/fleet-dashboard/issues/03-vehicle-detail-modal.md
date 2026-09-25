# 03: Vehicle detail modal

**What to build:** Clicking any row in the fleet table opens a modal showing that vehicle's full detail — driver name and phone, a color-coded status badge, current speed, destination, location as coordinates, battery and fuel level as percentages with severity-colored progress bars, and when the data was last updated — over a blurred/dimmed backdrop, closable via a close button or the backdrop.

**Blocked by:** 01

**Status:** done

- [x] `StatCard` is a single reusable, prop-driven presentational component (icon + label + value, optional badge or progress bar) with no context or data-fetching of its own
- [x] Clicking a table row selects that vehicle and opens `VehicleDetailModal`
- [x] On open, the modal fetches the freshest snapshot for the selected vehicle via `getById`
- [x] The modal shows, via `StatCard`s: status (colored badge, color varies by status), current speed, driver name, driver phone, destination, location (coordinates), battery level (% + progress bar, color reflects severity), fuel level (% + progress bar, color reflects severity), and last updated (full-width card)
- [x] `estimatedArrival` is not shown in this modal (out of scope for Phase 1)
- [x] The modal closes via its close button or by clicking the backdrop, and the page content behind it is blurred/dimmed while open
- [x] Page-level integration test confirms: clicking a row opens the modal with the correct vehicle's fields rendered, and closing it (button and backdrop) returns to the table; battery/fuel progress bars render the expected severity color at representative threshold values (e.g. low vs. high)
