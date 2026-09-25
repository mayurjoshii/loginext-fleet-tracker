import type { FleetStatistics } from '../types/statistics';
import type { StatusFilter, Vehicle } from '../types/vehicle';

/** Shape of every frame the fleet WebSocket pushes. */
export interface FleetSocketMessage {
  type: 'initial_data' | 'vehicle_update';
  data: Vehicle[];
  timestamp: string;
  message?: string;
}

/** Narrows an unknown socket payload to a fleet frame we know how to handle. */
export function parseFleetMessage(raw: unknown): FleetSocketMessage | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const candidate = raw as Partial<FleetSocketMessage>;
  if (candidate.type !== 'initial_data' && candidate.type !== 'vehicle_update') {
    return null;
  }
  if (!Array.isArray(candidate.data)) {
    return null;
  }

  return candidate as FleetSocketMessage;
}

function isSameVehicle(a: Vehicle, b: Vehicle): boolean {
  return (
    a.vehicleNumber === b.vehicleNumber &&
    a.driverName === b.driverName &&
    a.driverPhone === b.driverPhone &&
    a.status === b.status &&
    a.destination === b.destination &&
    a.currentLocation.lat === b.currentLocation.lat &&
    a.currentLocation.lng === b.currentLocation.lng &&
    a.speed === b.speed &&
    a.lastUpdated === b.lastUpdated &&
    a.estimatedArrival === b.estimatedArrival &&
    a.batteryLevel === b.batteryLevel &&
    a.fuelLevel === b.fuelLevel
  );
}

/**
 * Layers a `vehicle_update` push onto the vehicles currently on screen.
 *
 * The push always carries the whole fleet, but `current` may already be scoped
 * to a status filter, so the merge is strictly by id over `current`: an
 * incoming vehicle that isn't already visible is dropped (never added), and a
 * visible vehicle missing from the push is kept (never removed). Only a REST
 * refetch changes which rows exist.
 *
 * Rows whose data is unchanged keep their original object identity, so a
 * `React.memo`'d row component doesn't re-render when the push only touched
 * other vehicles. If nothing changed at all, `current` itself is returned.
 */
export function mergeVehiclesById(current: Vehicle[], incoming: Vehicle[]): Vehicle[] {
  if (incoming.length === 0) {
    return current;
  }

  const updates = new Map(incoming.map((vehicle) => [vehicle.id, vehicle]));
  let changed = false;

  const merged = current.map((vehicle) => {
    const update = updates.get(vehicle.id);
    if (!update || isSameVehicle(vehicle, update)) {
      return vehicle;
    }
    changed = true;
    return update;
  });

  return changed ? merged : current;
}

/**
 * Narrows a retained whole-fleet snapshot to what the active filter would show.
 *
 * Client-side filtering is normally forbidden here — changing `statusFilter`
 * triggers a REST refetch, and REST is the only thing allowed to decide which
 * vehicles exist. This is the one exception: it runs only when that REST call
 * has already failed, where the choice is between filtering a socket snapshot
 * locally and showing the dispatcher nothing at all.
 */
export function selectSnapshotFor(fleet: Vehicle[], statusFilter: StatusFilter): Vehicle[] {
  if (statusFilter === 'all') {
    return fleet;
  }
  return fleet.filter((vehicle) => vehicle.status === statusFilter);
}

/**
 * Recomputes the fleet-wide statistics from a `vehicle_update` push. The push
 * carries the *whole* fleet, so this is exact — and it keeps the summary
 * current without a second `GET /statistics` round trip after every push.
 */
export function deriveStatistics(fleet: Vehicle[], timestamp: string): FleetStatistics {
  let idle = 0;
  let en_route = 0;
  let delivered = 0;
  let speedSum = 0;

  for (const vehicle of fleet) {
    if (vehicle.status === 'idle') {
      idle += 1;
    } else if (vehicle.status === 'en_route') {
      en_route += 1;
    } else if (vehicle.status === 'delivered') {
      delivered += 1;
    }
    speedSum += vehicle.speed;
  }

  return {
    total: fleet.length,
    idle,
    en_route,
    delivered,
    average_speed: fleet.length === 0 ? 0 : speedSum / fleet.length,
    timestamp,
  };
}
