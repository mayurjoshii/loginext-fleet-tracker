import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { vehicleService } from '../api/services/vehicleService';
import { statisticsService } from '../api/services/statisticsService';
import { socketManager, type ConnectionStatus } from '../sockets/SocketManager';
import type { FleetStatistics } from '../types/statistics';
import type { StatusFilter, Vehicle } from '../types/vehicle';
import {
  deriveStatistics,
  mergeVehiclesById,
  parseFleetMessage,
  selectSnapshotFor,
} from './mergeVehicles';

export interface FleetContextValue {
  vehicles: Vehicle[];
  statistics: FleetStatistics | null;
  statusFilter: StatusFilter;
  /** Changing the filter triggers a REST refetch — never client-side filtering. */
  setStatusFilter: (filter: StatusFilter) => void;
  selectedVehicleId: string | null;
  selectVehicle: (id: string) => void;
  clearSelectedVehicle: () => void;
  loading: boolean;
  error: string | null;
  /** Live state of the WebSocket feeding `vehicle_update` pushes. */
  connectionStatus: ConnectionStatus;
  /**
   * True while the rows on screen came from a retained socket snapshot because
   * REST couldn't be reached — i.e. the table is readable but unconfirmed.
   */
  usingFallbackSnapshot: boolean;
}

const FleetContext = createContext<FleetContextValue | undefined>(undefined);

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

export function FleetProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [statistics, setStatistics] = useState<FleetStatistics | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('closed');
  const [usingFallbackSnapshot, setUsingFallbackSnapshot] = useState(false);

  // Once a push has recomputed statistics, a late-arriving `/statistics`
  // response is stale and must not clobber it.
  const pushedRef = useRef(false);

  /**
   * The most recent whole-fleet snapshot the socket delivered.
   *
   * Both frame types carry the entire fleet, so either can fill this. It is
   * never rendered on the happy path — REST remains the only source of truth
   * for which vehicles exist — and exists purely so a failed REST call has
   * something better to fall back on than an empty table. A ref, not state:
   * retaining it must not itself cause a render.
   */
  const snapshotRef = useRef<{ vehicles: Vehicle[]; timestamp: string } | null>(null);

  // The fleet list is refetched from REST whenever the status filter changes.
  useEffect(() => {
    let cancelled = false;

    async function fetchVehicles() {
      setLoading(true);
      setError(null);

      try {
        const next =
          statusFilter === 'all'
            ? await vehicleService.list()
            : await vehicleService.listByStatus(statusFilter);
        if (!cancelled) {
          setVehicles(next);
          setUsingFallbackSnapshot(false);
        }
      } catch (err) {
        if (!cancelled) {
          // REST is unreachable. If the socket has handed us a whole-fleet
          // snapshot at any point, showing that (scoped to the active filter)
          // beats showing an empty table — flagged so the UI can say it's
          // unconfirmed rather than passing it off as a fresh REST load.
          const snapshot = snapshotRef.current;
          setVehicles(snapshot ? selectSnapshotFor(snapshot.vehicles, statusFilter) : []);
          setUsingFallbackSnapshot(snapshot !== null);
          setError(messageOf(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchVehicles();

    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  // Statistics seed the fleet summary on first render; after that the socket
  // keeps them current, so this runs exactly once.
  useEffect(() => {
    let cancelled = false;

    async function fetchStatistics() {
      try {
        const next = await statisticsService.get();
        if (!cancelled && !pushedRef.current) {
          setStatistics(next);
        }
      } catch (err) {
        if (!cancelled) {
          // Same fallback for the summary: a retained snapshot is the whole
          // fleet, so the counts derived from it are exact.
          const snapshot = snapshotRef.current;
          if (snapshot && !pushedRef.current) {
            setStatistics(deriveStatistics(snapshot.vehicles, snapshot.timestamp));
          }
          setError((current) => current ?? messageOf(err));
        }
      }
    }

    fetchStatistics();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * WebSocket deltas are layered on top of whatever REST last loaded.
   * `vehicle_update` is merged by id so a push can never add or remove rows
   * from the dispatcher's current (possibly filtered) view; `initial_data`
   * never reaches the screen at all, since REST owns the initial load.
   *
   * Every frame is retained as a whole-fleet snapshot regardless of type, but
   * only as a fallback for a REST call that fails outright — the socket is
   * still never a second source of truth for which vehicles exist.
   */
  useEffect(() => {
    const unsubscribeStatus = socketManager.onStatusChange(setConnectionStatus);
    const unsubscribeMessage = socketManager.onMessage((raw) => {
      const message = parseFleetMessage(raw);
      if (!message) {
        return;
      }

      // Both frame types carry the whole fleet, so both are worth retaining as
      // a fallback — retaining is not rendering.
      snapshotRef.current = { vehicles: message.data, timestamp: message.timestamp };

      // `initial_data` stops here: REST owns the initial load, and this frame
      // is only ever a safety net for when REST can't be reached at all.
      if (message.type !== 'vehicle_update') {
        return;
      }

      pushedRef.current = true;
      setVehicles((current) => mergeVehiclesById(current, message.data));
      // The push carries the whole fleet, so the fleet-wide counts and average
      // are exact here — no follow-up `/statistics` call needed.
      setStatistics(deriveStatistics(message.data, message.timestamp));
    });

    socketManager.connect();

    return () => {
      unsubscribeStatus();
      unsubscribeMessage();
      socketManager.disconnect();
    };
  }, []);

  const selectVehicle = useCallback((id: string) => setSelectedVehicleId(id), []);
  const clearSelectedVehicle = useCallback(() => setSelectedVehicleId(null), []);

  const value = useMemo<FleetContextValue>(
    () => ({
      vehicles,
      statistics,
      statusFilter,
      setStatusFilter,
      selectedVehicleId,
      selectVehicle,
      clearSelectedVehicle,
      loading,
      error,
      connectionStatus,
      usingFallbackSnapshot,
    }),
    [
      vehicles,
      statistics,
      statusFilter,
      selectedVehicleId,
      selectVehicle,
      clearSelectedVehicle,
      loading,
      error,
      connectionStatus,
      usingFallbackSnapshot,
    ]
  );

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}

export function useFleet(): FleetContextValue {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
}
