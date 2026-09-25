# 04: Live WebSocket updates + connection indicator

**What to build:** Without refreshing the page, a dispatcher's fleet table, filter counts, and statistics panel update on their own roughly every few minutes as the backend pushes fleet data over the WebSocket — and a live-connection indicator in the left rail shows whether that real-time channel is currently active, reconnecting, or down. A live push never adds or removes rows from whatever filtered view the dispatcher currently has open; it only ever updates data for vehicles already visible.

**Blocked by:** 01

**Status:** done

- [x] The context subscribes to the socket and ignores `initial_data` messages (REST already owns the initial load)
- [x] `vehicle_update` messages are merged into the context's `vehicles` array **by id**, never by replacing the array wholesale
- [x] The merge never reintroduces a vehicle that isn't in the current (possibly status-filtered) `vehicles` array, and never removes one that is
- [x] Rows whose data is unchanged keep stable object identity after a merge (no unnecessary re-render); rows whose data changed are replaced with the updated values
- [x] `useFleetSummary`'s derived counts/averages update automatically as a result of a merge, with no extra `/statistics` REST call required
- [x] `LiveStatusIndicator` reflects the socket's connection state: a distinct visual/textual state for connected, reconnecting, and offline (only the connected state has a design reference; the other two need their own copy/icon in the same style)
- [x] The table header's "Live" badge and visible count reflect the same connection/data state as the left-rail indicator
- [x] Unit tests (no DOM rendering) cover the merge-by-id function directly: merging into a filtered subset without reintroducing removed vehicles, and preserving object identity for unchanged rows
- [x] Page-level integration test simulates a `vehicle_update` push (via a mocked `socketManager`) and confirms the table, filter chip counts, and statistics panel all reflect the update without a page refresh, and that an active status filter's visible rows are unaffected by vehicles outside that filter
