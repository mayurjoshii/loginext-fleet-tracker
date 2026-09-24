# 02: Status filter + fleet statistics panel

**What to build:** In the left rail, a dispatcher can filter the fleet table by status (All / Idle / En Route / Delivered) via chips that each show a live count, with the active filter visually distinguished — and, alongside it, a fleet statistics panel showing total fleet size, average speed, count of moving vehicles, and last-update time, with a "Updated Xs ago" freshness readout. Both panels read from the same derived-summary hook, so their numbers can never disagree, and the chip counts always reflect the whole fleet regardless of which filter is currently active.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `StatusFilter` renders a chip per status (`All`/`Idle`/`En Route`/`Delivered`) with a status-colored dot, label, and count sourced from `useFleetSummary` — counts never change when a different chip is selected
- [ ] Selecting a chip updates `statusFilter` in context, triggering the appropriate REST refetch (`list` for "All", `listByStatus` otherwise) and updating the visible table rows
- [ ] The currently active chip is visually distinguished from the others
- [ ] `FleetStatistics` renders total fleet size, average speed, moving count (equal to the `en_route` count), and last-update time, all from `useFleetSummary`
- [ ] A freshness line ("Updated Xs ago") ticks locally off a timer anchored to the last time `useFleetSummary`'s output changed — not a value read from an API response
- [ ] Page-level integration test confirms: selecting a filter chip changes the visible table rows and triggers the expected service call; chip counts and statistics-panel numbers match each other and stay stable across filter changes
