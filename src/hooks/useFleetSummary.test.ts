import { deriveFleetSummary } from './useFleetSummary';
import type { Vehicle } from '../types/vehicle';
import type { FleetStatistics } from '../types/statistics';

function vehicle(overrides: Partial<Vehicle> & Pick<Vehicle, 'id'>): Vehicle {
  return {
    vehicleNumber: 'FL-000',
    driverName: 'Driver',
    driverPhone: '+10000000000',
    status: 'idle',
    destination: 'Depot',
    currentLocation: { lat: 0, lng: 0 },
    speed: 0,
    lastUpdated: '2026-09-24T09:00:00.000Z',
    estimatedArrival: null,
    batteryLevel: 50,
    fuelLevel: 50,
    ...overrides,
  };
}

const STATISTICS: FleetStatistics = {
  total: 25,
  idle: 12,
  en_route: 9,
  delivered: 4,
  average_speed: 16,
  timestamp: '2026-09-24T09:30:00.000Z',
};

describe('deriveFleetSummary', () => {
  it('reports fleet-wide counts from statistics even when vehicles are filtered to a subset', () => {
    const filtered = [vehicle({ id: 'a', status: 'en_route' })];

    const summary = deriveFleetSummary(filtered, STATISTICS);

    expect(summary).toMatchObject({
      total: 25,
      idle: 12,
      enRoute: 9,
      delivered: 4,
      moving: 9,
      averageSpeed: 16,
    });
  });

  it('keeps moving identical to enRoute', () => {
    const summary = deriveFleetSummary([], STATISTICS);
    expect(summary.moving).toBe(summary.enRoute);
  });

  it('falls back to deriving counts from vehicles before statistics arrive', () => {
    const vehicles = [
      vehicle({ id: 'a', status: 'en_route', speed: 60 }),
      vehicle({ id: 'b', status: 'idle', speed: 0 }),
      vehicle({ id: 'c', status: 'delivered', speed: 0 }),
    ];

    expect(deriveFleetSummary(vehicles, null)).toMatchObject({
      total: 3,
      idle: 1,
      enRoute: 1,
      delivered: 1,
      moving: 1,
      averageSpeed: 20,
    });
  });

  it('takes lastUpdate from the freshest vehicle, falling back to the statistics timestamp', () => {
    const vehicles = [
      vehicle({ id: 'a', lastUpdated: '2026-09-24T09:00:00.000Z' }),
      vehicle({ id: 'b', lastUpdated: '2026-09-24T09:45:00.000Z' }),
    ];

    expect(deriveFleetSummary(vehicles, STATISTICS).lastUpdate).toBe('2026-09-24T09:45:00.000Z');
    expect(deriveFleetSummary([], STATISTICS).lastUpdate).toBe(STATISTICS.timestamp);
    expect(deriveFleetSummary([], null).lastUpdate).toBeNull();
  });
});
