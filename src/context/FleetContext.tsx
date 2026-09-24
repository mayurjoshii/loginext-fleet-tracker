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
import { deriveStatistics, mergeVehiclesById, parseFleetMessage } from './mergeVehicles';

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

  // Once a push has recomputed statistics, a late-arriving `/statistics`
  // response is stale and must not clobber it.
  const pushedRef = useRef(false);

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
        }
      } catch (err) {
        if (!cancelled) {
          setVehicles([]);
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
   * `initial_data` is ignored outright — REST owns the initial load — and
   * `vehicle_update` is merged by id so a push can never add or remove rows
   * from the dispatcher's current (possibly filtered) view.
   */
  useEffect(() => {
    const unsubscribeStatus = socketManager.onStatusChange(setConnectionStatus);
    const unsubscribeMessage = socketManager.onMessage((raw) => {
      const message = parseFleetMessage(raw);
      if (!message || message.type !== 'vehicle_update') {
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
