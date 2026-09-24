import { useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import type { FleetStatistics } from '../types/statistics';
import type { Vehicle } from '../types/vehicle';

export interface FleetSummary {
  total: number;
  idle: number;
  enRoute: number;
  delivered: number;
  /** "Moving" is the en-route count, not a separate dimension. */
  moving: number;
  /** Fleet-wide average speed in mph. */
  averageSpeed: number;
  /** ISO timestamp of the freshest data on screen, or `null` when empty. */
  lastUpdate: string | null;
}

function countBy(vehicles: Vehicle[], status: Vehicle['status']): number {
  return vehicles.filter((vehicle) => vehicle.status === status).length;
}

function latestUpdate(vehicles: Vehicle[]): string | null {
  return vehicles.reduce<string | null>(
    (latest, vehicle) =>
      latest === null || vehicle.lastUpdated > latest ? vehicle.lastUpdated : latest,
    null
  );
}

/**
 * Derives the fleet-wide counts shared by the status filter chips and the
 * statistics tiles, so the two can never drift apart.
 *
 * Counts describe the *whole* fleet, so they are seeded from `GET /statistics`
 * and only fall back to the in-memory `vehicles` array (which may be scoped to
 * a status filter) while statistics are still loading.
 */
export function deriveFleetSummary(
  vehicles: Vehicle[],
  statistics: FleetStatistics | null
): FleetSummary {
  const enRoute = statistics ? statistics.en_route : countBy(vehicles, 'en_route');
  const averageSpeed = statistics
    ? statistics.average_speed
    : vehicles.length === 0
      ? 0
      : vehicles.reduce((sum, vehicle) => sum + vehicle.speed, 0) / vehicles.length;

  return {
    total: statistics ? statistics.total : vehicles.length,
    idle: statistics ? statistics.idle : countBy(vehicles, 'idle'),
    enRoute,
    delivered: statistics ? statistics.delivered : countBy(vehicles, 'delivered'),
    moving: enRoute,
    averageSpeed,
    lastUpdate: latestUpdate(vehicles) ?? statistics?.timestamp ?? null,
  };
}

export function useFleetSummary(): FleetSummary {
  const { vehicles, statistics } = useFleet();
  return useMemo(() => deriveFleetSummary(vehicles, statistics), [vehicles, statistics]);
}
