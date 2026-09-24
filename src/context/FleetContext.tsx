import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { vehicleService } from '../api/services/vehicleService';
import { statisticsService } from '../api/services/statisticsService';
import type { FleetStatistics } from '../types/statistics';
import type { StatusFilter, Vehicle } from '../types/vehicle';

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

  // The fleet list is refetched from REST whenever the status filter changes.
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    const request =
      statusFilter === 'all'
        ? vehicleService.list()
        : vehicleService.listByStatus(statusFilter);

    request
      .then((next) => {
        if (!cancelled) setVehicles(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setVehicles([]);
          setError(messageOf(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  // Statistics seed the fleet summary on first render.
  useEffect(() => {
    let cancelled = false;

    statisticsService
      .get()
      .then((next) => {
        if (!cancelled) setStatistics(next);
      })
      .catch((err) => {
        if (!cancelled) setError((current) => current ?? messageOf(err));
      });

    return () => {
      cancelled = true;
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
